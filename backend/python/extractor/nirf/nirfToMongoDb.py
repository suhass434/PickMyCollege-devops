import csv
from pymongo import MongoClient
import os
import dotenv

dotenv.load_dotenv()

# Connect to local MongoDB server
mongo_uri = os.getenv("MONGODB_URI")
client = MongoClient(mongo_uri)

# Create/get database and collection
db = client["nirf_2024"]
collection = db["college_rankings"]  # you can rename this

# Clear previous data (optional)
collection.delete_many({})

# Read CSV and insert into MongoDB
with open("shared/nirf.csv", mode="r", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    data = [row for row in reader]
    collection.insert_many(data)

print("Data successfully inserted into MongoDB.")
print(collection.count_documents({}))  