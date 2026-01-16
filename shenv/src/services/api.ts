/**
 * API Client for Shenv Backend
 */

import axios from 'axios';
import type {
  SheetsListResponse,
  SheetDetailsResponse,
  SheetsQueryParams,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

/**
 * Fetch list of sheets with pagination and search
 */
export async function fetchSheets(
  params: SheetsQueryParams = {}
): Promise<SheetsListResponse> {
  const response = await apiClient.get<SheetsListResponse>('/api/sheets', {
    params,
  });
  return response.data;
}

/**
 * Fetch details for a specific sheet
 */
export async function fetchSheetDetails(
  sheetId: string
): Promise<SheetDetailsResponse> {
  const response = await apiClient.get<SheetDetailsResponse>(
    `/api/sheets/${sheetId}`
  );
  return response.data;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ ok: boolean }> {
  const response = await apiClient.get<{ ok: boolean }>('/health');
  return response.data;
}

/**
 * Auth API
 */
export const authApi = {
  signup: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/signup', { email, password });
    return response.data;
  },

  signin: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/signin', { email, password });
    return response.data;
  },
};

/**
 * Service Account API
 */
export const serviceAccountApi = {
  upload: async (serviceAccountJson: any) => {
    const response = await apiClient.post('/service-account/upload', serviceAccountJson);
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get('/service-account/status');
    return response.data;
  },

  delete: async () => {
    const response = await apiClient.delete('/service-account');
    return response.data;
  },
};
