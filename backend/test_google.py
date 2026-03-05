import requests

# Test if we can reach the Google tokeninfo endpoint from this machine
try:
    print("Testing connection to Google oauth2 endpoint...")
    response = requests.get("https://oauth2.googleapis.com/tokeninfo?id_token=invalid_token_just_testing_reachability")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Connection failed: {e}")
