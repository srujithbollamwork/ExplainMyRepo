from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any
from pydantic import BaseModel
import os
import uuid
import json

from firebase_admin import firestore
from database import get_firestore_db

router = APIRouter(prefix="/repos", tags=["repos"])

class RepoSubmit(BaseModel):
    url: str
    userId: str | None = None

class RepoResponse(BaseModel):
    id: str
    url: str
    name: str
    status: str
    description: str | None = None

def analyze_repository_background(repo_id: str, url: str):
    from services.analyzer import analyze_repo
    analyze_repo(repo_id, url)

@router.post("/", response_model=RepoResponse)
def submit_repository(repo: RepoSubmit, background_tasks: BackgroundTasks):
    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not configured")

    name = repo.url.split("/")[-1]
    if name.endswith(".git"):
        name = name[:-4]

    repo_id = str(uuid.uuid4())

    repo_data = {
        "url": repo.url,
        "name": name,
        "userId": repo.userId,
        "status": "pending",
        "description": "Analysis pending...",
        "architecture_summary": None,
        "createdAt": firestore.SERVER_TIMESTAMP if 'firestore' in globals() else None
    }

    try:
        db.collection('repos').document(repo_id).set(repo_data)
    except Exception as e:
        print(f"Error saving to Firestore: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(analyze_repository_background, repo_id, repo.url)

    return {
        "id": repo_id,
        "url": repo.url,
        "name": name,
        "status": "pending",
        "description": "Analysis pending..."
    }

@router.get("/", response_model=List[RepoResponse])
def list_repositories(userId: str | None = None):
    db = get_firestore_db()
    if not db:
        return []

    try:
        query = db.collection('repos')
        if userId:
            query = query.where("userId", "==", userId)
            
        repos_ref = query.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(50).stream()
        repos = []
        for doc in repos_ref:
            data = doc.to_dict()
            data['id'] = doc.id
            repos.append(data)
        return repos
    except Exception as e:
        print("Error listing repos:", e)
        # Fallback to limit only if ordering fails (e.g. index not yet created)
        repos_ref = db.collection('repos').limit(50).stream()
        repos = []
        for doc in repos_ref:
            data = doc.to_dict()
            if userId and data.get("userId") != userId:
                continue
            data['id'] = doc.id
            repos.append(data)
        return repos

@router.delete("/{repo_id}")
def delete_repository(repo_id: str):
    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not configured")

    try:
        doc_ref = db.collection('repos').document(repo_id)
        # Delete subcollection files first (limited to prevent timeouts)
        files_ref = doc_ref.collection('files').limit(500).stream()
        for f in files_ref:
            f.reference.delete()
            
        doc_ref.delete()
        return {"status": "success", "message": f"Repository {repo_id} deleted"}
    except Exception as e:
        print(f"Error deleting repo {repo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{repo_id}")
def get_repository_details(repo_id: str):
    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not configured")

    try:
        doc_ref = db.collection('repos').document(repo_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Repository not found")
            
        repo = doc.to_dict()
        repo["id"] = doc.id
        
        files_ref = doc_ref.collection('files').stream()
        repo["files"] = []
        for f in files_ref:
            fdata = f.to_dict()
            fdata["id"] = f.id
            repo["files"].append(fdata)
            
        return repo
    except HTTPException:
        raise
    except Exception as e:
        print("Error getting repo details:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{repo_id}/readme")
async def generate_readme(repo_id: str):
    db = get_firestore_db()
    doc_ref = db.collection('repos').document(repo_id)
    doc = doc_ref.get()
    if not doc.exists: raise HTTPException(status_code=404, detail="Repo not found")
    repo_data = doc.to_dict()
    files_ref = doc_ref.collection('files').limit(30).stream()
    file_context = "\n".join([f"{f.to_dict()['path']}: {f.to_dict()['content_summary']}" for f in files_ref])
    
    prompt = (
        f"Generate a professional README.md for {repo_data['name']}\n"
        f"Clone URL: {repo_data['url']}\n"
        f"Context:\n{file_context}\n\n"
        "Use clean markdown formatting."
    )

    from services.analyzer import MODEL_SMART, get_groq_client
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(model=MODEL_SMART, messages=[{"role": "user", "content": prompt}])
        return {"readme": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{repo_id}/interview-questions")
async def get_interview_questions(repo_id: str):
    db = get_firestore_db()
    doc_ref = db.collection('repos').document(repo_id)
    doc = doc_ref.get()
    if not doc.exists: raise HTTPException(status_code=404, detail="Repo not found")
    repo_data = doc.to_dict()
    files_ref = doc_ref.collection('files').limit(30).stream()
    file_context = "\n".join([f"{f.to_dict()['path']}: {f.to_dict()['content_summary']}" for f in files_ref])
    
    prompt = (
        f"Generate 5 technical interview questions for {repo_data['name']}.\n"
        f"Context:\n{file_context}\n\n"
        "Return ONLY a JSON list: [{\"question\": \"...\", \"answer\": \"...\"}]"
    )
    
    from services.analyzer import MODEL_SMART, get_groq_client
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(model=MODEL_SMART, messages=[{"role": "user", "content": prompt}])
        text = completion.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return {"questions": json.loads(text)}
    except:
        return {"questions": []}

@router.get("/{repo_id}/patterns")
async def get_design_patterns(repo_id: str):
    db = get_firestore_db()
    doc_ref = db.collection('repos').document(repo_id)
    files_ref = doc_ref.collection('files').limit(30).stream()
    file_context = "\n".join([f"{f.to_dict()['path']}: {f.to_dict()['content_summary']}" for f in files_ref])
    
    prompt = (
        "Identify design patterns in this codebase.\n"
        f"Context:\n{file_context}\n\n"
        "Return ONLY a JSON list: [{\"pattern\": \"...\", \"location\": \"...\", \"explanation\": \"...\"}]"
    )
    
    from services.analyzer import MODEL_SMART, get_groq_client
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(model=MODEL_SMART, messages=[{"role": "user", "content": prompt}])
        text = completion.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return {"patterns": json.loads(text)}
    except:
        return {"patterns": []}
@router.get("/{repo_id}/test-suite")
async def generate_test_suite(repo_id: str):
    db = get_firestore_db()
    doc_ref = db.collection('repos').document(repo_id)
    files_ref = doc_ref.collection('files').limit(30).stream()
    file_context = "\n".join([f"{f.to_dict()['path']}: {f.to_dict()['content_summary']}" for f in files_ref])
    
    prompt = (
        "Generate a comprehensive, production-ready test suite (unit tests) for this repository.\n"
        "Detect the primary language and use the appropriate framework (e.g., pytest for Python, Jest for JS/TS).\n"
        f"Context:\n{file_context}\n\n"
        "Return the code in a clean markdown block with an explanation of why these tests were chosen."
    )
    
    from services.analyzer import MODEL_SMART, get_groq_client
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(model=MODEL_SMART, messages=[{"role": "user", "content": prompt}])
        return {"test_suite": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{repo_id}/infra")
async def generate_infrastructure(repo_id: str):
    db = get_firestore_db()
    doc_ref = db.collection('repos').document(repo_id)
    files_ref = doc_ref.collection('files').limit(30).stream()
    file_context = "\n".join([f"{f.to_dict()['path']}: {f.to_dict()['content_summary']}" for f in files_ref])
    
    prompt = (
        "Generate high-quality Infrastructure as Code (IaC) and deployment scripts for this repository.\n"
        "Include a Dockerfile, docker-compose.yml, and a GitHub Actions CI/CD pipeline script.\n"
        f"Context:\n{file_context}\n\n"
        "Explain the deployment strategy best suited for this stack."
    )
    
    from services.analyzer import MODEL_SMART, get_groq_client
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(model=MODEL_SMART, messages=[{"role": "user", "content": prompt}])
        return {"infra": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{repo_id}/migration")
async def get_migration_guide(repo_id: str):
    db = get_firestore_db()
    doc_ref = db.collection('repos').document(repo_id)
    files_ref = doc_ref.collection('files').limit(30).stream()
    file_context = "\n".join([f"{f.to_dict()['path']}: {f.to_dict()['content_summary']}" for f in files_ref])
    
    prompt = (
        "Analyze this repository's current stack and provide a 'Modernization & Migration Guide'.\n"
        "Suggest better frameworks (e.g., migrating from Flask to FastAPI, or from legacy React to Next.js App Router).\n"
        f"Context:\n{file_context}\n\n"
        "Explain the trade-offs, performance benefits, and a step-by-step roadmap for migration."
    )
    
    from services.analyzer import MODEL_SMART, get_groq_client
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(model=MODEL_SMART, messages=[{"role": "user", "content": prompt}])
        return {"migration": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
