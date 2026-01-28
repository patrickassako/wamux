from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Literal

def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    words = string.split('_')
    return words[0] + ''.join(word.capitalize() for word in words[1:])

class PaymentLinkRequest(BaseModel):
    """
    Request model for creating a payment link via Flutterwave.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )

    transaction_amount: int | float = Field(..., gt=0, description="Amount to be paid")
    transaction_currency: Literal["XAF", "XOF", "NGN", "GHS", "KES", "UGX", "TZS", "ZMW", "USD", "EUR"] = Field(
        default="XAF", 
        description="Currency code"
    )
    transaction_reason: str | None = Field(default=None, min_length=1, max_length=100, description="Reason for payment")
    app_transaction_ref: str = Field(..., min_length=1, description="Unique reference from the application")
    customer_name: str | None = Field(default=None, min_length=1, description="Payer name")
    customer_phone_number: str | None = Field(default=None, description="Payer phone number")
    customer_email: EmailStr | None = Field(default=None, description="Payer email")
    # Flutterwave-specific
    payment_options: str = Field(default="card,mobilemoney", description="Available payment methods")
    redirect_url: str | None = Field(default=None, description="URL to redirect after payment")

class PaymentLinkResponse(BaseModel):
    """
    Response model from Flutterwave payment link creation.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    status: str = Field(description="Status of the request (success/error)")
    payment_url: str | None = Field(default=None, description="Hosted payment link")
    transaction_ref: str | None = Field(default=None, description="Flutterwave transaction reference")
    custom_error: str | None = Field(default=None, description="Error message if failed")

