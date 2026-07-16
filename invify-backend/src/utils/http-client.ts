import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import crypto from 'crypto';

export interface EnterpriseClientConfig extends AxiosRequestConfig {
  providerName?: string;
  correlationId?: string;
  maxRetries?: number;
}

const TRANSIENT_STATUSES = [408, 429, 500, 502, 503, 504];

export class EnterpriseHttpClient {
  private instance: AxiosInstance;
  private providerName: string;

  constructor(config: EnterpriseClientConfig) {
    this.providerName = config.providerName || 'Unknown';
    this.instance = axios.create({
      ...config,
      timeout: config.timeout || parseInt(process.env.HTTP_TIMEOUT_MS || '10000', 10)
    });

    // Request Interceptor
    this.instance.interceptors.request.use((req) => {
      const cid = config.correlationId || req.headers['X-Correlation-Id'] || req.headers['x-correlation-id'] || crypto.randomUUID();
      req.headers['X-Correlation-Id'] = cid;
      (req as any).metadata = { startTime: Date.now(), retryCount: 0 };
      return req;
    });

    // Response Interceptor
    this.instance.interceptors.response.use(
      (response) => {
        this.logObservability(response.config as any, response.status);
        this.onCircuitBreakerSuccess(this.providerName);
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as any;
        if (!config || !config.metadata) {
          return Promise.reject(error);
        }

        const status = error.response?.status;
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network Error');
        const isTransient = status ? TRANSIENT_STATUSES.includes(status) : isTimeout;
        
        const maxRetries = config.maxRetries ?? 3;
        
        if (isTransient && config.metadata.retryCount < maxRetries) {
          config.metadata.retryCount++;
          const backoff = Math.pow(2, config.metadata.retryCount) * 1000;
          const jitter = Math.floor(Math.random() * 500);
          const delay = backoff + jitter;
          
          console.log(`[EnterpriseHttpClient] [${config.headers['X-Correlation-Id']}] Retrying ${this.providerName} (${config.url}) in ${delay}ms... (Attempt ${config.metadata.retryCount}/${maxRetries})`);
          
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.instance(config);
        }

        this.logObservability(config, status || 0, error);
        this.onCircuitBreakerFailure(this.providerName, error);
        
        return Promise.reject(error);
      }
    );
  }

  // Circuit Breaker Hooks (Extension Points)
  private onCircuitBreakerSuccess(provider: string) {
    // TODO: Reset circuit breaker failure count
  }

  private onCircuitBreakerFailure(provider: string, error: any) {
    // TODO: Increment circuit breaker failure count, trip if threshold exceeded
  }

  private logObservability(config: any, status: number, error?: any) {
    const latency = Date.now() - config.metadata.startTime;
    const correlationId = config.headers['X-Correlation-Id'] || config.headers['x-correlation-id'];
    
    console.log(`[Observability] Provider=${this.providerName} Endpoint=${config.url} CorrelationId=${correlationId} Latency=${latency}ms Status=${status} Retries=${config.metadata.retryCount} Reason=${error?.message || 'None'}`);
  }

  public async get<T = any>(url: string, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>> {
    return this.instance.get(url, config);
  }
  
  public async post<T = any>(url: string, data?: any, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, config);
  }

  public async put<T = any>(url: string, data?: any, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>> {
    return this.instance.put(url, data, config);
  }
  
  public async delete<T = any>(url: string, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete(url, config);
  }

  public async request<T = any>(config: EnterpriseClientConfig): Promise<AxiosResponse<T>> {
    return this.instance.request(config);
  }
}
