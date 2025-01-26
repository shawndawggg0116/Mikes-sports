import json
from pymongo import MongoClient

# Replace with your actual MongoDB connection string
client = MongoClient("mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new")
db = client["nfl_games"]  # Replace with your chosen database name
collection = db["games"]  # Replace with your chosen collection name

# Load mock data from a file
with open("mock_game_data.json", "r") as f:
    mock_data = json.load(f)

for week_data in mock_data:
    week_number = week_data["week"]["$numberInt"] 
    for game in week_data["games"]:
        game_data = {
            "homeTeam": game["homeTeam"],
            "awayTeam": game["awayTeam"],
            "startTime": game["startTime"],
            "endTime": game["endTime"],
            "status": game["status"],
            "week": week_number 
        }
        result = collection.insert_one(game_data)
        print(f"Inserted game with ID: {result.inserted_id}")

client.close()