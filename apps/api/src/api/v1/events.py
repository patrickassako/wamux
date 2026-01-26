"""
Events API endpoint.
Provides the catalog of available webhook event types.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/events", tags=["Events"])


# Event catalog - matches the Node.js event-types.ts
EVENT_CATALOG = {
    "messages": [
        {
            "type": "message.received",
            "description": "Any incoming message received"
        },
        {
            "type": "message.received.personal",
            "description": "Personal/DM message received"
        },
        {
            "type": "message.received.group",
            "description": "Group message received"
        },
        {
            "type": "message.sent",
            "description": "Message sent successfully"
        },
        {
            "type": "message.delivered",
            "description": "Message delivered to recipient"
        },
        {
            "type": "message.read",
            "description": "Message read by recipient"
        },
        {
            "type": "message.failed",
            "description": "Message sending failed"
        },
        {
            "type": "message.updated",
            "description": "Message was edited"
        },
        {
            "type": "message.deleted",
            "description": "Message was deleted"
        },
        {
            "type": "message.reaction",
            "description": "Reaction added to message"
        },
    ],
    "sessions": [
        {
            "type": "session.connected",
            "description": "WhatsApp session connected"
        },
        {
            "type": "session.disconnected",
            "description": "WhatsApp session disconnected"
        },
        {
            "type": "session.qr.updated",
            "description": "QR code updated for scanning"
        },
        {
            "type": "session.reconnecting",
            "description": "Session is reconnecting"
        },
    ],
    "chats": [
        {
            "type": "chat.created",
            "description": "New chat created"
        },
        {
            "type": "chat.updated",
            "description": "Chat metadata updated"
        },
        {
            "type": "chat.deleted",
            "description": "Chat deleted"
        },
        {
            "type": "chat.archived",
            "description": "Chat archived"
        },
    ],
    "groups": [
        {
            "type": "group.created",
            "description": "New group created"
        },
        {
            "type": "group.updated",
            "description": "Group metadata updated"
        },
        {
            "type": "group.participant.added",
            "description": "Participant added to group"
        },
        {
            "type": "group.participant.removed",
            "description": "Participant removed from group"
        },
        {
            "type": "group.participant.promoted",
            "description": "Participant promoted to admin"
        },
        {
            "type": "group.participant.demoted",
            "description": "Admin demoted to participant"
        },
    ],
    "contacts": [
        {
            "type": "contact.created",
            "description": "New contact synced"
        },
        {
            "type": "contact.updated",
            "description": "Contact info updated"
        },
    ],
    "calls": [
        {
            "type": "call.incoming",
            "description": "Incoming call notification"
        },
        {
            "type": "call.missed",
            "description": "Missed call notification"
        },
    ],
}


@router.get("")
async def list_events():
    """
    Get the complete catalog of available webhook event types.
    
    Use these event types when creating webhooks to filter which events you receive.
    """
    # Flatten all events for total count
    all_events = []
    for category_events in EVENT_CATALOG.values():
        all_events.extend([e["type"] for e in category_events])
    
    return {
        "catalog": EVENT_CATALOG,
        "total": len(all_events),
        "defaults": [
            "message.received",
            "message.sent",
            "message.delivered",
            "message.read",
            "session.connected",
            "session.disconnected"
        ]
    }
