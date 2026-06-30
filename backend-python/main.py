import base64
import os
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

from schemas import PurchaseOrderSchema

app = FastAPI(
    title="Rainbow Automation — AI Document Parser",
    version="1.0.0",
    description="Microservice that extracts structured purchase-order data from uploaded documents using OpenAI.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXTRACTION_PROMPT = (
    "You are a document parsing assistant for an aluminum extrusion order automation system. "
    "Analyse the provided document image and extract all purchase-order information into the "
    "structured schema. For each line item capture the description, quantity, unit of measurement, "
    "and unit rate. If a field is not present in the document, use an empty string for string fields "
    "and 0.0 for numeric fields. Do not hallucinate values."
)


def _get_openai_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY environment variable is not configured.",
        )
    return OpenAI(api_key=api_key)


def _encode_upload(file: UploadFile) -> str:
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    return base64.b64encode(raw).decode("utf-8")


def _extract_purchase_order(file: UploadFile) -> PurchaseOrderSchema:
    client = _get_openai_client()
    base64_image = _encode_upload(file)

    mime_type = file.content_type or "image/png"

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        response_format=PurchaseOrderSchema,
        messages=[
            {
                "role": "system",
                "content": EXTRACTION_PROMPT,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract the purchase order data from this document.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}",
                        },
                    },
                ],
            },
        ],
        max_tokens=4096,
    )

    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(
            status_code=422,
            detail="OpenAI returned no parseable structured output.",
        )

    return parsed


@app.post("/api/v1/parser/extract", response_model=PurchaseOrderSchema)
async def extract(file: Annotated[UploadFile, File(description="Document image to parse")]) -> PurchaseOrderSchema:
    try:
        result = _extract_purchase_order(file)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during extraction: {exc}",
        )
