'use client';

import { useState } from 'react';
import { FileSearch, ClipboardList, Package } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import ValidationForm from '@/components/ValidationForm';
import type { EnrichedPurchaseOrder } from '@/types/order';

export default function OrdersPage() {
  const [extractedData, setExtractedData] = useState<EnrichedPurchaseOrder | null>(null);

  const handleExtracted = (data: EnrichedPurchaseOrder) => {
    setExtractedData(data);
  };

  const handleReset = () => {
    setExtractedData(null);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">
              Rainbow Automation
            </h1>
            <p className="text-xs text-slate-400">Order Intake Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
            ● System Online
          </span>
        </div>
      </header>

      {/* Dual-Pane Workspace */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* Left Pane — File Upload & PDF Preview */}
        <div className="flex w-[42%] min-w-[400px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
            <FileSearch className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-700">
              Document Intake
            </h2>
          </div>
          <div className="min-h-0 flex-1 p-4">
            <FileUploader onExtracted={handleExtracted} />
          </div>
        </div>

        {/* Right Pane — Validation Form */}
        <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
            <ClipboardList className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-700">
              Validation & Confirmation
            </h2>
          </div>
          <div className="min-h-0 flex-1 p-5">
            {extractedData ? (
              <ValidationForm
                extractedData={extractedData}
                onReset={handleReset}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <ClipboardList className="h-12 w-12 text-slate-200" />
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    Awaiting Document Extraction
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Upload a purchase order PDF to populate the validation form.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
