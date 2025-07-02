import re
import json
from pymongo import MongoClient
import dotenv
import os
import sys
import requests
from groq import Groq
import datetime
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
import hashlib
from collections import Counter

# Load environment variables from .env file
dotenv.load_dotenv()

DEFAULT_DATA = {
    "summary": "Not Available",
    "nirf_ranking": "Not Ranked",
    "fees": "Not Available",
    "average_package": "Not Available",
    "highest_package": "Not Available",
    "type": "Not Available",
    "affiliation": "Not Available",
    "website": "Not Available"
}

mongo_uri = os.getenv("MONGODB_URI")
MONGO_CLIENT = MongoClient(mongo_uri, maxPoolSize=50, minPoolSize=5)
CACHE_DB = MONGO_CLIENT["college_cache"]
MAIN_CACHE_COLLECTION = CACHE_DB["api_data_cache"]
GROK_CACHE_COLLECTION = CACHE_DB["grok_api_cache"]
CET_DB = MONGO_CLIENT["cet"]
NIRF_DB = MONGO_CLIENT["nirf_2024"]
API_MGMT_DB = MONGO_CLIENT["api_management"]
API_STATE_COLLECTION = API_MGMT_DB["api_key_state"]
WEIGHTED_DB = MONGO_CLIENT["weighted_averages"]

