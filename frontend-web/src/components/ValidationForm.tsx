'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Send,
  RotateCcw,
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import type {
  EnrichedPurchaseOrder,
  EnrichedLineItem,
  ConfirmOrderInput,
  ConfirmOrderResponse,
} from '@/types/order';
import LineItemsTable from './LineItemsTable';

interface ValidationFormProps {
  extractedData: EnrichedPurchaseOrder;
  onReset: () => void;
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

function FormField({ label, value, onChange, placeholder, type = 'text', required }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

export default function ValidationForm({ extractedData, onReset }: ValidationFormProps) {
  const [formData, setFormData] = useState<EnrichedPurchaseOrder>(extractedData);
  const [items, setItems] = useState<EnrichedLineItem[]>(extractedData.items);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResponse, setSuccessResponse] = useState<ConfirmOrderResponse | null>(null);

  const updateField = (field: keyof EnrichedPurchaseOrder, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!formData.customer_name.trim()) errors.push('Customer Name is required.');
    if (!customerEmail.trim()) errors.push('Customer Email is required.');
    if (!customerPhone.trim()) errors.push('Customer Phone is required.');
    if (items.length === 0) errors.push('At least one line item is required.');
    items.forEach((item, idx) => {
      if (!item.matched_item_id) errors.push(`Item ${idx + 1} has no matched item ID.`);
      if (item.qty <= 0) errors.push(`Item ${idx + 1} quantity must be greater than 0.`);
    });
    return errors;
  }, [formData, items, customerEmail, customerPhone]);

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      setSubmitError(validationErrors[0]);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: ConfirmOrderInput = {
      po_number: formData.po_number,
      po_date: formData.po_date,
      due_date: formData.due_date,
      customer_name: formData.customer_name,
      project_number: formData.project_number,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      items: items
        .filter((item) => item.matched_item_id)
        .map((item) => ({
          item_id: item.matched_item_id!,
          quantity: item.qty,
          unit: item.unit,
          price: item.rate,
        })),
    };

    try {
      const response = await ordersApi.confirm(payload);
      setSuccessResponse(response.data as ConfirmOrderResponse);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to confirm order. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessResponse(null);
    setSubmitError(null);
    onReset();
  };

  if (successResponse) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Order Confirmed</h3>
          <p className="mt-1 text-sm text-slate-500">
            Order <span className="font-mono font-medium text-brand-600">{successResponse.order.order_no}</span> has been created successfully.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Customer</span>
            <span className="font-medium text-slate-700">{successResponse.order.customer_name}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Items</span>
            <span className="font-medium text-slate-700">{successResponse.order_items.length}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Status</span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {successResponse.order.status}
            </span>
          </div>
          <div className="mt-2 border-t border-slate-200 pt-2">
            <p className="text-xs text-slate-400">Notifications sent:</p>
            <div className="mt-1 flex gap-3">
              <span className={`text-xs ${successResponse.notifications.email.success ? 'text-green-600' : 'text-red-600'}`}>
                Email: {successResponse.notifications.email.success ? 'Sent' : 'Failed'}
              </span>
              <span className={`text-xs ${successResponse.notifications.whatsapp.success ? 'text-green-600' : 'text-red-600'}`}>
                WhatsApp: {successResponse.notifications.whatsapp.success ? 'Sent' : 'Failed'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <RotateCcw className="h-4 w-4" />
          Process New Order
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto scrollbar-thin">
      {/* Header Fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Customer Name"
          value={formData.customer_name}
          onChange={(v) => updateField('customer_name', v)}
          required
        />
        <FormField
          label="PO Number"
          value={formData.po_number}
          onChange={(v) => updateField('po_number', v)}
        />
        <FormField
          label="PO Date"
          type="date"
          value={formData.po_date ? formData.po_date.split('T')[0] : ''}
          onChange={(v) => updateField('po_date', v)}
        />
        <FormField
          label="Due Date"
          type="date"
          value={formData.due_date ? formData.due_date.split('T')[0] : ''}
          onChange={(v) => updateField('due_date', v)}
        />
        <FormField
          label="Project Number"
          value={formData.project_number}
          onChange={(v) => updateField('project_number', v)}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Email"
            type="email"
            value={customerEmail}
            onChange={setCustomerEmail}
            placeholder="customer@email.com"
            required
          />
          <FormField
            label="Phone"
            type="tel"
            value={customerPhone}
            onChange={setCustomerPhone}
            placeholder="+91..."
            required
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">
          Line Items ({items.length})
        </h4>
        <LineItemsTable items={items} onItemChange={updateItem} />
      </div>

      {/* Validation Summary */}
      {validationErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{validationErrors.length} validation issue(s):</p>
            <ul className="mt-1 list-inside list-disc">
              {validationErrors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {validationErrors.length > 3 && (
                <li>...and {validationErrors.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Submit Error */}
      {submitError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-auto pt-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || validationErrors.length > 0}
          className={`
            flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all
            ${isSubmitting || validationErrors.length > 0
              ? 'cursor-not-allowed bg-slate-200 text-slate-400'
              : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.99]'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirming Order…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Confirm Order
            </>
          )}
        </button>
      </div>
    </div>
  );
}
