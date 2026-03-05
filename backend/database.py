import os
import firebase_admin
from firebase_admin import credentials, firestore

cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

if not firebase_admin._apps:
    try:
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized with serviceAccountKey.json")
        else:
            print("WARNING: serviceAccountKey.json not found in backend/. Firebase Admin not initialized with credentials. Firestore writes will fail if not using local emulator or Application Default Credentials.")
            firebase_admin.initialize_app()
    except Exception as e:
        print("Error initializing Firebase Admin:", e)

def get_firestore_db():
    try:
        return firestore.client()
    except Exception as e:
        print("Failed to get Firestore client:", e)
        return None
