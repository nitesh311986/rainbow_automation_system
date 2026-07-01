'use client';

import { useState, useCallback, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import type { EnrichedPurchaseOrder } from '@/types/order';

interface FileUploaderProps {
  onExtracted: (data: EnrichedPurchaseOrder) => void;
}

export default function FileUploader({ onExtracted }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setError('Only PDF files are supported.');
        return;
      }

      setError(null);
      setFileName(file.name);
      setIsProcessing(true);

      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);

      try {
        const response = await ordersApi.processExtract(file);
        onExtracted(response.data as EnrichedPurchaseOrder);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to process document. Please try again.';
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onExtracted]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [pdfUrl]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center
          rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200
          ${isDragging
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />
        <UploadCloud
          className={`mb-3 h-12 w-12 ${isDragging ? 'text-brand-500' : 'text-slate-400'}`}
        />
        <p className="text-sm font-medium text-slate-700">
          {isDragging ? 'Drop your PDF here' : 'Drag & drop a purchase order PDF'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          or click to browse files
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center gap-3 rounded-lg bg-brand-50 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <div>
            <p className="text-sm font-medium text-brand-800">
              Extracting document data…
            </p>
            <p className="text-xs text-brand-600">
              Sending to parser and enriching with item master data.
            </p>
          </div>
        </div>
      )}

      {/* PDF Preview */}
      {pdfUrl && (
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="truncate">{fileName}</span>
            </div>
            <button
              onClick={clearFile}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-b-xl bg-slate-800">
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              className="h-full w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
