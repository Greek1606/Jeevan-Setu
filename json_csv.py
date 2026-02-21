import pandas as pd
import json

def convert_medical_csv_to_json(csv_file, json_file):
    # 1. Load the CSV
    # Pandas automatically detects headers and data types
    df = pd.read_csv(csv_file)

    # 2. Clean the data (Optional but recommended)
    # This removes any accidental spaces in your text columns
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

    # 3. Convert to JSON
    # 'records' orientation creates the [{}, {}, {}] format MongoDB needs
    json_data = df.to_json(orient='records', indent=4)

    # 4. Save to a file
    with open(json_file, 'w') as f:
        f.write(json_data)
    
    print(f"Successfully converted {csv_file} to {json_file}")

# Usage
convert_medical_csv_to_json('Hospitals_In_India_Final_With_Schemes.csv', 'Hospitals_In_India_Final_With_Schemes.json')