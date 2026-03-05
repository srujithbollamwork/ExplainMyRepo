from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from groq import Groq

from firebase_admin import firestore
from database import get_firestore_db

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize Groq Client
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

def get_groq_client():
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    return Groq(api_key=key)

client = get_groq_client()

class ChatRequest(BaseModel):
    repo_id: str
    message: str

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    db = get_firestore_db()
    if not db:
        raise HTTPException(status_code=500, detail="Firestore not configured")

    global client
    if not client:
        client = get_groq_client()
    if not client:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    try:
        # 1. Fetch Repo Context
        doc_ref = db.collection('repos').document(request.repo_id)
        repo_doc = doc_ref.get()
        if not repo_doc.exists:
            raise HTTPException(status_code=404, detail="Repo not found")
        
        repo_data = repo_doc.to_dict()
        arch_summary = repo_data.get('architecture_summary', 'No summary available yet.')
        
        # 2. Get file summaries for context
        files_ref = doc_ref.collection('files').limit(20).stream()
        file_context = []
        for f in files_ref:
            fd = f.to_dict()
            file_context.append(f"{fd['path']}: {fd['content_summary']}")
            
        context_str = "\n".join(file_context)
        
        prompt = (
            f"You are an AI assistant helping a developer understand this repository: {repo_data['name']}.\n"
            f"Architecture Overview: {arch_summary}\n"
            f"File Context (subset):\n{context_str}\n\n"
            f"User Question: {request.message}\n"
            f"Assistant:"
        )

        def generate():
            try:
                response_stream = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    stream=True,
                )
                
                for chunk in response_stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                yield f"Error in streaming: {str(e)}"

        return StreamingResponse(generate(), media_type="text/plain")
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
