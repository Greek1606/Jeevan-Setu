import json
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

# --- 1. Setup Paths & Environment ---
# Finds the directory where main_pydan.py lives (Jeevan-Setu)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# --- 2. Initialize Clients ---
client = genai.Client(api_key=GEMINI_API_KEY)
app = FastAPI()

# --- 3. Load Data ---
# Uses absolute path to ensure hospital.json is found
try:
    with open(BASE_DIR / "hospital.json", "r") as f:
        hospitals_data = json.load(f)
except FileNotFoundError:
    raise FileNotFoundError(f"Could not find hospital.json at {BASE_DIR / 'hospital.json'}")

# --- 4. Models ---
class PatientInput(BaseModel):
    age: int
    gender: str
    condition: str
    location: str

# --- 5. Logic ---
def get_recommendations(city_name: str):
    city_name = city_name.strip().lower()
    
    # Matches "City" key from your JSON
    filtered = [
        h for h in hospitals_data
        if h.get("City", "").strip().lower() == city_name
    ]
    
    # Sort by "Rating" (highest first) as seen in your JSON
    filtered.sort(key=lambda x: x.get("Rating", 0), reverse=True)
    
    return filtered[:3]

# --- 6. API Endpoint ---
@app.post("/recommend")
async def recommend_hospital(data: PatientInput):
    # Search for hospitals in the provided location
    best_hospitals = get_recommendations(data.location)

    if not best_hospitals:
        raise HTTPException(
            status_code=404, 
            detail=f"No hospitals found in '{data.location}'. Try 'Anantpur' or 'Chitoor'."
        )

    # Use the "id" key as the name, as per your JSON structure
    hospital_ids = ", ".join([h.get("id", "Unknown Hospital") for h in best_hospitals])

    prompt = f"""
    Patient: {data.age}-year-old {data.gender}, Condition: {data.condition}.
    Location: {data.location}.
    Available Hospitals: {hospital_ids}.
    Task: Provide a 2-sentence professional medical recommendation explaining why these specific hospitals (based on ratings and specialization) are suitable.
    """

    try:
       
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        explanation = response.text
    except Exception as e:
        print(f"AI Error: {e}")
        explanation = "Recommended based on high local ratings and available facilities in your area."

    return {
        "status": "success",
        "recommended_hospitals": best_hospitals,
        "ai_explanation": explanation
    }