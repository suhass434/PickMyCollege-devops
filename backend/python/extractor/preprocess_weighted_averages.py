import os
from pymongo import MongoClient
from datetime import datetime, timezone
import dotenv

# Load environment variables from .env file
dotenv.load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
SOURCE_DB = "cet"
TARGET_DB = "weighted_averages"
DECAY_FACTOR = 0.2

def calculate_weighted_averages():
    """Pre-calculate and store weighted averages for all combinations"""
    client = MongoClient(MONGO_URI)
    
    # Get all available years
    source_db = client[SOURCE_DB]
    years = sorted([int(name) for name in source_db.list_collection_names() 
                   if name.isdigit()], reverse=True)
    
    # Group all data by college-branch-category
    combinations = {}
    
    print("Collecting data from all years...")
    for year in years:
        collection = source_db[str(year)]
        cursor = collection.find({}, {
            "college_code": 1, "college_name": 1, "branch_code": 1,
            "branch_name": 1, "location": 1, "category": 1, "cutoff": 1
        })
        
        for doc in cursor:
            key = (doc["college_code"], doc["branch_code"], doc["category"])
            
            if key not in combinations:
                combinations[key] = {
                    "college_code": doc["college_code"],
                    "college_name": doc["college_name"],
                    "branch_code": doc["branch_code"],
                    "branch_name": doc["branch_name"],
                    "location": doc["location"],
                    "category": doc["category"],
                    "cutoffs": []
                }
            
            combinations[key]["cutoffs"].append({
                "year": year,
                "cutoff": doc["cutoff"]
            })
    
    print(f"Processing {len(combinations)} unique combinations...")
    
    # Calculate weighted averages and organize by category
    target_db = client[TARGET_DB]
    category_data = {}
    
    for combination in combinations.values():
        # Sort cutoffs by year (recent first)
        combination["cutoffs"].sort(key=lambda x: x["year"], reverse=True)
        
        # Calculate weighted average
        total_weighted_cutoff = 0
        total_weights = 0
        
        for i, cutoff_data in enumerate(combination["cutoffs"]):
            weight = DECAY_FACTOR ** i
            total_weighted_cutoff += cutoff_data["cutoff"] * weight
            total_weights += weight
        
        weighted_avg = total_weighted_cutoff / total_weights
        
        # Prepare document
        doc = {
            "college_code": combination["college_code"],
            "college_name": combination["college_name"],
            "branch_code": combination["branch_code"],
            "branch_name": combination["branch_name"],
            "location": combination["location"],
            "category": combination["category"],
            "weighted_avg_cutoff": round(weighted_avg),
            "latest_cutoff": combination["cutoffs"][0]["cutoff"],
            "cutoff_history": combination["cutoffs"],
            "last_updated": datetime.now(timezone.utc)
        }
        
        # Group by category
        category = combination["category"]
        if category not in category_data:
            category_data[category] = []
        category_data[category].append(doc)
    
    # Insert into category-specific collections (sorted by weighted_avg_cutoff)
    for category, documents in category_data.items():
        collection = target_db[category]
        
        # Clear existing data
        collection.drop()
        
        # Sort by weighted average for faster range queries
        documents.sort(key=lambda x: x["weighted_avg_cutoff"])
        
        # Insert sorted data
        if documents:
            collection.insert_many(documents)
            
            # Create index for faster queries
            collection.create_index("weighted_avg_cutoff")
            collection.create_index([("location", 1), ("weighted_avg_cutoff", 1)])
            collection.create_index([("branch_code", 1), ("weighted_avg_cutoff", 1)])
            
        print(f"Inserted {len(documents)} records for category {category}")
    
    print("Weighted averages preprocessing completed!")

if __name__ == "__main__":
    calculate_weighted_averages()
