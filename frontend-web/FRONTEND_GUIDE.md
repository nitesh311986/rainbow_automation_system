# Rainbow Automation — Frontend Interface Guide

This document describes the Next.js Web Administration dashboard for the Rainbow Automation order intake system. It covers page layouts, component roles, form state handling, Axios request coordination, and responsive layout rules for high-resolution desktop environments.

---

## 1. Project Structure

```
frontend-web/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── orders/
│   │   │       └── page.tsx          # Intake dashboard page (dual-pane workspace)
│   │   ├── globals.css               # Tailwind base + custom scrollbar utilities
│   │   └── layout.tsx                # Root layout (metadata, global styles)
│   ├── components/
│   │   ├── FileUploader.tsx          # Left pane — drag-and-drop uploader + PDF preview
│   │   ├── LineItemsTable.tsx        # Right pane — editable line items table
│   │   └── ValidationForm.tsx        # Right pane — validation form + submit flow
│   ├── lib/
│   │   └── api.ts                    # Axios client + orders API methods
│   └── types/
│       └── order.ts                  # Shared TypeScript interfaces (API contract)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.js
```

---

## 2. Page Layout Design

### 2.1 Intake Dashboard (`/admin/orders`)

The page renders a full-viewport dual-pane workspace layout:

```
┌──────────────────────────────────────────────────────────┐
│  Header Bar — Logo + System Status                       │
├────────────────────┬─────────────────────────────────────┤
│  Left Pane (42%)   │  Right Pane (58%)                   │
│  Document Intake   │  Validation & Confirmation          │
│                    │                                     │
│  ┌──────────────┐  │  ┌───────────────────────────────┐  │
│  │ Drop Zone    │  │  │ Header Fields (grid 2-col)    │  │
│  │ (drag PDF)   │  │  │ Customer Name | PO Number     │  │
│  └──────────────┘  │  │ PO Date       | Due Date      │  │
│                    │  │ Project #     | Email/Phone   │  │
│  ┌──────────────┐  │  └───────────────────────────────┘  │
│  │ PDF Preview  │  │  ┌───────────────────────────────┐  │
│  │ (iframe)     │  │  │ Line Items Table              │  │
│  │              │  │  │ (scrollable, editable cells)  │  │
│  │              │  │  └───────────────────────────────┘  │
│  └──────────────┘  │  ┌───────────────────────────────┐  │
│                    │  │ Validation Summary + Submit   │  │
│                    │  └───────────────────────────────┘  │
└────────────────────┴─────────────────────────────────────┘
```

- **Header Bar**: Fixed top bar with the Rainbow Automation logo, page title, and a live system status indicator.
- **Left Pane**: Occupies 42% of the horizontal workspace (minimum 400px). Contains the file uploader and PDF preview.
- **Right Pane**: Occupies the remaining 58%. Contains the validation form and line items table. Shows an empty state placeholder when no document has been processed yet.

---

## 3. Component Roles

### 3.1 `FileUploader` (`src/components/FileUploader.tsx`)

**Purpose**: Accepts a PDF purchase order via drag-and-drop or file picker, sends it to the backend for extraction, and displays an inline PDF preview.

**Key behaviors**:
- **Drag-and-drop**: Listens for `dragover`, `dragleave`, and `drop` events. Visual feedback (border color change, scale transform) indicates active drag state.
- **File validation**: Only accepts `application/pdf` MIME type or `.pdf` extension.
- **Axios upload**: Sends the file as `multipart/form-data` to `POST /api/v1/orders/process-extract` via `ordersApi.processExtract()`.
- **Loading indicator**: Displays a spinner with contextual text while the extraction request is in flight.
- **PDF preview**: Creates a `URL.createObjectURL()` from the dropped file and renders it in an `<iframe>` for inline preview.
- **Error display**: Shows error messages in a red alert box if the upload or extraction fails.
- **Clear button**: Revokes the object URL and resets the uploader state.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `onExtracted` | `(data: EnrichedPurchaseOrder) => void` | Callback invoked with the enriched JSON response from the backend |

### 3.2 `ValidationForm` (`src/components/ValidationForm.tsx`)

**Purpose**: Displays a reactive form populated from the enriched extraction response. Allows the operator to review and edit fields, then submit the confirmed order.

