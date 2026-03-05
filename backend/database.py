import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

def initialize_firebase():
    """Initialize Firebase Admin SDK for both local and production."""
    if firebase_admin._apps:
        return

    try:
        # 1️⃣ Render secret file
        render_path = "/etc/secrets/serviceAccountKey.json"

        # 2️⃣ Local development file
        local_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

        # 3️⃣ Environment variable
        env_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")

        if os.path.exists(render_path):
            cred = credentials.Certificate(render_path)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized using Render secret file")

        elif os.path.exists(local_path):
            cred = credentials.Certificate(local_path)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized using local serviceAccountKey.json")

        elif env_json:
            cred_dict = json.loads(env_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized using environment variable")

        else:
            print("WARNING: No Firebase credentials found")
            firebase_admin.initialize_app()

    except Exception as e:
        print("Firebase initialization error:", e)

# Initialize Firebase once
initialize_firebase()

def get_firestore_db():
    """Return Firestore client instance"""
    try:
        return firestore.client()
    except Exception as e:
        print("Failed to get Firestore client:", e)
        return None
