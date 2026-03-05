import os
import firebase_admin
from firebase_admin import credentials, firestore

# Local development path
local_cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
# Render Secret File path
render_cred_path = "/etc/secrets/serviceAccountKey.json"

if not firebase_admin._apps:
    try:
        if os.path.exists(render_cred_path):
            cred = credentials.Certificate(render_cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized via Render Secret File: /etc/secrets/serviceAccountKey.json")
        elif os.path.exists(local_cred_path):
            cred = credentials.Certificate(local_cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized via local serviceAccountKey.json")
        else:
            print("WARNING: No Firebase credentials found (/etc/secrets/ or local). Firestore writes will fail if not using emulator.")
            firebase_admin.initialize_app()
    except Exception as e:
        print("Error initializing Firebase Admin:", e)

def get_firestore_db():
    try:
        return firestore.client()
    except Exception as e:
        print("Failed to get Firestore client:", e)
        return None
