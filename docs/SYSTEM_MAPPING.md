# System Mapping Documentation

## Phase 1: Backend Database Architecture

### Database Schema Design

The Order Automation System uses a PostgreSQL relational database with Prisma ORM. The schema is designed to support aluminum extrusion profile mapping and order management.

#### Core Models

##### 1. ItemMaster (`item_master`)
Stores master catalog of aluminum extrusion profiles and related items.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier for each item
- `item_name` (String): Name/description of the aluminum extrusion profile
- `size` (String, Optional): Dimensions/specifications (e.g., "40x40mm", "60x80mm")
- `weight` (Float, Optional): Weight in kg/m for shipping calculations
- `length` (Float, Optional): Standard length in meters
- `image_url` (String, Optional): URL to product image/technical drawing
- `created_at` (DateTime): Timestamp when item was added to catalog

**Purpose:** Central catalog for all aluminum profiles, extrusions, and related products. The optional fields allow flexibility for different product types while maintaining core identification.

##### 2. Order (`orders`)
Stores customer orders with project and purchase order tracking.

**Fields:**
- `id` (UUID, Primary Key): Unique order identifier
- `order_no` (String, Unique): Human-readable order number (e.g., "ORD-2024-001")
- `order_date` (DateTime): Date order was created
- `po_number` (String, Optional): Customer's Purchase Order number
- `po_date` (DateTime, Optional): Date of customer's PO
- `due_date` (DateTime, Optional): Expected delivery/completion date
- `customer_name` (String): Customer or company name
- `project_number` (String, Optional): Internal project reference
- `status` (String, Default: "Pending"): Order status (Pending, In Progress, Completed, Cancelled)

**Purpose:** Tracks orders from creation through delivery. PO fields enable integration with customer procurement systems. Project number links orders to internal project management.

##### 3. OrderItem (`order_items`)
Junction table linking orders to items with quantity and pricing.

**Fields:**
- `id` (UUID, Primary Key): Unique line item identifier
- `order_id` (String, Foreign Key): References Order.id
- `item_id` (String, Foreign Key): References ItemMaster.id
- `quantity` (Int): Number of units ordered
- `unit` (String): Unit of measurement (e.g., "pieces", "meters", "kg")
- `price` (Float): Unit price in base currency

**Purpose:** Many-to-many relationship between Orders and ItemMaster with additional attributes (quantity, unit, price). Allows multiple items per order and tracks pricing at order time.

### Structural Relationships

#### One-to-Many: Order → OrderItem
- One Order can have multiple OrderItems
- Cascading delete: If an Order is deleted, all associated OrderItems are deleted
- Foreign key: `order_id` in OrderItem references `id` in Order

#### One-to-Many: ItemMaster → OrderItem
- One ItemMaster can appear in multiple OrderItems
- Cascading delete: If an ItemMaster is deleted, all OrderItems referencing it are deleted
- Foreign key: `item_id` in OrderItem references `id` in ItemMaster

#### Many-to-Many: Order ↔ ItemMaster (via OrderItem)
- OrderItem acts as junction table
- Enables flexible pricing (price stored at order time, not in ItemMaster)
- Supports different units per order line

### Why This Schema for Aluminum Extrusion Profiles

1. **Flexible Item Catalog**: Optional fields in ItemMaster accommodate diverse product types (profiles, accessories, hardware) while maintaining core identification.

2. **Project-Based Tracking**: `project_number` and `po_number` fields support B2B workflows where orders are tied to construction projects and customer PO systems.

3. **Pricing Flexibility**: Storing `price` in OrderItem (not ItemMaster) allows price changes over time without affecting historical orders.

4. **Unit Flexibility**: `unit` field supports different measurement needs (pieces for hardware, meters for extrusions, kg for bulk materials).

5. **Status Tracking**: Default "Pending" status with string field allows custom workflow states as business requirements evolve.

### Dependencies Explained