class APIKeyManager:
    def __init__(self):
        self.perplexity_keys = self._load_perplexity_keys()
        self.exhausted_keys = set()
        self.current_key_index = 0
        self._load_state_from_db()
        
    def _load_perplexity_keys(self) -> List[str]:
        keys = []
        i = 1
        while True:
            key = os.getenv(f"PERPLEXITY_API_KEY_{i}")
            if key:
                keys.append(key)
                i += 1
            else:
                break
        print(f"Loaded {len(keys)} Perplexity API keys")
        return keys
    
    def _get_key_identifier(self, key: str) -> str:
        """Get last 4 characters of API key for identification"""
        return key[-4:] if len(key) >= 4 else key

    def _get_key_hash(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()[:16]
    
    def _load_state_from_db(self):
        try:
            state_doc = API_STATE_COLLECTION.find_one({"_id": "perplexity_state"})
            if state_doc:
                exhausted_identifiers = set(state_doc.get('exhausted_keys', []))
                self.exhausted_keys = {
                    key for key in self.perplexity_keys 
                    if self._get_key_identifier(key) in exhausted_identifiers
                }
                self.current_key_index = state_doc.get('current_key_index', 0)
                print(f"Loaded state: {len(self.exhausted_keys)} exhausted keys, index: {self.current_key_index}")
            else:
                print("No previous state found, starting fresh")
        except Exception as e:
            print(f"Failed to load state from DB: {e}")
            
    def _save_state_to_db(self):
        try:
            exhausted_identifiers = [self._get_key_identifier(key) for key in self.exhausted_keys]
            state_doc = {
                "_id": "perplexity_state",
                "exhausted_keys": exhausted_identifiers,
                "current_key_index": self.current_key_index,
                "last_updated": datetime.datetime.now(datetime.timezone.utc)
            }
            API_STATE_COLLECTION.replace_one(
                {"_id": "perplexity_state"}, 
                state_doc, 
                upsert=True
            )
        except Exception as e:
            print(f"Failed to save state to DB: {e}")
    
    def get_current_key(self) -> Optional[str]:
        """Get current valid key without permanently changing index during selection"""
        if not self.perplexity_keys or len(self.exhausted_keys) >= len(self.perplexity_keys):
            return None
            
        attempts = 0
        start_index = self.current_key_index
        
        while attempts < len(self.perplexity_keys):
            test_index = (start_index + attempts) % len(self.perplexity_keys)
            test_key = self.perplexity_keys[test_index]
            
            if test_key not in self.exhausted_keys:
                # Update the current index only when we find a valid key AND it's different
                if test_index != self.current_key_index:
                    self.current_key_index = test_index
                    self._save_state_to_db()
                    print(f"Switched to key index: {self.current_key_index + 1}")
                return test_key
                
            attempts += 1
        
        return None
    
    def get_current_key_number(self) -> int:
        """Return the current key number (1-based)"""
        return self.current_key_index + 1
    
    def _switch_to_next_key(self):
        """Only call this when you want to move to the next key after a failure"""
        old_index = self.current_key_index
        self.current_key_index = (self.current_key_index + 1) % len(self.perplexity_keys)
        self._save_state_to_db()
        print(f"Manually switched from key #{old_index + 1} to key #{self.current_key_index + 1}")
    
    def mark_key_exhausted(self, key: str):
        self.exhausted_keys.add(key)
        self._save_state_to_db()
        print(f"API key exhausted: ***{self._get_key_identifier(key)}")
        
    def should_use_grok(self) -> bool:
        return len(self.exhausted_keys) >= len(self.perplexity_keys)

# Initialize after your existing database setup
api_manager = APIKeyManager()

# Load ALL NIRF data from MongoDB once at startup
def load_nirf_data_from_mongodb():
    """Fetch all NIRF rankings from MongoDB and store in memory"""
    try:
        collection = NIRF_DB["college_rankings"]  # Adjust collection name as needed
        
        # Fetch ALL documents at once - this is fast for small datasets
        all_nirf_docs = list(collection.find({}, {"college_code": 1, "nirf": 1, "_id": 0}))
        
        # Convert to dictionary for O(1) lookups: {college_code: nirf_ranking}
        nirf_dict = {}
        for doc in all_nirf_docs:
            college_code = doc.get("college_code")
            nirf = doc.get("nirf", "Not Ranked")
            if college_code:
                nirf_dict[college_code] = nirf
        
        print(f"NIRF data loaded successfully: {len(nirf_dict)} colleges")
        return nirf_dict
        
    except Exception as e:
        print(f"Failed to load NIRF data from MongoDB: {e}")
        return {}

# Load NIRF data once at startup
NIRF_DATA = load_nirf_data_from_mongodb()

# Initialize indexes
def initialize_indexes():
    """Call this once when the application starts"""
    five_months_seconds = 5 * 30 * 24 * 60 * 60
    try:
        MAIN_CACHE_COLLECTION.create_index("created_at", expireAfterSeconds=five_months_seconds)
        GROK_CACHE_COLLECTION.create_index("created_at", expireAfterSeconds=five_months_seconds)
        print("Indexes initialized successfully")
    except Exception as e:
        print(f"Index creation failed (may already exist): {e}")

initialize_indexes()

def has_incomplete_data(api_data, max_missing_fields=3):
    """
    Check if the number of 'Not Available' fields exceeds the threshold.
    Returns True if data should be discarded from caching.
    
    Args:
        api_data: Dictionary containing API response data
        max_missing_fields: Maximum allowed 'Not Available' fields before discarding
    """
    not_available_count = 0
    
    for key, value in api_data.items():
        # Skip NIRF ranking as 'Not Ranked' is acceptable and handled separately
        if key == "nirf_ranking":
            continue
            
        if isinstance(value, str) and "not available" in value.lower():
            not_available_count += 1
    
    # Log the missing data count for monitoring
    if not_available_count > 0:
        print(f"Missing data count: {not_available_count} fields")
    
    # Return True if too many fields are missing (should not cache)
    return not_available_count > max_missing_fields

def process_colleges_parallel(selected_colleges, model, summary_length):
    """Process college API calls in parallel"""
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for c in selected_colleges:
            future = executor.submit(
                get_college_info_with_separate_cache,
                college_name=c["college_name"],
                code=c["college_code"],
                branch=c["branch_name"],
                model=model,
                summary_length=summary_length
            )
            futures.append((c, future))
        
        results = []
        for c, future in futures:
            try:
                info = future.result(timeout=30)  # 30 second timeout per college
                results.append({
                    "code": c["college_code"],
                    "college": c["college_name"],
                    "branch": c["branch_name"],
                    "admission_category": c["admission_category"],
                    "cutoffs_by_year": c["cutoffs"],
                    "latest_cutoff": c["cutoffs"][0]["cutoff"],
                    "weighted_avg_cutoff": c["weighted_avg"],
                    "location": c["location"],
                    **info
                })
            except Exception as e:
                print(f"Failed to process {c['college_name']}: {e}")
                # Add with default data
                default_info = DEFAULT_DATA.copy()
                results.append({
                    "code": c["college_code"],
                    "college": c["college_name"],
                    "branch": c["branch_name"],
                    "admission_category": c["admission_category"],
                    "cutoffs_by_year": c["cutoffs"],
                    "latest_cutoff": c["cutoffs"][0]["cutoff"],
                    "weighted_avg_cutoff": c["weighted_avg"],
                    "location": c["location"],
                    **default_info
                })
        return results

def get_college_info_with_separate_cache(college_name, code=None, branch=None, model="perplexity", summary_length=5):
    """
    Tiered caching system with proper fallback handling:
    - Grok: Check main cache -> Check grok cache -> API call -> Store in grok cache
    - Perplexity: Check main cache -> API call (with Grok fallback) -> Store based on actual model used
    """
    # Cache collections
    main_cache_collection = MAIN_CACHE_COLLECTION
    grok_cache_collection = GROK_CACHE_COLLECTION
    
    # Create cache key
    cache_key = f"{college_name}_{code}_{branch}_{summary_length}".lower().replace(" ", "_")
    
    # Check main cache first for both models
    cached_main_data = main_cache_collection.find_one({"cache_key": cache_key})
    if cached_main_data:
        print(f"Main cache HIT for {college_name}")
        api_data = {k: v for k, v in cached_main_data.items()
                   if k not in ["_id", "cache_key", "created_at", "college_name", "college_code", "branch"]}
        return api_data
    
    print(f"Main cache MISS for {college_name}")
    
    # Model-specific caching logic
    if model.lower() == "grok":
        # Check Grok cache
        cached_grok_data = grok_cache_collection.find_one({"cache_key": cache_key})
        if cached_grok_data:
            print(f"Grok cache HIT for {college_name}")
            api_data = {k: v for k, v in cached_grok_data.items()
                       if k not in ["_id", "cache_key", "created_at", "college_name", "college_code", "branch"]}
            return api_data
        
        print(f"Grok cache MISS for {college_name} - Fetching from Grok API")
        
        # Fetch from API (no fallback needed for direct Grok calls)
        api_data = get_college_info(college_name, code, branch, model, summary_length)
        
        # Store in Grok cache (always cache Grok responses)
        cache_document = api_data.copy()
        cache_document.update({
            "cache_key": cache_key,
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "college_name": college_name,
            "college_code": code,
            "branch": branch
        })
        
        try:
            grok_cache_collection.insert_one(cache_document)
            print(f"Stored in Grok cache for {college_name}")
        except Exception as e:
            print(f"Grok cache storage failed: {e}")
        
        return api_data
    
    else:  # Perplexity model with fallback
        print(f"Fetching from Perplexity API (with Grok fallback) for {college_name}")
        
        # Use fallback function that returns actual model used
        api_data, actual_model_used = get_college_info_with_fallback(college_name, code, branch, model, summary_length)
        
        # Check if data is incomplete before caching
        if has_incomplete_data(api_data):
            print(f"Incomplete data for {college_name} - NOT caching")
            return api_data
        
        # Cache based on actual model used
        cache_document = api_data.copy()
        cache_document.update({
            "cache_key": cache_key,
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "college_name": college_name,
            "college_code": code,
            "branch": branch
        })
        
        if actual_model_used == "grok":
            # Fallback was used - store in Grok cache ONLY
            try:
                grok_cache_collection.insert_one(cache_document)
                print(f"Stored in Grok cache (fallback used) for {college_name}")
            except Exception as e:
                print(f"Grok cache storage failed: {e}")
        else:
            # Perplexity succeeded - store in main cache
            try:
                main_cache_collection.insert_one(cache_document)
                print(f"Stored in main cache (Perplexity) for {college_name}")
            except Exception as e:
                print(f"Main cache storage failed: {e}")
        
        return api_data

def fetch_with_grok(prompt: str) -> str:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    chat = client.chat.completions.create(
        model="llama3-70b-8192", 
        messages=[{"role": "user", "content": prompt}],
        stream=False,
    )
    return chat.choices[0].message.content

def fetch_with_perplexity(prompt: str) -> str:
    """Fetch response using Perplexity Pro API with automatic key rotation"""
    
    max_retries = len(api_manager.perplexity_keys) if api_manager.perplexity_keys else 1
    
    for attempt in range(max_retries):
        current_key = api_manager.get_current_key()
        
        if not current_key:
            print("All Perplexity API keys exhausted")
            raise Exception("All Perplexity keys exhausted")
            
        # Print which key number is being used
        key_number = api_manager.get_current_key_number()
        print(f"Using Perplexity API Key #{key_number}")
        
        url = "https://api.perplexity.ai/chat/completions"
        headers = {
            "Authorization": f"Bearer {current_key}",  # Now uses current_key instead of env variable
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "sonar-pro",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful assistant that provides accurate information about Indian colleges and educational institutions. Always respond with valid JSON when requested."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1000,
            "stream": False
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 401:
                api_manager.mark_key_exhausted(current_key)
                api_manager._switch_to_next_key()
                print(f"API key #{key_number} exhausted, trying next key")
                continue
                
            elif response.status_code == 429:
                api_manager._switch_to_next_key()
                print(f"API key #{key_number} rate limited, trying next key")
                continue
                
            response.raise_for_status()
            print(f"Successfully used API Key #{key_number}")
            return response.json()["choices"][0]["message"]["content"]
            
        except Exception as e:
            error_msg = str(e).lower()
            
            if "unauthorized" in error_msg or "invalid api key" in error_msg:
                api_manager.mark_key_exhausted(current_key)
            
            api_manager._switch_to_next_key()
            print(f"Perplexity API error with key #{key_number}: {e}, trying next key")
            continue
    
    raise Exception("All Perplexity API keys failed")

def get_college_info_with_fallback(college_name, code=None, branch=None, model="perplexity", summary_length=5, field="engineering"):
    """
    Handle API calls with fallback mechanism from Perplexity to Grok.
    Returns tuple: (data, actual_model_used)
    """
    # Get NIRF ranking from database if college_code is available
    nirf_ranking = "Not Ranked"
    if code:
        nirf_ranking = get_nirf_ranking_from_db(code)
    
    parts = [college_name]
    if code:
        parts.append(f"code {code}")
    if branch:
        parts.append(f"{branch} branch")
    parts += ["fees in lakhs", "placements with LPA", "affiliation", "website"]

    context_query = " ".join(parts)

    prompt = (
        f"Extract info about {college_name} field: {field}. Output _only_ a valid JSON object with keys:\n"
        "summary, fees, average_package, highest_package, type, affiliation, website.\n"
        "Follow these strict rules:\n"
        "1) Respond with a single JSON object and nothing else.\n"
        "2) Use only digits and words. No symbols like ₹, $, %, etc.\n"
        "3) Use \"Not Available\" (in quotes) for missing fields.\n"
        "4) `fees` must be written in Lakhs (e.g., \"5 Lakhs\").\n"
        "5) `average_package` and `highest_package` must be in LPA (e.g., \"12.5 LPA\").\n"
        f"6) `summary` must be exactly {summary_length} sentences covering:\n"
        " - College type and location\n"
        " - Academics or notable departments\n"
        " - Industry exposure, placements, or reputation\n"
        " - Campus or student life if relevant\n\n"
        f"Context query: {context_query}"
    )

    actual_model_used = model
    
    try:
        if model == "perplexity":
            print(f"Attempting Perplexity API for {college_name}")
            resp = fetch_with_perplexity(prompt)
        else:
            print(f"Using Grok API for {college_name}")
            resp = fetch_with_grok(prompt)
            
    except Exception as e:
        print(f"Primary API call failed for {college_name}: {e}")
        
        # Fallback logic: if Perplexity fails, try Grok
        if model == "perplexity":
            try:
                print(f"FALLBACK: Switching to Grok API for {college_name}")
                resp = fetch_with_grok(prompt)
                actual_model_used = "grok"  # Track that we used Grok as fallback
            except Exception as fallback_error:
                print(f"Fallback API call also failed for {college_name}: {fallback_error}")
                default_with_nirf = DEFAULT_DATA.copy()
                default_with_nirf["nirf_ranking"] = nirf_ranking
                return default_with_nirf, actual_model_used
        else:
            # If Grok was the primary choice and it failed, return default
            default_with_nirf = DEFAULT_DATA.copy()
            default_with_nirf["nirf_ranking"] = nirf_ranking
            return default_with_nirf, actual_model_used

    # Parse JSON response
    json_match = re.search(r'``````', resp, re.DOTALL) or re.search(r'({.*})', resp, re.DOTALL)

    if not json_match:
        default_with_nirf = DEFAULT_DATA.copy()
        default_with_nirf["nirf_ranking"] = nirf_ranking
        return default_with_nirf, actual_model_used

    try:
        data = json.loads(json_match.group(1))
        valid_data = DEFAULT_DATA.copy()
        
        for key in DEFAULT_DATA:
            if key == "nirf_ranking":
                # Use database NIRF ranking instead of API
                valid_data[key] = nirf_ranking
                continue
                
            value = data.get(key, DEFAULT_DATA[key])
            if value and value not in ["", "Not Available"]:
                # Validate units
                if key == "fees" and "lakh" not in value.lower():
                    value += " Lakhs"
                elif key in ["average_package", "highest_package"] and "lpa" not in value.lower():
                    value += " LPA"
                
                valid_data[key] = value

        # Convert NIRF ranking to int if it's a number
        if isinstance(valid_data["nirf_ranking"], str) and valid_data["nirf_ranking"].isdigit():
            valid_data["nirf_ranking"] = int(valid_data["nirf_ranking"])

        # Log successful API usage
        if actual_model_used != model:
            print(f"SUCCESS: Used {actual_model_used} as fallback for {college_name}")
        else:
            print(f"SUCCESS: Used {actual_model_used} for {college_name}")

        return valid_data, actual_model_used

    except json.JSONDecodeError:
        default_with_nirf = DEFAULT_DATA.copy()
        default_with_nirf["nirf_ranking"] = nirf_ranking
        return default_with_nirf, actual_model_used

def get_nirf_ranking_from_db(college_code):
    """Fetch NIRF ranking from in-memory data - O(1) lookup"""
    try:
        # Direct dictionary lookup - extremely fast
        nirf_value = NIRF_DATA.get(college_code, "Not Ranked")
        
        # Convert to int if it's a valid number
        if isinstance(nirf_value, str) and nirf_value.replace('.', '').isdigit():
            return int(float(nirf_value))
        elif isinstance(nirf_value, (int, float)):
            return int(nirf_value)
        else:
            return nirf_value if nirf_value else "Not Ranked"
            
    except Exception as e:
        print(f"NIRF memory lookup failed: {e}")
        return "Not Ranked"

    
def get_college_info(college_name, code=None, branch=None, model="perplexity", summary_length=5, field="engineering"):
    # Get NIRF ranking from database if college_code is available
    nirf_ranking = "Not Ranked"
    if code:
        nirf_ranking = get_nirf_ranking_from_db(code)
    
    parts = [college_name]
    if code:
        parts.append(f"code {code}")
    if branch:
        parts.append(f"{branch} branch")
    parts += ["fees in lakhs", "placements with LPA", "affiliation", "website"]

    context_query = " ".join(parts)

    prompt = (
        f"Extract info about {college_name} field: {field}. Output _only_ a valid JSON object with keys:\n"
        "summary, fees, average_package, highest_package, type, affiliation, website.\n"
        "Follow these strict rules:\n"
        "1) Respond with a single JSON object and nothing else.\n"
        "2) Use only digits and words. No symbols like ₹, $, %, etc.\n"
        "3) Use \"Not Available\" (in quotes) for missing fields.\n"
        "4) `fees` must be written in Lakhs (e.g., \"5 Lakhs\").\n"
        "5) `average_package` and `highest_package` must be in LPA (e.g., \"12.5 LPA\").\n"
        f"6) `summary` must be exactly {summary_length} sentences covering:\n"
        " - College type and location\n"
        " - Academics or notable departments\n"
        " - Industry exposure, placements, or reputation\n"
        " - Campus or student life if relevant\n\n"
        f"Context query: {context_query}"
    )

    try:
        resp = fetch_with_perplexity(prompt) if model == "perplexity" else fetch_with_grok(prompt)
    except Exception as e:
        print(f"API call failed: {e}")
        default_with_nirf = DEFAULT_DATA.copy()
        default_with_nirf["nirf_ranking"] = nirf_ranking
        return default_with_nirf

    json_match = re.search(r'``````', resp, re.DOTALL) or re.search(r'({.*})', resp, re.DOTALL)

    if not json_match:
        default_with_nirf = DEFAULT_DATA.copy()
        default_with_nirf["nirf_ranking"] = nirf_ranking
        return default_with_nirf

    try:
        data = json.loads(json_match.group(1))
        valid_data = DEFAULT_DATA.copy()
        
        for key in DEFAULT_DATA:
            if key == "nirf_ranking":
                # Use database NIRF ranking instead of API
                valid_data[key] = nirf_ranking
                continue
                
            value = data.get(key, DEFAULT_DATA[key])
            if value and value not in ["", "Not Available"]:
                # Validate units
                if key == "fees" and "lakh" not in value.lower():
                    value += " Lakhs"
                elif key in ["average_package", "highest_package"] and "lpa" not in value.lower():
                    value += " LPA"
                
                valid_data[key] = value

        # Convert NIRF ranking to int if it's a number
        if isinstance(valid_data["nirf_ranking"], str) and valid_data["nirf_ranking"].isdigit():
            valid_data["nirf_ranking"] = int(valid_data["nirf_ranking"])

        return valid_data

    except json.JSONDecodeError:
        default_with_nirf = DEFAULT_DATA.copy()
        default_with_nirf["nirf_ranking"] = nirf_ranking
        return default_with_nirf

def get_nearest_colleges(
    rank,
    categories="GM",
    preferred_location=None,
    branches=None,
    num_colleges=15,
    model="perplexity",
    summary_length=5,
    safety_margin=1000,
    target_distribution=(0.4, 0.4, 0.2)
):
    """
    Optimized version with multi-category support and college-specific category selection.
    For each college-branch combination, selects the most relevant category (best admission prospects).
    """
    
    # Handle both single category and multiple categories input
    if isinstance(categories, str):
        if ',' in categories:
            categories = [cat.strip().upper() for cat in categories.split(',')]
        else:
            categories = [categories.strip().upper()]
    else:
        categories = [cat.strip().upper() for cat in categories]
    
    print(f"Input categories: {categories}")
    
    # Check which categories exist in the database
    available_categories = WEIGHTED_DB.list_collection_names()
    valid_categories = [cat for cat in categories if cat in available_categories]
    
    if not valid_categories:
        print(f"None of the requested categories {categories} found in weighted averages DB")
        return json.dumps({"recommendations": []}, indent=2)
    
    print(f"Valid categories found: {valid_categories}")
    
    # Build query filters (same as original)
    query_filters = {}
    
    if preferred_location:
        location_list = [loc.strip() for loc in preferred_location.split(',')]
        location_patterns = [re.compile(f'^{loc}$', re.IGNORECASE) for loc in location_list]
        query_filters["location"] = {"$in": location_patterns}
    
    if branches:
        branch_list = [b.strip() for b in branches.split(',')]
        branch_patterns = [re.compile(f'^{branch}$', re.IGNORECASE) for branch in branch_list]
        query_filters["branch_code"] = {"$in": branch_patterns}
    
    # Step 1: Query ALL category databases and collect colleges
    all_colleges_by_category = {}
    
    for category in valid_categories:
        collection = WEIGHTED_DB[category]
        
        # Get all colleges for this category with filters applied
        colleges = list(collection.find(query_filters))
        all_colleges_by_category[category] = colleges
        print(f"Found {len(colleges)} colleges in {category} category")
    
    # Step 2: Find best category for each college-branch combination
    college_best_options = {}
    
    for category, colleges in all_colleges_by_category.items():
        for college in colleges:
            key = (college["college_code"], college["branch_code"])
            
            if key not in college_best_options:
                # First time seeing this college-branch combination
                college_best_options[key] = {
                    "college_code": college["college_code"],
                    "college_name": college["college_name"], 
                    "branch_code": college["branch_code"],
                    "branch_name": college["branch_name"],
                    "location": college["location"],
                    "cutoff_history": college["cutoff_history"],
                    "latest_cutoff": college["latest_cutoff"],
                    "best_category": category,
                    "best_weighted_avg": college["weighted_avg_cutoff"],
                    "distance_from_rank": abs(college["weighted_avg_cutoff"] - rank)
                }
            else:
                # Compare with existing best option for this college-branch
                current_best = college_best_options[key]
                current_cutoff = college["weighted_avg_cutoff"]
                current_distance = abs(current_cutoff - rank)
                
                # Determine if this category is better
                is_better = False
                
                # Priority 1: Can the user get admission? (rank <= cutoff)
                user_can_get_current = rank <= current_cutoff
                user_can_get_best = rank <= current_best["best_weighted_avg"]
                
                if user_can_get_current and not user_can_get_best:
                    # Current gives admission, previous doesn't
                    is_better = True
                elif user_can_get_current and user_can_get_best:
                    # Both give admission - pick the easier one (higher cutoff)
                    if current_cutoff > current_best["best_weighted_avg"]:
                        is_better = True
                elif not user_can_get_current and not user_can_get_best:
                    # Neither gives admission - pick closer one
                    if current_distance < current_best["distance_from_rank"]:
                        is_better = True
                
                if is_better:
                    college_best_options[key].update({
                        "best_category": category,
                        "best_weighted_avg": current_cutoff,
                        "distance_from_rank": current_distance,
                        "cutoff_history": college["cutoff_history"],
                        "latest_cutoff": college["latest_cutoff"]
                    })
    
    print(f"After category optimization: {len(college_best_options)} unique college-branch combinations")
    
    # Step 3: Categorize into SAFE/TARGET/REACH using best cutoffs
    buffer = 1000  # Penalty buffer for reach colleges
    
    safe_colleges = []
    target_colleges = []
    reach_colleges = []
    
    for college_data in college_best_options.values():
        cutoff = college_data["best_weighted_avg"]
        
        college_info = {
            "college_code": college_data["college_code"],
            "college_name": college_data["college_name"],
            "branch_name": college_data["branch_name"], 
            "location": college_data["location"],
            "cutoffs": college_data["cutoff_history"],
            "weighted_avg": cutoff,
            "latest_cutoff": college_data["latest_cutoff"],
            "selected_category": college_data["best_category"],  # Track which category was used
            "distance": college_data["distance_from_rank"]
        }
        
        # Categorize based on admission probability
        if rank <= cutoff - safety_margin:
            college_info["admission_category"] = "SAFE"
            safe_colleges.append(college_info)
        elif rank <= cutoff + buffer:
            college_info["admission_category"] = "TARGET"
            target_colleges.append(college_info)
        else:
            college_info["admission_category"] = "REACH"
            # Apply buffer penalty for reach colleges
            college_info["distance"] += buffer
            reach_colleges.append(college_info)
    
    # Sort each category by distance (best options first)
    safe_colleges.sort(key=lambda x: x["distance"])
    target_colleges.sort(key=lambda x: x["distance"])
    reach_colleges.sort(key=lambda x: x["distance"])
    
    print(f"Categorized: {len(safe_colleges)} SAFE, {len(target_colleges)} TARGET, {len(reach_colleges)} REACH")
    
    # Step 4: Apply distribution logic (same as original)
    safe_pct, target_pct, reach_pct = target_distribution
    target_safe_count = int(num_colleges * safe_pct)      # Goal: 40%
    target_target_count = int(num_colleges * target_pct)  # Goal: 40% 
    target_reach_count = num_colleges - target_safe_count - target_target_count  # Goal: 20%
    
    print(f"Target distribution: {target_safe_count} SAFE, {target_target_count} TARGET, {target_reach_count} REACH")
    
    selected_colleges = []
    
    # Phase 1: Fill target quotas from preferred categories
    selected_safe = safe_colleges[:target_safe_count]
    selected_target = target_colleges[:target_target_count] 
    selected_reach = reach_colleges[:target_reach_count]
    
    selected_colleges.extend(selected_safe)
    selected_colleges.extend(selected_target)
    selected_colleges.extend(selected_reach)
    
    current_count = len(selected_colleges)
    remaining_slots = num_colleges - current_count
    
    print(f"After quota filling: {len(selected_safe)} SAFE, {len(selected_target)} TARGET, {len(selected_reach)} REACH")
    print(f"Remaining slots to fill: {remaining_slots}")
    
    # Phase 2: Fill remaining slots from ANY available category (maintaining quality)
    if remaining_slots > 0:
        # Collect remaining colleges from all categories
        remaining_safe = safe_colleges[len(selected_safe):]
        remaining_target = target_colleges[len(selected_target):]
        remaining_reach = reach_colleges[len(selected_reach):]
        
        # Combine all remaining colleges
        all_remaining = remaining_safe + remaining_target + remaining_reach
        
        # Sort by distance (best matches first) and take remaining slots
        all_remaining.sort(key=lambda x: x["distance"])
        additional_colleges = all_remaining[:remaining_slots]
        
        selected_colleges.extend(additional_colleges)
        print(f"Filled {len(additional_colleges)} additional slots from best available options")
    
    # Step 5: Process and format results (maintain original format)
    processed_colleges = []
    
    for college in selected_colleges:
        # Remove distance field and format for API processing
        college_data = {
            "college_code": college["college_code"],
            "college_name": college["college_name"],
            "branch_name": college["branch_name"],
            "location": college["location"],
            "cutoffs": college["cutoffs"],
            "weighted_avg": college["weighted_avg"],
            "latest_cutoff": college["latest_cutoff"],
            "admission_category": college["admission_category"],
            "selected_category": college["selected_category"]  # Track which category was used
        }
        processed_colleges.append(college_data)
    
    # Sort final results by weighted average for presentation
    processed_colleges.sort(key=lambda x: x["weighted_avg"])
    
    # Step 6: Enrich with API data (same as original)
    results = process_colleges_parallel(processed_colleges, model, summary_length)
    
    # Add selected_category to final results
    for i, result in enumerate(results):
        if i < len(processed_colleges):
            result["selected_category"] = processed_colleges[i]["selected_category"]
    
    # Generate distribution summary (same format as original)
    distribution_summary = {
        "safe_count": len([r for r in results if r["admission_category"] == "SAFE"]),
        "target_count": len([r for r in results if r["admission_category"] == "TARGET"]),
        "reach_count": len([r for r in results if r["admission_category"] == "REACH"]),
        "total_count": len(results)
    }
    
    # Count category usage
    category_usage = {}
    for result in results:
        cat = result.get("selected_category", "Unknown")
        category_usage[cat] = category_usage.get(cat, 0) + 1
    
    category_usage = Counter(result.get("selected_category", "Unknown") for result in results)

    print("\n" + "="*50)
    print("DISTRIBUTION SUMMARY:")
    print("="*50)
    print(f"SAFE colleges (high admission chance): {distribution_summary['safe_count']}")
    print(f"TARGET colleges (good admission chance): {distribution_summary['target_count']}")
    print(f"REACH colleges (stretch options): {distribution_summary['reach_count']}")
    print(f"Total colleges recommended: {distribution_summary['total_count']}")
    print()
    print("CATEGORY USAGE:")
    for category, count in category_usage.items():
        print(f"  {category}: {count} colleges")
    print()
    print("PARAMETERS USED:")
    print(f"Your rank: {rank}")
    print(f"Input categories: {categories}")
    print(f"Safety margin: {safety_margin}")
    print(f"Buffer for reach colleges: {buffer}")
    print(f"Target distribution: {int(target_distribution[0]*100)}% SAFE, {int(target_distribution[1]*100)}% TARGET, {int(target_distribution[2]*100)}% REACH")
    print("="*50 + "\n")

    return json.dumps({"recommendations": results}, indent=2)

def update_analytics(colleges_recommended=0):
    """
    Simple function to increment analytics counters.
    Creates DB and collection automatically on first use.
    
    Args:
        colleges_recommended (int): Number of colleges recommended in this run
    """
    try:
        analytics_db = MONGO_CLIENT["analytics"]
        counters = analytics_db["counters"]
        
        # Increment script views by 1
        counters.update_one(
            {"_id": "user_submissions"}, 
            {"$inc": {"count": 1}}, 
            upsert=True
        )
        
        # Increment colleges recommended
        if colleges_recommended > 0:
            counters.update_one(
                {"_id": "colleges_recommended"}, 
                {"$inc": {"count": colleges_recommended}}, 
                upsert=True
            )
        
        print(f"Analytics: +1 view, +{colleges_recommended} colleges")
        
    except Exception as e:
        print(f"Analytics failed: {e}")

if __name__ == "__main__":
    # your_rank = int(input("Enter CET Rank: ").strip())
    # your_category = input("Enter Category (e.g., GM): ").strip()
    # pref_loc = input("Enter preferred location (or leave blank): ").strip()
    # branches = input("Enter preferred branch(es), comma-separated (or leave blank): ").strip()
    # num_colleges = int(input("Enter number of colleges to recommend (default 15): ").strip() or "15")
    # model_choice = input("Choose API model [perplexity/grok] (default perplexity): ").strip().lower() or "perplexity"
    # summary_len = int(input("Enter summary length in sentences (default 5): ").strip() or 5)

    args = sys.argv

    your_rank = int(args[1])
    your_category = args[2].strip() if len(args) > 2 and args[2].strip() else "GM"

    pref_loc = args[3].strip() if len(args) > 3 and args[3].strip() else None
    branches = args[4].strip() if len(args) > 4 and args[4].strip() else None

    num_colleges = int(args[5]) if len(args) > 5 and args[5].strip().isdigit() else 15
    model_choice = args[6].strip().lower() if len(args) > 6 and args[6].strip() else "perplexity"
    summary_len = int(args[7]) if len(args) > 7 and args[7].strip().isdigit() else 5

    result_json = get_nearest_colleges(
        your_rank,
        your_category,
        preferred_location=pref_loc or None,
        branches=branches or None,
        num_colleges=num_colleges, 
        model=model_choice if model_choice in ["perplexity", "grok"] else "perplexity",
        summary_length=summary_len
    )
    
    # Extract college count and update analytics
    try:
        result_data = json.loads(result_json)
        colleges_count = len(result_data.get("recommendations", []))
        update_analytics(colleges_count)
    except:
        update_analytics(0)
    print("="*50)
    print(result_json)