**Key behaviors**:
- **Dynamic population**: Initialized from `extractedData` prop. Header fields (Customer Name, PO Number, PO Date, Due Date, Project Number) are bound to form state.
- **Additional fields**: Customer Email and Customer Phone are collected (required by the `/confirm` endpoint) but not extracted from the PDF.
- **Line items table**: Renders `LineItemsTable` with editable inputs for stock size, cut length, weight, quantity, unit, and rate.
- **Validation**: `useMemo` computes a list of validation errors on every state change. The submit button is disabled when errors exist.
- **Submit flow**: Sends a `POST /api/v1/orders/confirm` request with the `ConfirmOrderInput` payload. On success, renders a success screen with the generated order number and notification status.
- **Reset**: The "Process New Order" button clears the success state and calls `onReset()` to reset the parent page.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `extractedData` | `EnrichedPurchaseOrder` | The enriched extraction response to populate form fields |
| `onReset` | `() => void` | Callback to reset the parent page state |

### 3.3 `LineItemsTable` (`src/components/LineItemsTable.tsx`)

**Purpose**: Renders a tabular list of extracted line items with inline-editable fields.

**Columns**:
| Column | Field | Editable | Description |
|--------|-------|----------|-------------|
| Description | `description` | No | Item description from the parsed PO |
| Stock Size | `size` | Yes | Auto-filled from ItemMaster match |
| Cut Length | `length` | Yes | Auto-filled from ItemMaster match (numeric) |
| Weight | `weight` | Yes | Auto-filled from ItemMaster match (numeric) |
| Qty | `qty` | Yes | Parsed quantity (integer) |
| Unit | `unit` | Yes | Parsed unit of measure |
| Rate | `rate` | Yes | Parsed unit price (decimal) |
| Cross-Section | `image_url` | No | Thumbnail image from ItemMaster match |

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `items` | `EnrichedLineItem[]` | Array of line items to render |
| `onItemChange` | `(index: number, field: string, value: string \| number) => void` | Callback for cell edits |

### 3.4 `OrdersPage` (`src/app/admin/orders/page.tsx`)

**Purpose**: The top-level page component that orchestrates the dual-pane layout and manages the shared `extractedData` state.

**State**:
| State | Type | Description |
|-------|------|-------------|
| `extractedData` | `EnrichedPurchaseOrder \| null` | The enriched extraction response. `null` when no document has been processed. |

**Flow**:
1. `FileUploader` calls `onExtracted` → `setExtractedData(data)`.
2. `ValidationForm` receives `extractedData` and populates its fields.
3. On successful order confirmation, `ValidationForm` calls `onReset` → `setExtractedData(null)`.
4. The right pane returns to the empty state placeholder.

---

## 4. Form State Handling

### 4.1 State Architecture

The form uses React's `useState` hook for all state management. No external form library (e.g., React Hook Form) is used — the state surface is small enough for direct management.

```
ValidationForm
├── formData (EnrichedPurchaseOrder)    — header fields
├── items (EnrichedLineItem[])          — line items array
├── customerEmail (string)              — additional required field
├── customerPhone (string)              — additional required field
├── isSubmitting (boolean)              — submit loading state
├── submitError (string | null)         — submit error message
└── successResponse (ConfirmOrderResponse | null) — success state
```

### 4.2 Update Mechanisms

- **Header fields**: `updateField(field, value)` uses functional `setFormData` to immutably update a single key.
- **Line items**: `updateItem(index, field, value)` uses functional `setItems` to immutably update a single item in the array.
- **Validation**: A `useMemo` hook recomputes the validation error list whenever `formData`, `items`, `customerEmail`, or `customerPhone` change. This ensures the submit button's disabled state is always reactive.

### 4.3 Validation Rules

| Rule | Condition |
|------|-----------|
| Customer Name required | `formData.customer_name` is non-empty |
| Customer Email required | `customerEmail` is non-empty |
| Customer Phone required | `customerPhone` is non-empty |
| At least one line item | `items.length > 0` |
| Each item has matched_item_id | `item.matched_item_id` is non-null |
| Each item qty > 0 | `item.qty > 0` |

---

## 5. Axios Request Coordination

### 5.1 API Client (`src/lib/api.ts`)

A centralized Axios client is created with `axios.create()`:

```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});
```

- **Base URL**: Configurable via `NEXT_PUBLIC_API_BASE_URL` environment variable. Defaults to `http://localhost:5000/api/v1` for local development.
- **Timeout**: 60 seconds to accommodate potentially slow PDF parsing on the Python backend.