#### Production Dependencies

- **@prisma/client (v5.7.0)**: Type-safe database client generated from Prisma schema. Provides TypeScript types for all models and database queries.

- **express (v4.18.2)**: Web framework for building REST API endpoints. Will handle HTTP requests for order and item management.

- **cors (v2.8.5)**: Cross-Origin Resource Sharing middleware. Enables frontend (different origin) to communicate with backend API.

- **dotenv (v16.3.1)**: Loads environment variables from .env file. Critical for securing DATABASE_URL and other configuration.

#### Development Dependencies

- **@types/express (v4.17.21)**: TypeScript type definitions for Express. Enables type-safe Express code.

- **@types/cors (v2.8.17)**: TypeScript type definitions for CORS middleware.

- **@types/node (v20.10.5)**: TypeScript type definitions for Node.js built-in modules.

- **typescript (v5.3.3)**: TypeScript compiler for transpiling TS to JS.

- **ts-node (v10.9.2)**: Executes TypeScript files directly without pre-compilation. Used for scripts and seeding.

- **ts-node-dev (v2.0.0)**: Development server with hot-reload for TypeScript. Watches file changes and restarts server automatically.

- **prisma (v5.7.0)**: Prisma CLI for schema management, migrations, and client generation.

### Manual Setup Instructions

#### Step 1: Navigate to Backend Directory
```powershell
cd backend-node
```

#### Step 2: Install Dependencies
```powershell
npm install
```

#### Step 3: Configure Database Connection
Create a `.env` file in the `backend-node` directory:
```powershell
New-Item -ItemType File -Path ".env" -Force
```

Add your PostgreSQL connection string to `.env`:
```
DATABASE_URL="postgresql://username:password@localhost:5432/rainbow_automation?schema=public"
```

Replace:
- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password
- `localhost`: Your database host (use actual host if remote)
- `5432`: Your PostgreSQL port
- `rainbow_automation`: Your database name (create this database first in PostgreSQL)

#### Step 4: Generate Prisma Client
```powershell
npm run prisma:generate
```

This generates the TypeScript client based on your schema.

#### Step 5: Run Database Migration
```powershell
npm run prisma:migrate
```

You'll be prompted to name your migration. Enter a descriptive name like `init_schema`.

This creates the tables in PostgreSQL and generates the migration history.

#### Step 6: (Optional) Seed Initial Data
If you have a seed script in `prisma/seed.ts`:
```powershell
npm run prisma:seed
```

#### Step 7: Start Development Server
```powershell
npm run dev
```

This starts the Express server with hot-reload enabled.

#### Additional Useful Commands

- **View Database in Prisma Studio** (GUI):
  ```powershell
  npm run prisma:studio
  ```

- **Build for Production**:
  ```powershell
  npm run build
  ```

- **Start Production Server**:
  ```powershell
  npm start
  ```

- **Reset Database** (WARNING: Deletes all data):
  ```powershell
  npx prisma migrate reset
  ```

### TypeScript Configuration

The `tsconfig.json` is configured for enterprise-grade TypeScript development:

- **Target**: ES2022 for modern JavaScript features
- **Strict Mode**: Enabled for type safety
- **Source Maps**: Generated for debugging
- **Declaration Files**: Generated for library consumers
- **Unused Checks**: Enabled to catch dead code
- **Module Resolution**: Node.js style for compatibility

### Project Structure

```
backend-node/
├── prisma/
│   └── schema.prisma       # Database schema definition
├── src/                    # TypeScript source code (to be created)
│   └── index.ts           # Application entry point
├── dist/                   # Compiled JavaScript (generated)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── .env                   # Environment variables (create manually)
```

### Next Steps

After completing Phase 1 setup:
1. Create Express API endpoints in `src/index.ts`
2. Implement CRUD operations for Orders, Items, and OrderItems
3. Add validation middleware
4. Implement error handling
5. Set up authentication (future phase)
