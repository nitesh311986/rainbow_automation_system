from typing import List

from pydantic import BaseModel, Field


class LineItemSchema(BaseModel):
    description: str = Field(..., description="Name or description of the ordered item")
    qty: float = Field(..., description="Quantity ordered")
    unit: str = Field(..., description="Unit of measurement (e.g., pieces, meters, kg)")
    rate: float = Field(..., description="Unit price in base currency")


class PurchaseOrderSchema(BaseModel):
    po_number: str = Field(..., description="Purchase order number")
    po_date: str = Field(..., description="Purchase order issue date (ISO 8601 or human-readable)")
    due_date: str = Field(..., description="Expected delivery or completion date")
    customer_name: str = Field(..., description="Customer or company name placing the order")
    project_number: str = Field(..., description="Internal project reference number")
    items: List[LineItemSchema] = Field(..., description="Line items listed on the purchase order")
