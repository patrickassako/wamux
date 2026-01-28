from fastapi import APIRouter, Depends, HTTPException
from src.core.auth import get_current_user
from src.models.support import SupportTicketRequest, SupportTicketResponse
from src.core.database import get_supabase_client
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ticket", response_model=SupportTicketResponse, status_code=201)
async def create_support_ticket(
    request: SupportTicketRequest,
    user=Depends(get_current_user)
):
    """Create a new support ticket"""
    try:
        supabase = get_supabase_client()
        
        # Create ticket in database
        ticket_data = {
            "user_id": str(user["id"]),
            "user_email": user["email"],
            "subject": request.subject,
            "category": request.category,
            "message": request.message,
            "status": "open",
            "created_at": datetime.now().isoformat(),
        }
        
        result = supabase.table("support_tickets").insert(ticket_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create support ticket")
        
        ticket = result.data[0]
        
        # Log for monitoring
        logger.info(f"Support ticket created: {ticket['id']} by user {user['id']} - {request.category}: {request.subject}")
        
        # TODO: Send email notification to support team
        # await send_support_notification(ticket)
        
        return SupportTicketResponse(**ticket)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating support ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create support ticket: {str(e)}")


@router.get("/tickets", response_model=list[SupportTicketResponse])
async def get_user_tickets(user=Depends(get_current_user)):
    """Get all support tickets for the current user"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("support_tickets")\
            .select("*")\
            .eq("user_id", str(user["id"]))\
            .order("created_at", desc=True)\
            .execute()
        
        return [SupportTicketResponse(**ticket) for ticket in result.data]
        
    except Exception as e:
        logger.error(f"Error fetching support tickets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch tickets: {str(e)}")
