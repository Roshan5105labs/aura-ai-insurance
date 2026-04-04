import urllib.request, json
from urllib.error import HTTPError

data = json.dumps({
    "name":"Test", "password":"pass123", "platform":"Swiggy", 
    "zone":"Dadar", "city":"mumbai", "avg_daily_earnings":500,
    "hours_per_week":48, "vehicle_age_yrs":2, "past_claims":0, "gig_tenure_yrs":1
}).encode()

req = urllib.request.Request('http://localhost:8000/api/v1/onboard', data=data, headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    print("Success:", res.read())
except HTTPError as e:
    print(f"Failed: {e.code}")
    print(e.read().decode())
