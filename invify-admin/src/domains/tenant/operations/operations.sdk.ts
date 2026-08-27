import axios from 'axios';
import { resolveApiBaseUrl } from '../../../config/env';
const api = axios.create({ baseURL: resolveApiBaseUrl() });

export interface OperationsResponse<T> {
  success: boolean;
  data: T | null;
  meta: {
    requestId: string;
    timestamp: string;
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
    [key: string]: any;
  };
  links?: any;
  error?: any;
}

export class OperationsSDK {
  static async get<T>(path: string, params?: any): Promise<OperationsResponse<T>> {
    const response = await api.get<OperationsResponse<T>>(`/api/v1${path}`, { params });
    return response.data;
  }

  static async post<T>(path: string, data?: any): Promise<OperationsResponse<T>> {
    const response = await api.post<OperationsResponse<T>>(`/api/v1${path}`, data);
    return response.data;
  }

  static async put<T>(path: string, data?: any): Promise<OperationsResponse<T>> {
    const response = await api.put<OperationsResponse<T>>(`/api/v1${path}`, data);
    return response.data;
  }

  static async delete<T>(path: string): Promise<OperationsResponse<T>> {
    const response = await api.delete<OperationsResponse<T>>(`/api/v1${path}`);
    return response.data;
  }
}
