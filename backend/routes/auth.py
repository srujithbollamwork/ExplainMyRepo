import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import requests

from database import db_mock

router = APIRouter(prefix="/auth", tags=["auth"])

class GoogleAuthRequest(BaseModel):
    token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Verify google token using Google's tokeninfo endpoint to keep it simple without heavy SDKs
@router.post("/google", response_model=TokenResponse)
def google_auth(request: GoogleAuthRequest):
    try:
        # Validate the token with Google
        response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={request.token}")
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google token")

        user_info = response.json()
        
        google_id = user_info.get("sub")
        email = user_info.get("email")
        name = user_info.get("name")
        picture = user_info.get("picture")

        if not google_id or not email:
             raise HTTPException(status_code=400, detail="Incomplete Google user information")

        # Find or create user in mock DB
        if google_id not in db_mock.users:
            user = db_mock.add_user(google_id, email, name, picture)
        else:
            user = db_mock.users[google_id]

        # Use the Google token directly for the session instead of a custom JWT
        return {
            "access_token": request.token, 
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "picture": user["picture"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
