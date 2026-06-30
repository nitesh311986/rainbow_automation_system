# Backend Python — AI Document Parser Microservice

## Overview

This microservice receives uploaded purchase-order documents (images), sends them to OpenAI's `gpt-4o-mini` vision model, and returns structured JSON conforming to a Pydantic schema. It is designed to run independently from the Node.js backend and communicate over HTTP.

---

## Project Structure

```
backend-python/
├── main.py          # FastAPI application, endpoint, and extraction logic
├── schemas.py       # Pydantic data models for structured output validation
└── README.md        # This file
```

---

## Dependencies and Their Roles

| Package | Role |
|---|---|
| **fastapi** | Web framework that exposes the `POST /api/v1/parser/extract` endpoint. Handles request routing, file uploads, and automatic JSON serialisation of Pydantic models. |
| **uvicorn** | ASGI server that runs the FastAPI application. (Used at runtime, not imported in code.) |
| **pydantic** | Data validation library. Defines `LineItemSchema` and `PurchaseOrderSchema` that enforce the structure of the LLM's output. Also used by FastAPI as the `response_model` for automatic validation and OpenAPI schema generation. |
| **openai** | Official OpenAI Python SDK. Provides `client.beta.chat.completions.parse()` which sends the document image to `gpt-4o-mini` and returns a parsed Pydantic object directly. |
| **python-multipart** | Required by FastAPI to parse `multipart/form-data` requests (file uploads). |

---

## Data Flow Pipeline

```
1. Incoming Binary (UploadFile)
       │
       ▼
2. Base64 Encoding
       │  Raw file bytes → base64 string with MIME prefix
       ▼
3. OpenAI Parsing Stream
       │  client.beta.chat.completions.parse(
       │      model="gpt-4o-mini",
       │      response_format=PurchaseOrderSchema,
       │      messages=[system_prompt, user+image]
       │  )
       ▼
4. Structured JSON Output (PurchaseOrderSchema)
       │  Pydantic-validated object returned as HTTP 200 response
       ▼
5. Consumer (Node.js backend or frontend)
```

### Step Details

1. **Incoming Binary** — The client sends a `multipart/form-data` POST request with a single file field. FastAPI's `UploadFile` parameter receives the stream.

2. **Base64 Encoding** — The raw file bytes are read and base64-encoded. This is the format required by OpenAI's vision API for inline image transmission.

3. **OpenAI Parsing Stream** — The `client.beta.chat.completions.parse()` call sends:
   - A **system message** with extraction instructions specific to aluminum extrusion purchase orders.
   - A **user message** containing a text instruction and the base64-encoded image as an `image_url` content block.
   - The `response_format` parameter is set to `PurchaseOrderSchema`, which instructs the model to return JSON that conforms to the Pydantic class.

4. **Structured JSON Output** — The SDK deserialises the model's response into a `PurchaseOrderSchema` instance automatically. FastAPI then serialises this back to JSON for the HTTP response, validated against the `response_model`.

---

## API Signature

### `POST /api/v1/parser/extract`

#### Request

| Part | Type | Required | Description |
|---|---|---|---|
| `file` | `multipart/form-data` (binary) | Yes | Document image (PNG, JPEG, PDF page render, etc.) to parse |

#### Response — `200 OK`

```json
{
  "po_number": "PO-2024-001",
  "po_date": "2024-06-15",
  "due_date": "2024-07-15",
  "customer_name": "Acme Construction Ltd.",
  "project_number": "PRJ-789",
  "items": [
    {
      "description": "Aluminum Extrusion Profile 40x40mm",
      "qty": 150.0,
      "unit": "pieces",
      "rate": 45.50
    }
  ]
}
```

#### Error Responses

| Status | Condition |
|---|---|
| `400` | Uploaded file is empty |
| `422` | OpenAI returned no parseable structured output |
| `500` | `OPENAI_API_KEY` not set, or unexpected internal error |

---

## Data Validation Maps

### LineItemSchema

| Field | Type | Constraints | Description |
|---|---|---|---|
| `description` | `str` | Required | Name or description of the ordered item |
| `qty` | `float` | Required | Quantity ordered |
| `unit` | `str` | Required | Unit of measurement (pieces, meters, kg) |
| `rate` | `float` | Required | Unit price in base currency |

### PurchaseOrderSchema

| Field | Type | Constraints | Description |
|---|---|---|---|
| `po_number` | `str` | Required | Purchase order number |
| `po_date` | `str` | Required | PO issue date |
| `due_date` | `str` | Required | Expected delivery date |
| `customer_name` | `str` | Required | Customer or company name |
| `project_number` | `str` | Required | Internal project reference |
| `items` | `List[LineItemSchema]` | Required | Line items on the purchase order |

Both schemas use `Field(..., description=...)` to provide field-level documentation that is also exposed in the auto-generated OpenAPI schema at `/docs`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | API key for the OpenAI SDK. Read at request time, not import time. |