### 5.2 Request Stream

The two API calls are coordinated sequentially — the second depends on data from the first:

```
Step 1: File Upload & Extraction
  FileUploader.handleFile(file)
    → ordersApi.processExtract(file)
      → POST /api/v1/orders/process-extract (multipart/form-data)
      → Response: EnrichedPurchaseOrder JSON
    → onExtracted(response.data)
    → Parent page sets extractedData state
    → ValidationForm populates fields

Step 2: Order Confirmation
  ValidationForm.handleSubmit()
    → ordersApi.confirm(payload)
      → POST /api/v1/orders/confirm (application/json)
      → Response: ConfirmOrderResponse JSON
    → setSuccessResponse(response.data)
    → UI switches to success screen
```

### 5.3 Error Handling

Both API calls use try/catch with typed error handling:
- Network errors and non-2xx responses are caught by Axios and surfaced as `Error` instances.
- Error messages are extracted and displayed in the UI via `setError()` state.
- The loading state (`isProcessing` / `isSubmitting`) is always reset in the `finally` block.

### 5.4 Environment Configuration

Create a `.env.local` file in `frontend-web/`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 6. Responsive Layout Rules

### 6.1 Viewport Strategy

The dashboard is designed for **high-resolution desktop environments** (1440px+ width). The layout uses a flexbox-based dual-pane system that fills the full viewport height (`h-screen`).

### 6.2 Pane Distribution

| Pane | Width | Min Width | Flex |
|------|-------|-----------|------|
| Left Pane | 42% of available space | 400px | `w-[42%] min-w-[400px]` |
| Right Pane | 58% (remaining) | — | `flex-1` |

- The left pane has a fixed minimum width of 400px to ensure the drop zone and PDF preview remain usable.
- The right pane uses `flex-1` to absorb all remaining horizontal space.
- A `gap-4` (1rem) gutter separates the panes.

### 6.3 Internal Scrolling

- Each pane is a flex column (`flex flex-col`) with a fixed header and a scrollable body.
- The body uses `min-h-0 flex-1` to enable proper flex scrolling within the pane.
- The `ValidationForm` uses `overflow-y-auto scrollbar-thin` for a custom-styled thin scrollbar.
- The `LineItemsTable` uses `overflow-x-auto` for horizontal scrolling when the table exceeds the pane width.

### 6.4 PDF Preview Sizing

The PDF preview area uses `min-h-0 flex-1` within the left pane to fill available vertical space after the drop zone. The `<iframe>` is set to `h-full w-full` to fill its container. The container has a dark background (`bg-slate-800`) to visually distinguish the PDF viewport.

### 6.5 Tailwind Breakpoint Usage

The current layout is optimized for desktop without mobile breakpoints. The design prioritizes:
- **Full viewport height utilization** via `h-screen` on the root container.
- **No wasted whitespace** — panes fill all available space.
- **Controlled overflow** — each scrollable region is independently scrollable, preventing page-level scroll.

### 6.6 Future Responsive Considerations

For tablet/mobile support (not yet implemented):
- Below `lg` (1024px): Stack panes vertically (left pane on top, right pane below).
- Below `sm` (640px): Collapse the line items table into a card-based layout.
- The `min-w-[400px]` on the left pane would need to be removed or reduced for narrow viewports.

---

## 7. Type System

All API contracts are defined in `src/types/order.ts` and shared between the API client, components, and page. This ensures end-to-end type safety:

| Interface | Used By | Description |
|-----------|---------|-------------|
| `EnrichedLineItem` | `LineItemsTable`, `ValidationForm` | Single line item with enrichment fields |
| `EnrichedPurchaseOrder` | `FileUploader`, `ValidationForm`, `OrdersPage` | Full extraction response |
| `ConfirmOrderItemInput` | `ValidationForm` | Single item in the confirm payload |
| `ConfirmOrderInput` | `ordersApi.confirm()` | Full confirm request payload |
| `ConfirmOrderResponse` | `ValidationForm` | Confirm endpoint response |

---

## 8. Getting Started

```bash
cd frontend-web
npm install
npm run dev
```

The dashboard will be available at `http://localhost:3000/admin/orders`.

Ensure the backend Node.js server is running on `http://localhost:5000` and the Python parser service is running on `http://localhost:8000`.
