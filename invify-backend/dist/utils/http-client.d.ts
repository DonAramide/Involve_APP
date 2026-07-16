import { AxiosRequestConfig, AxiosResponse } from 'axios';
export interface EnterpriseClientConfig extends AxiosRequestConfig {
    providerName?: string;
    correlationId?: string;
    maxRetries?: number;
}
export declare class EnterpriseHttpClient {
    private instance;
    private providerName;
    constructor(config: EnterpriseClientConfig);
    private onCircuitBreakerSuccess;
    private onCircuitBreakerFailure;
    private logObservability;
    get<T = any>(url: string, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: EnterpriseClientConfig): Promise<AxiosResponse<T>>;
    request<T = any>(config: EnterpriseClientConfig): Promise<AxiosResponse<T>>;
}
