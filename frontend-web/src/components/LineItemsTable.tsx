'use client';

import { Image as ImageIcon } from 'lucide-react';
import type { EnrichedLineItem } from '@/types/order';

interface LineItemsTableProps {
  items: EnrichedLineItem[];
  onItemChange: (index: number, field: string, value: string | number) => void;
}

export default function LineItemsTable({ items, onItemChange }: LineItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        No line items extracted yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2.5 font-medium">Description</th>
            <th className="px-3 py-2.5 font-medium">Stock Size</th>
            <th className="px-3 py-2.5 font-medium">Cut Length</th>
            <th className="px-3 py-2.5 font-medium">Weight</th>
            <th className="px-3 py-2.5 font-medium">Qty</th>
            <th className="px-3 py-2.5 font-medium">Unit</th>
            <th className="px-3 py-2.5 font-medium">Rate</th>
            <th className="px-3 py-2.5 font-medium">Cross-Section</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50">
              <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-700">
                {item.description}
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="text"
                  value={item.size ?? ''}
                  onChange={(e) => onItemChange(idx, 'size', e.target.value)}
                  className="w-20 rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  value={item.length ?? ''}
                  onChange={(e) => onItemChange(idx, 'length', parseFloat(e.target.value) || 0)}
                  className="w-20 rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  step="0.01"
                  value={item.weight ?? ''}
                  onChange={(e) => onItemChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                  className="w-20 rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) => onItemChange(idx, 'qty', parseInt(e.target.value, 10) || 0)}
                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) => onItemChange(idx, 'unit', e.target.value)}
                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </td>
              <td className="px-3 py-2.5">
                <input
                  type="number"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) => onItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-20 rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </td>
              <td className="px-3 py-2.5">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={`Cross-section for ${item.description}`}
                    className="h-12 w-12 rounded border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-slate-200 text-slate-300">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
