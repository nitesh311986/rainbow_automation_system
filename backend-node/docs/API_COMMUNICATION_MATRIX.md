# API Communication Matrix — Order Orchestration

## Overview

This document maps the end-to-end transactional lifecycle for order processing, from document ingestion through AI extraction, database enrichment, and final order confirmation with notification dispatch.

---

## Transactional Lifecycle

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  1. Ingestion │────▶│ 2. Python         │────▶│ 3. Node DB           │────▶│ 4. Form Pre-population│
│  (Multer)     │     │    Extraction     │     │    Enrichment Check  │     │    Return to Frontend │
│  File Upload  │     │  (OpenAI gpt-4o)  │     │  (ItemMaster scan)   │     │    (Enriched JSON)    │
└──────────────┘     └──────────────────┘     └─────────────────────┘     └──────────────────────┘
                                                                                    │
                                                                                    ▼
                                                                          ┌──────────────────┐
                                                                          │ 5. User Reviews  │
                                                                          │    & Confirms    │
                                                                          └────────┬─────────┘
                                                                                   ▼
┌──────────────────┐     ┌──────────────────────┐     ┌────────────────────────────────────┐
│ 7. Notifications │◀────│ 6. Prisma Transaction │◀────│ POST /api/v1/orders/confirm        │
│  (Email + WA)    │     │  (Order + OrderItems) │     │ Auto-generate order_no, persist    │
└──────────────────┘     └──────────────────────┘     └────────────────────────────────────┘
```

---

## Endpoint 1: `POST /api/v1/orders/process-extract`

### Purpose

Accepts a document file upload, forwards it to the Python FastAPI microservice for AI-based structured extraction, then enriches each parsed line item by scanning the `ItemMaster` database table for matching item descriptions.

### Request

| Property | Value |
|---|---|
| **Content-Type** | `multipart/form-data` |
| **Field Name** | `file` |
| **Field Type** | Binary file (image/PDF render) |

### Internal Flow

1. **Multer** receives the file into memory storage (`multer.memoryStorage()`).
2. **Axios** forwards the file as a `multipart/form-data` request to the Python service at `PYTHON_PARSER_URL` (env-configured, defaults to `http://localhost:8000/api/v1/parser/extract`).
3. Python service returns a `PurchaseOrderSchema` JSON object.
4. For each `items[]` entry, Node queries `ItemMaster` table via Prisma using case-insensitive `item_name` match against `description`.
5. Matched items are enriched with `image_url`, `size`, `weight`, and `length` from the database.

