import csv
import random
from datetime import datetime, timedelta

routes = [
    'RTO - Maninagar',
    'Iskcon - Naroda',
    'Bopal - Shivranjani',
    'Narol - Naroda',
    'Zundal - Visat'
]

profiles = {
    'RTO - Maninagar': {'demand': 'high'},
    'Iskcon - Naroda': {'demand': 'high'},
    'Bopal - Shivranjani': {'demand': 'medium'},
    'Narol - Naroda': {'demand': 'low'},
    'Zundal - Visat': {'demand': 'medium'}
}

time_slots = [f"{i}:00" for i in range(6, 22)]

with open('ahmedabad_brts_logs.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['route_id', 'bus_id', 'capacity', 'passengers', 'time_slot', 'trip_number', 'date'])
    
    base_date = datetime.now()
    
    for i in range(5000):
        route = random.choice(routes)
        profile = profiles[route]
        
        cap = 80 if profile['demand'] == 'high' else 50
        bus_id = f"GZ01B{random.randint(1000, 9999)}"
        ts = random.choice(time_slots)
        
        hour = int(ts.split(':')[0])
        is_peak = (8 <= hour <= 10) or (17 <= hour <= 19)
        
        if profile['demand'] == 'high':
            passengers = random.randint(30 + int(cap*0.8), cap + 30) if is_peak else random.randint(30, 70)
        elif profile['demand'] == 'low':
            passengers = random.randint(20, 40) if is_peak else random.randint(5, 20)
        else:
            passengers = random.randint(40, 80) if is_peak else random.randint(15, 45)
            
        passengers = min(passengers, cap + 30)
        
        writer.writerow([
            route, bus_id, cap, passengers, ts, f"AMTS{10000+i}", base_date.strftime('%Y-%m-%d')
        ])

print("CSV Generated Successfully")
