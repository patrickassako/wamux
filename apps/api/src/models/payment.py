from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Literal

def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    words = string.split('_')
    return words[0] + ''.join(word.capitalize() for word in words[1:])

class PaymentLinkRequest(BaseModel):
    """
    Request model for creating a payment link via My-CoolPay.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )

    transaction_amount: int = Field(..., gt=0, description="Amount to be paid")
    transaction_currency: Literal["XAF", "EUR"] = Field(default="XAF", description="Currency (XAF or EUR)")
    transaction_reason: str | None = Field(default=None, min_length=1, max_length=100, description="Reason for payment")
    app_transaction_ref: str = Field(..., min_length=1, description="Unique reference from the application")
    customer_name: str | None = Field(default=None, min_length=1, description="Payer name")
    customer_phone_number: str | None = Field(default=None, description="Payer phone number")
    customer_email: EmailStr | None = Field(default=None, description="Payer email")
    customer_lang: Literal["en", "fr"] = Field(default="fr", description="Language (en or fr)")

class PaymentLinkResponse(BaseModel):
    """
    Response model from My-CoolPay payment link creation.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    status: str = Field(description="Status of the request (e.g., success)")
    payment_url: str | None = Field(default=None, description="The URL to redirect the user to")
    transaction_ref: str | None = Field(default=None, description="The My-CoolPay transaction reference")
    custom_error: str | None = Field(default=None, description="Error message if failed")
