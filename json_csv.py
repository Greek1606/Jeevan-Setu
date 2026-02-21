import pandas as pd
import json

def convert_medical_csv_to_json(csv_file, json_file):
    df = pd.read_csv(csv_file)
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
    json_data = df.to_json(orient='records', indent=4)
    with open(json_file, 'w') as f:
        f.write(json_data)
    
    print(f"Successfully converted {csv_file} to {json_file}")
convert_medical_csv_to_json('Hospitals_In_India_Final_With_Schemes.csv', 'hospital.json')