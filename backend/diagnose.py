import os
import firebase_admin
from firebase_admin import credentials, firestore
from groq import Groq
from dotenv import load_dotenv
import traceback

load_dotenv()

def test_firebase():
    print("--- Testing Firebase Admin ---")
    cred_path = "serviceAccountKey.json"
    if not os.path.exists(cred_path):
        print(f"ERROR: {cred_path} not found!")
        return False
    
    try:
        if os.path.getsize(cred_path) == 0:
            print("ERROR: serviceAccountKey.json is EMPTY!")
            return False
            
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        ref = db.collection('test').document('diagnostic')
        ref.set({'status': 'ok', 'lastUpdate': firestore.SERVER_TIMESTAMP})
        print("SUCCESS: Firestore write successful.")
        return True
    except Exception:
        print("ERROR: Firebase test failed:")
        traceback.print_exc()
        return False

def test_groq():
    print("\n--- Testing Groq API ---")
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    if not api_key or "your_groq_api_key" in api_key:
        print("ERROR: GROQ_API_KEY not found or is placeholder in .env!")
        return False
    
    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say hello!"}]
        )
        print(f"SUCCESS: Groq responded: {completion.choices[0].message.content}")
        return True
    except Exception:
        print("ERROR: Groq test failed:")
        traceback.print_exc()
        return False

def test_git():
    print("\n--- Testing Git ---")
    try:
        import git
        import tempfile
        import shutil
        t = tempfile.mkdtemp()
        git.Repo.clone_from("https://github.com/github/helloworld", t, depth=1)
        shutil.rmtree(t)
        print("SUCCESS: Git clone working.")
        return True
    except Exception:
        print("ERROR: Git clone failed:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    fb_ok = test_firebase()
    gr_ok = test_groq()
    gt_ok = test_git()
