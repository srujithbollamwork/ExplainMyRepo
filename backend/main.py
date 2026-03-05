from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables before importing routers
load_dotenv()

app = FastAPI(title="ExplainMyRepo API")

# Extremely permissive CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:6543",
        "https://explainmyrepo.web.app",
        "https://explainmyrepo.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"DEBUG: Incoming {request.method} {request.url}")
    response = await call_next(request)
    print(f"DEBUG: Outgoing response {response.status_code}")
    return response

from routes import repo, chat

app.include_router(repo.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    return {"message": "Welcome to ExplainMyRepo API"}
