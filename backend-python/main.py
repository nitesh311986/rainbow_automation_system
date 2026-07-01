"""AI Document Processing Microservice.

Provides a single FastAPI endpoint that accepts a multi-part file upload,
streams the binary content to OpenAI's structured-output parsing API,
and returns a validated PurchaseOrder JSON object.
"""

from __future__ import annotations

import base64
import logging
import os
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("parser-microservice")

# ---------------------------------------------------------------------------
# Pydantic data schemas
# ---------------------------------------------------------------------------


class LineItemSchema(BaseModel):
    """A single line item extracted from the purchase-order document."""

    description: str = Field(..., description="Description of the material or service")
    qty: float = Field(..., description="Quantity ordered", ge=0)
    unit: str = Field(..., description="Unit of measurement (e.g. NOS, KG, MTR)")
    rate: float = Field(..., description="Unit rate in the PO currency", ge=0)


class PurchaseOrderSchema(BaseModel):
    """Top-level structured representation of a purchase order."""

    po_number: str = Field(..., description="Purchase-order number")
    po_date: str = Field(..., description="PO issue date (ISO 8601 or as printed)")
    due_date: str = Field(..., description="Delivery / due date")
    customer_name: str = Field(..., description="Customer or vendor name")
    project_number: str = Field(..., description="Project reference number")
    items: List[LineItemSchema] = Field(
        default_factory=list, description="Line items listed in the PO"
    )


# ---------------------------------------------------------------------------
# FastAPI application setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Document Parser Microservice",
    description="Accepts a document upload and returns structured purchase-order data "
    "using OpenAI structured-output parsing.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# OpenAI client (lazy initialisation)
# ---------------------------------------------------------------------------

_openai_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    """Return a singleton OpenAI client, raising if the API key is missing."""
    global _openai_client
    if _openai_client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable is not set")
            raise HTTPException(
                status_code=500,
                detail="Server is missing the OPENAI_API_KEY configuration.",
            )
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


# ---------------------------------------------------------------------------
# Extraction utility
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a document-parsing assistant specialised in reading purchase orders. "
    "Extract every field accurately from the provided document image or PDF. "
    "Return the result strictly conforming to the provided JSON schema. "
    "If a field is not present in the document, use an empty string for string "
    "fields and an empty list for items."
)


def _encode_upload(file: UploadFile) -> tuple[str, str]:
    """Read an UploadFile and return a base64 data-URL plus the mime type."""
    raw = file.file.read()
    mime = file.content_type or "application/octet-stream"
    b64 = base64.b64encode(raw).decode("utf-8")
    data_url = f"data:{mime};base64,{b64}"
    return data_url, mime


def extract_purchase_order(file: UploadFile) -> PurchaseOrderSchema:
    """Send the uploaded file to OpenAI and return a validated schema object."""
    client = get_openai_client()

    data_url, mime = _encode_upload(file)
    logger.info("Processing file '%s' (%s, %d bytes)", file.filename, mime, len(data_url))

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        }
                    ],
                },
            ],
            response_format=PurchaseOrderSchema,
        )
    except Exception as exc:
        logger.exception("OpenAI parsing call failed")
        raise HTTPException(status_code=502, detail=f"OpenAI parsing error: {exc}")

    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(
            status_code=502,
            detail="OpenAI returned no parseable structured output.",
        )

    logger.info("Successfully parsed PO %s with %d line items", parsed.po_number, len(parsed.items))
    return parsed


# ---------------------------------------------------------------------------
# API endpoint
# ---------------------------------------------------------------------------


@app.post("/api/v1/parser/extract", response_model=PurchaseOrderSchema)
async def extract(file: UploadFile = File(...)) -> PurchaseOrderSchema:
    """Accept a multi-part file upload and return structured PO data."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided in upload.")

    try:
        result = extract_purchase_order(file)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during extraction")
        raise HTTPException(status_code=500, detail=f"Internal server error: {exc}")
    finally:
        await file.close()

    return result


@app.get("/health")
async def health() -> dict:
    """Simple health-check endpoint."""
    return {"status": "ok"}