### Response — `200 OK`

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
      "rate": 45.50,
      "matched_item_id": "uuid-from-db",
      "image_url": "https://cdn.example.com/item-40x40.png",
      "size": "40x40",
      "weight": 1.2,
      "length": 6.0
    }
  ]
}
```

If no `ItemMaster` match is found, `matched_item_id`, `image_url`, `size`, `weight`, and `length` are returned as `null`.

### Error Responses

| Status | Condition |
|---|---|
| `400` | No file uploaded |
| `502` | Python parser service unreachable or returned an error |
| `500` | Internal server error during enrichment |

---

## Endpoint 2: `POST /api/v1/orders/confirm`

### Purpose

Receives the user-verified form data (after review of the enriched extraction output), persists the order and its line items in a single Prisma transaction, and dispatches notification stubs.

### Request

| Property | Value |
|---|---|
| **Content-Type** | `application/json` |

### JSON Payload

```json
{
  "po_number": "PO-2024-001",
  "po_date": "2024-06-15",
  "due_date": "2024-07-15",
  "customer_name": "Acme Construction Ltd.",
  "project_number": "PRJ-789",
  "customer_email": "contact@acme.com",
  "customer_phone": "+919876543210",
  "items": [
    {
      "item_id": "uuid-from-db",
      "quantity": 150,
      "unit": "pieces",
      "price": 45.50
    }
  ]
}
```

### Payload Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `po_number` | `string` | No | Purchase order number from extracted document |
| `po_date` | `string` | No | PO issue date (ISO 8601) |
| `due_date` | `string` | No | Expected delivery date (ISO 8601) |
| `customer_name` | `string` | Yes | Customer or company name |
| `project_number` | `string` | No | Internal project reference |
| `customer_email` | `string` | Yes | Email address for invoice notification |
| `customer_phone` | `string` | Yes | Phone number for WhatsApp notification |
| `items` | `ConfirmOrderItemInput[]` | Yes | Array of line items to persist |
| `items[].item_id` | `string` | Yes | UUID referencing `ItemMaster.id` |
| `items[].quantity` | `number` | Yes | Ordered quantity (must be > 0) |
| `items[].unit` | `string` | Yes | Unit of measurement |
| `items[].price` | `number` | Yes | Unit price (must be >= 0) |

### Transactional Flow

1. **Validation** — Required fields and item integrity are checked before any database operation.
2. **Order Number Generation** — Queries the last `Order` record by `order_no DESC`, parses the numeric suffix, increments by 1, and formats as `ORD-XXXXX` (zero-padded to 5 digits).
3. **Prisma Transaction** — A single `$transaction` block:
   - Creates the `Order` record with `order_date` set to `new Date()` (current server timestamp).
   - Creates all `OrderItem` records linked to the new order's `id`.
   - If any insert fails, the entire transaction rolls back.
4. **Notification Dispatch** — After successful persistence:
   - `sendInvoiceEmail()` is called with the customer email, order number, and summary body.
   - `sendWhatsAppMessage()` is called with the customer phone and a tracking confirmation message.

### Response — `201 Created`

```json
{
  "order": {
    "id": "uuid",
    "order_no": "ORD-00001",
    "order_date": "2024-06-30T12:30:00.000Z",
    "po_number": "PO-2024-001",
    "po_date": "2024-06-15T00:00:00.000Z",
    "due_date": "2024-07-15T00:00:00.000Z",
    "customer_name": "Acme Construction Ltd.",
    "project_number": "PRJ-789",
    "status": "Pending"
  },
  "order_items": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "item_id": "uuid",
      "quantity": 150,
      "unit": "pieces",
      "price": 45.5
    }
  ],
  "notifications": {
    "email": {
      "success": true,
      "provider": "mock-smtp",
      "messageId": "mock-mail-1719750000000"
    },
    "whatsapp": {
      "success": true,
      "provider": "mock-whatsapp",
      "messageId": "mock-wa-1719750000001"
    }
  }
}
```

### Error Responses

| Status | Condition |
|---|---|
| `400` | Missing required fields, invalid item data, or Prisma known error |
| `500` | Internal server error during transaction or notification dispatch |

---

## Notification Mock Logic

Both notification utilities are stub implementations in `src/utils/notifications.ts`. They simulate the async dispatch pattern without external API calls.

### Email Mock (`sendInvoiceEmail`)

| Parameter | Type | Description |
|---|---|---|
| `to` | `string` | Recipient email address |
| `subject` | `string` | Email subject line |
| `body` | `string` | Plain-text email body |
| `attachments` | `Array<{filename, content}>` | Optional file attachments |

**Behaviour:** Logs the recipient, subject, and attachment filenames to console. Returns a mock `messageId` with `mock-smtp` provider tag.

### WhatsApp Mock (`sendWhatsAppMessage`)

| Parameter | Type | Description |
|---|---|---|
| `to` | `string` | Recipient phone number (E.164 format) |
| `message` | `string` | Message body text |

**Behaviour:** Logs the recipient and first 100 characters of the message to console. Returns a mock `messageId` with `mock-whatsapp` provider tag.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PYTHON_PARSER_URL` | `http://localhost:8000/api/v1/parser/extract` | Base URL of the Python FastAPI parser microservice |
| `PORT` | `5000` | Node.js Express server port |
| `DATABASE_URL` | — | Prisma transaction pooler connection string |
| `DIRECT_URL` | — | Prisma direct connection string for migrations |
