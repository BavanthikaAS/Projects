from pydantic import BaseModel, Field
from typing import Optional


class ListingAssistRequest(BaseModel):
    description: str = Field(..., min_length=1, description="Free-text product description from seller")


class ListingAssistOut(BaseModel):
    title: str = Field(..., description="Suggested product listing title")
    category_slug: Optional[str] = Field(None, description="Suggested category slug")
    brand: Optional[str] = Field(None, description="Detected brand name")
    model: Optional[str] = Field(None, description="Detected model name")
    condition: str = Field("good", description="Item condition: like_new, good, fair, poor, new")
    description: str = Field(..., description="Cleaned up, structured product description")
