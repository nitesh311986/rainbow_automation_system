import axios from 'axios';
import type { ConfirmOrderInput } from '@/types/order';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ordersApi = {
  processExtract: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/orders/process-extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  confirm: (data: ConfirmOrderInput) => {
    return apiClient.post('/orders/confirm', data);
  },
};
