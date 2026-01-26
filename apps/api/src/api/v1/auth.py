"""
Authentication and Profile Management Endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Annotated
from supabase import Client
from ...core.supabase import get_supabase_client, get_supabase_service_client
from ...core.auth import get_current_user
from ...models.auth import (
    RegisterRequest, 
    LoginRequest, 
    AuthResponse, 
    ProfileResponse, 
    ProfileUpdateRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    supabase: Annotated[Client, Depends(get_supabase_client)],
    service_client: Annotated[Client, Depends(get_supabase_service_client)]
):
    """
    Register a new user.
    """
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "display_name": request.display_name,
                    "company": request.company,
                    "phone": request.phone
                }
            }
        })
        
        if not auth_response.user:
             raise HTTPException(status_code=400, detail="Registration failed")

        # Use Service Role Client to bypass RLS and ensure profile exists
        # Injected via dependency for testability
        
        # Check if profile exists (Trigger might have created it)
        try:
            profile = service_client.table('profiles').select('*').eq('id', auth_response.user.id).single().execute()
            profile_data = profile.data
        except Exception:
            # Profile not found (Trigger failed or not installed), create it manually
            new_profile = {
                "id": auth_response.user.id,
                "email": request.email,
                "display_name": request.display_name,
                "company": request.company,
                "phone": request.phone
            }
            # Clean None values
            new_profile = {k: v for k, v in new_profile.items() if v is not None}
            
            profile = service_client.table('profiles').insert(new_profile).execute()
            profile_data = profile.data[0]

        # Update profile with extra data if needed (if it was created by trigger but missing fields)
        # Only if we didn't just create it manually above
        # But simplify: the above login ensures we have what we need. 
        # If we fetched it from trigger, check if fields are missing?
        # For now, simplistic approach: if we found it, rely on it. If we created it, we used the data.
        
        # Construct response
        # Handle case where email confirmation is enabled (session is None)
        access_token = auth_response.session.access_token if auth_response.session else None
        expires_in = auth_response.session.expires_in if auth_response.session else None
        
        return AuthResponse(
            access_token=access_token,
            expires_in=expires_in,
            user=ProfileResponse(**profile_data)
        )

    except Exception as e:
        # Check for specific Supabase errors
        error_msg = str(e)
        if "User already registered" in error_msg:
             raise HTTPException(status_code=400, detail="User already registered")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    supabase: Annotated[Client, Depends(get_supabase_client)],
    service_client: Annotated[Client, Depends(get_supabase_service_client)]
):
    """
    Login with email and password.
    """
    try:
        # Authenticate with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_response.user or not auth_response.session:
             raise HTTPException(status_code=401, detail="Invalid credentials")

        # Fetch profile using Service Role to bypass RLS
        # Injected via dependency
        profile = service_client.table('profiles').select('*').eq('id', auth_response.user.id).single().execute()
        
        return AuthResponse(
            access_token=auth_response.session.access_token,
            expires_in=auth_response.session.expires_in,
            user=ProfileResponse(**profile.data)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request: ForgotPasswordRequest,
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Request password reset email.
    """
    try:
        supabase.auth.reset_password_email(request.email)
        return {"message": "Password reset email sent if exists"}
    except Exception as e:
        # Don't reveal if email exists or not
        return {"message": "Password reset email sent if exists"}

@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: Annotated[dict, Depends(get_current_user)]
):
    """
    Get current user profile (Protected).
    """
    return ProfileResponse(**current_user)

@router.patch("/profile", response_model=ProfileResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Update current user profile (Protected).
    """
    try:
        # Filter None values
        update_data = {k: v for k, v in request.model_dump(exclude_unset=True).items() if v is not None}
        
        if not update_data:
            return ProfileResponse(**current_user)
            
        # Update using RLS (current_user['id'] matches auth.uid())
        response = supabase.table('profiles').update(update_data).eq('id', current_user['id']).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return ProfileResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
