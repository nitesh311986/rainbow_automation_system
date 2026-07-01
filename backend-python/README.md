# AI Document Parser Microservice

A lightweight FastAPI microservice that accepts a document upload (image or PDF)
and returns **structured purchase-order data** using OpenAI's structured-output
parsing API.

---

## 1. Structural Layout

```
backend-python/
├── main.py          # FastAPI app, schemas, extraction logic, endpoint
├── README.md        # This file
└── .venv/           # Local virtual environment (developer-managed)
```

### Role of Each Dependency

| Dependency       | Role                                                                 |
|------------------|----------------------------------------------------------------------|
| **fastapi**      | Web framework that hosts the REST endpoint and handles request routing. |
| **uvicorn**      | ASGI server that runs the FastAPI application.                       |
| **pydantic**     | Defines and validates the structured JSON schemas returned by the API. |
| **openai**       | Python SDK used to call `client.beta.chat.completions.parse` for structured output. |
| **python-multipart** | Enables FastAPI to parse `multipart/form-data` file uploads.    |

---

## 2. Data Flow Pipeline

```
Incoming Binary (multipart UploadFile)
        │
        ▼
  Read & base64-encode file bytes
        │
        ▼
  OpenAI Parsing Stream
  (client.beta.chat.completions.parse)
  model: gpt-4o-mini
  response_format: PurchaseOrderSchema
        │
        ▼
  Pydantic Validation
  (auto-validated by structured-output contract)
        │
        ▼
  Structured JSON Output
  (PurchaseOrderSchema → JSON response)
```

### Step Details

1. **Incoming Binary** — The client sends a `POST` request with a
   `multipart/form-data` body containing a single file field.
2. **Encoding** — The file bytes are read and base64-encoded into a
   data-URL so they can be passed as an `image_url` content part to OpenAI.
3. **OpenAI Parsing** — The `gpt-4o-mini` model is called with
   `response_format=PurchaseOrderSchema`, which forces the model to return
   JSON that conforms to the Pydantic schema.
4. **Validation** — The SDK automatically parses the response into a
   `PurchaseOrderSchema` instance. If the model output does not match the
   schema, a `502` error is returned.
5. **Structured JSON Output** — FastAPI serialises the validated
   `PurchaseOrderSchema` back to JSON and returns it to the client.

---

## 3. API Reference

### `POST /api/v1/parser/extract`

Extracts structured purchase-order data from an uploaded document.

#### Request

| Parameter | Location | Type        | Required | Description                          |
|-----------|----------|-------------|----------|--------------------------------------|
| `file`    | form-data| `UploadFile`| Yes      | The PO document (image or PDF).      |

**Example (cURL):**

```bash
curl -X POST http://localhost:8000/api/v1/parser/extract \
  -F "file=@purchase_order.pdf"
```

#### Response — `200 OK`

```json
{
  "po_number": "PO-2026-0042",
  "po_date": "2026-06-15",
  "due_date": "2026-07-30",
  "customer_name": "Acme Industries Pvt Ltd",
  "project_number": "PRJ-1187",
  "items": [
    {
      "description": "Mild Steel Angle 50x50x6",
      "qty": 120.0,
      "unit": "NOS",
      "rate": 450.00
    }
  ]
}
```

#### Data Validation Map

| Field            | Schema              | Type             | Constraints            |
|------------------|---------------------|------------------|------------------------|
| `po_number`      | PurchaseOrderSchema | `str`            | Required               |
| `po_date`        | PurchaseOrderSchema | `str`            | Required               |
| `due_date`       | PurchaseOrderSchema | `str`            | Required               |
| `customer_name`  | PurchaseOrderSchema | `str`            | Required               |
| `project_number` | PurchaseOrderSchema | `str`            | Required               |
| `items`          | PurchaseOrderSchema | `List[LineItem]` | Default: `[]`          |
| `description`    | LineItemSchema      | `str`            | Required               |
| `qty`            | LineItemSchema      | `float`          | `>= 0`                 |
| `unit`           | LineItemSchema      | `str`            | Required               |
| `rate`           | LineItemSchema      | `float`          | `>= 0`                 |

#### Error Responses

| Status | Cause                                                    |
|--------|----------------------------------------------------------|
| `400`  | No filename provided in the upload.                      |
| `500`  | `OPENAI_API_KEY` not set or unexpected internal error.   |
| `502`  | OpenAI API call failed or returned no parseable output.  |

---

## 4. Environment Variables

| Variable          | Required | Description                              |
|-------------------|----------|------------------------------------------|
| `OPENAI_API_KEY`  | Yes      | API key for the OpenAI SDK.              |

---

## 5. Health Check

### `GET /health`

```json
{ "status": "ok" }
```
