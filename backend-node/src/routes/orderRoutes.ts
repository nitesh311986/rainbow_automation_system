import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { sendInvoiceEmail, sendWhatsAppMessage } from '../utils/notifications';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const PYTHON_PARSER_URL = process.env.PYTHON_PARSER_URL || 'http://localhost:8000/api/v1/parser/extract';

interface ParsedLineItem {
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

interface ParsedPurchaseOrder {
  po_number: string;
  po_date: string;
  due_date: string;
  customer_name: string;
  project_number: string;
  items: ParsedLineItem[];
}

interface EnrichedLineItem extends ParsedLineItem {
  matched_item_id: string | null;
  image_url: string | null;
  size: string | null;
  weight: number | null;
  length: number | null;
}

interface EnrichedPurchaseOrder {
  po_number: string;
  po_date: string;
  due_date: string;
  customer_name: string;
  project_number: string;
  items: EnrichedLineItem[];
}

router.post('/process-extract', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Provide a file in the "file" field.' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const pythonResponse = await axios.post<ParsedPurchaseOrder>(
      PYTHON_PARSER_URL,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000,
      }
    );

    const parsed: ParsedPurchaseOrder = pythonResponse.data;

    const enrichedItems: EnrichedLineItem[] = await Promise.all(
      parsed.items.map(async (item): Promise<EnrichedLineItem> => {
        const matchedItem = await prisma.itemMaster.findFirst({
          where: {
            item_name: {
              equals: item.description,
              mode: 'insensitive',
            },
          },
        });

        return {
          ...item,
          matched_item_id: matchedItem?.id ?? null,
          image_url: matchedItem?.image_url ?? null,
          size: matchedItem?.size ?? null,
          weight: matchedItem?.weight ?? null,
          length: matchedItem?.length ?? null,
        };
      })
    );

    const enriched: EnrichedPurchaseOrder = {
      po_number: parsed.po_number,
      po_date: parsed.po_date,
      due_date: parsed.due_date,
      customer_name: parsed.customer_name,
      project_number: parsed.project_number,
      items: enrichedItems,
    };

    return res.status(200).json(enriched);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Python parser request failed:', error.message);
      return res.status(502).json({
        error: 'Document parsing service unavailable.',
        detail: error.message,
      });
    }
    console.error('Process-extract error:', error);
    return res.status(500).json({
      error: 'Internal server error during extraction.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

interface ConfirmOrderItemInput {
  item_id: string;
  quantity: number;
  unit: string;
  price: number;
}

interface ConfirmOrderInput {
  po_number: string;
  po_date: string;
  due_date: string;
  customer_name: string;
  project_number: string;
  customer_email: string;
  customer_phone: string;
  items: ConfirmOrderItemInput[];
}

router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const body = req.body as ConfirmOrderInput;

    if (!body.customer_name || !body.customer_email || !body.customer_phone) {
      return res.status(400).json({
        error: 'Missing required fields: customer_name, customer_email, customer_phone are required.',
      });
    }

    if (!body.items || body.items.length === 0) {
      return res.status(400).json({ error: 'At least one order item is required.' });
    }

    for (const item of body.items) {
      if (!item.item_id || item.quantity <= 0 || item.price < 0) {
        return res.status(400).json({
          error: `Invalid item data: item_id is required, quantity must be > 0, price must be >= 0.`,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.order.findFirst({
        orderBy: { order_no: 'desc' },
      });

      let nextNumber = 1;
      if (lastOrder && lastOrder.order_no) {
        const match = lastOrder.order_no.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const orderNo = `ORD-${String(nextNumber).padStart(5, '0')}`;

      const order = await tx.order.create({
        data: {
          order_no: orderNo,
          order_date: new Date(),
          po_number: body.po_number || null,
          po_date: body.po_date ? new Date(body.po_date) : null,
          due_date: body.due_date ? new Date(body.due_date) : null,
          customer_name: body.customer_name,
          project_number: body.project_number || null,
          status: 'Pending',
        },
      });

      const orderItems = await Promise.all(
        body.items.map((item) =>
          tx.orderItem.create({
            data: {
              order_id: order.id,
              item_id: item.item_id,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
            },
          })
        )
      );

      return { order, orderItems };
    });

    const invoiceBody = [
      `Order Confirmation: ${result.order.order_no}`,
      `Customer: ${result.order.customer_name}`,
      `Date: ${result.order.order_date.toISOString()}`,
      `Items: ${result.orderItems.length}`,
    ].join('\n');

    const emailResult = await sendInvoiceEmail({
      to: body.customer_email,
      subject: `Order Confirmation — ${result.order.order_no}`,
      body: invoiceBody,
    });

    const whatsappResult = await sendWhatsAppMessage({
      to: body.customer_phone,
      message: `Your order ${result.order.order_no} has been confirmed. We will notify you on progress. — Rainbow Automation`,
    });

    return res.status(201).json({
      order: result.order,
      order_items: result.orderItems,
      notifications: {
        email: emailResult,
        whatsapp: whatsappResult,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error during order confirmation:', error.message);
      return res.status(400).json({
        error: 'Database operation failed.',
        code: error.code,
        detail: error.message,
      });
    }
    console.error('Confirm order error:', error);
    return res.status(500).json({
      error: 'Internal server error during order confirmation.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
