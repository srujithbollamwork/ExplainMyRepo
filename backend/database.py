import os
import firebase_admin
from firebase_admin import credentials, firestore
import json
import base64

cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

if not firebase_admin._apps:
    try:
        if os.environ.get("FIREBASE_CREDENTIALS"):
            # Decode the base64 string back into JSON
            decoded_cred = base64.b64decode(os.environ.get("FIREBASE_CREDENTIALS")).decode('utf-8')
            cred_dict = json.loads(decoded_cred)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized via Base64 FIREBASE_CREDENTIALS env var")
        elif os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized with serviceAccountKey.json")
        else:
            print("WARNING: No Firebase credentials found (neither FIREBASE_CREDENTIALS env var nor serviceAccountKey.json). Firebase Admin not initialized with credentials. Firestore writes will fail if not using local emulator or Application Default Credentials.")
            firebase_admin.initialize_app()
    except Exception as e:
        print("Error initializing Firebase Admin:", e)

def get_firestore_db():
    try:
        return firestore.client()
    except Exception as e:
        print("Failed to get Firestore client:", e)
        return None
