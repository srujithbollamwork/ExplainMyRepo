import os
import firebase_admin
from firebase_admin import credentials, firestore
import json

# Local development path
local_cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
# Render Secret File path
render_cred_path = "/etc/secrets/serviceAccountKey.json"

def get_parsed_credentials(path):
    encodings = ['utf-8', 'utf-16', 'utf-16le', 'utf-8-sig']
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                return json.load(f)
        except (UnicodeDecodeError, UnicodeError, json.JSONDecodeError):
            continue
    raise ValueError(f"Could not parse file {path} with any known encoding.")

if not firebase_admin._apps:
    try:
        if os.path.exists(render_cred_path):
            cred_dict = get_parsed_credentials(render_cred_path)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized via Render Secret File")
        elif os.path.exists(local_cred_path):
            cred_dict = get_parsed_credentials(local_cred_path)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized via local serviceAccountKey.json")
        elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON"):
            cred_dict = json.loads(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON"))
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS_JSON")
        else:
            print("WARNING: No Firebase credentials found. Firestore writes will fail.")
            firebase_admin.initialize_app()
    except Exception as e:
        print("Error initializing Firebase Admin:", e)

def get_firestore_db():
    try:
        return firestore.client()
    except Exception as e:
        print("Failed to get Firestore client:", e)
        return None
