export interface EnrichedLineItem {
  description: string;
  qty: number;
  unit: string;
  rate: number;
  matched_item_id: string | null;
  image_url: string | null;
  size: string | null;
  weight: number | null;
  length: number | null;
}

export interface EnrichedPurchaseOrder {
  po_number: string;
  po_date: string;
  due_date: string;
  customer_name: string;
  project_number: string;
  items: EnrichedLineItem[];
}

export interface ConfirmOrderItemInput {
  item_id: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface ConfirmOrderInput {
  po_number: string;
  po_date: string;
  due_date: string;
  customer_name: string;
  project_number: string;
  customer_email: string;
  customer_phone: string;
  items: ConfirmOrderItemInput[];
}

export interface ConfirmOrderResponse {
  order: {
    id: string;
    order_no: string;
    order_date: string;
    po_number: string | null;
    po_date: string | null;
    due_date: string | null;
    customer_name: string;
    project_number: string | null;
    status: string;
  };
  order_items: Array<{
    id: string;
    order_id: string;
    item_id: string;
    quantity: number;
    unit: string;
    price: number;
  }>;
  notifications: {
    email: { success: boolean; provider: string; messageId: string };
    whatsapp: { success: boolean; provider: string; messageId: string };
  };
}
