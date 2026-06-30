-- CreateTable
CREATE TABLE "item_master" (
    "id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "size" TEXT,
    "weight" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "po_number" TEXT,
    "po_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "customer_name" TEXT NOT NULL,
    "project_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
