// src/integrations/quasar/quasar.service.ts
import { QuasarPaymentsClient } from './quasar-payments.client';
import * as crypto from 'crypto';

/**
 * QuasarService acts as a clean abstraction over the official Quasar API.
 * Rule: This is the ONLY integration point for Quasar in the application.
 * Responsibility: API wrapper interaction only. No database or business logic.
 */
export class QuasarService {
  private client: QuasarPaymentsClient;
  private webhookSecret: string;
  private apiKey: string;

  constructor(apiKey: string, webhookSecret: string = '') {
    // Initialize QuasarPaymentsClient with tenant-specific API key
    this.client = new QuasarPaymentsClient(apiKey);
    this.webhookSecret = webhookSecret;
    this.apiKey = apiKey;
  }

  /**
   * Sends MPOS transaction backup to Quasar for device-processed transactions.
   */
  async sendMposBackup(payload: any): Promise<{ id: string; reference: string; status: string; replayed: boolean }> {
    const baseUrl = process.env.QUASAR_API_URL || 'https://api-quasar.iips.app';
    const res = await fetch(`${baseUrl}/api/v1/pos/transactionFromMpos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || body.responseCode !== "00") {
      throw new Error(body.responseMessage ?? `HTTP ${res.status}`);
    }
    return body.data?.data || body.data;
  }



  /**
   * Creates a payment intent via the Quasar API.
   */
  async createPaymentIntent(params: {
    amount: number;
    reference: string;
    currency?: string;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      console.log(`[QuasarSDK] Creating payment intent for ref: ${params.reference}`);
      return await this.client.createPaymentIntent({
        ...params,
        currency: params.currency || 'NGN'
      });
    } catch (error: any) {
      console.error('[QuasarSDK] createIntent failed:', error.message);
      throw error;
    }
  }

  /**
   * Verifies the HMAC signature of an incoming webhook payload.
   */
  async verifyWebhookSignature(payload: string, signature: string) {
    try {
      if (!signature || !this.webhookSecret) return false;
      const hash = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
      const normalized = signature.replace(/^sha256=/i, '').trim().toLowerCase();
      const expected = Buffer.from(hash, 'hex');
      const provided = Buffer.from(normalized, 'hex');
      if (expected.length !== provided.length || expected.length === 0) {
        return false;
      }
      return crypto.timingSafeEqual(expected, provided);
    } catch (error: any) {
      console.error('[QuasarSDK] Webhook signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Provisions a unique virtual account for an end user (child) under a counterparty (parent).
   */
  async createVirtualAccount(params: {
    childId: string;
    parentId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    parentShareBps?: number;
    metadata?: Record<string, any>;
  }) {
    try {
      console.log(`[QuasarSDK] Provisioning virtual account for child: ${params.childId}`);
      if (this.apiKey.startsWith('sk_test_')) {
        console.log('[QuasarSDK] Test API key detected. Routing to sandbox account generator...');
        const sandboxAccounts = await this.client.generateSandboxAccounts({
          accountName: `${params.firstName || 'User'} ${params.lastName || 'Account'}`,
          count: 1
        });
        
        if (!sandboxAccounts || sandboxAccounts.length === 0) {
          throw new Error('Sandbox account generation returned no accounts');
        }
        
        return {
          accountNumber: sandboxAccounts[0].accountNumber,
          bankName: sandboxAccounts[0].bankName,
          accountName: sandboxAccounts[0].accountName
        };
      }

      return await this.client.createVirtualAccount({
        ...params,
        firstName: params.firstName || 'User',
        lastName: params.lastName || 'Account',
        currency: 'NGN' // Defaulting to NGN for virtual accounts
      });
    } catch (error: any) {
      console.error('[QuasarSDK] createVirtualAccount failed:', error.message);
      throw error;
    }
  }

  /**
   * Initiates a fund transfer (payout) to an external bank.
   */
  async initiateTransfer(params: {
    amount: number;
    reference: string;
    destination: {
      account_number: string;
      bank_code: string;
      account_name: string;
    };
    metadata: {
      tenantId: string;
      schoolId: string;
      [key: string]: any;
    };
  }) {
    try {
      console.log(`[QuasarSDK] Initiating payout for tenant: ${params.metadata.tenantId}`);
      if (this.apiKey.startsWith('sk_test_')) {
        console.log('[QuasarSDK] Test API key detected. Routing to sandbox transfers...');
        return await this.client.createSandboxTransfer({
          ...params,
          currency: 'NGN'
        });
      }
      return await this.client.createTransfer({
        ...params,
        currency: 'NGN'
      });
    } catch (error: any) {
      console.error('[QuasarSDK] initiateTransfer failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetches supported banks for financial routing.
   * GET /financial-routing/banks
   */
  async getBanks(country: string = 'nigeria'): Promise<any[]> {
    try {
      const baseUrl = (process.env.QUASAR_BASE_URL || 'https://api-quasar.iips.app/api/v1').replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/financial-routing/banks?country=${country}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        }
      });
      const body = await res.json();
      if (!res.ok || body.responseCode !== "00") {
        throw new Error(body.responseMessage ?? `HTTP ${res.status}`);
      }
      return body.data;
    } catch (error: any) {
      console.error('[QuasarSDK] getBanks failed:', error.message);
      throw error;
    }
  }

  /**
   * Resolves destination account number + bank code to the registered account name.
   * POST /financial-routing/account-resolution
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<{ account_number: string; bank_code: string; account_name: string }> {
    try {
      const baseUrl = (process.env.QUASAR_BASE_URL || 'https://api-quasar.iips.app/api/v1').replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/financial-routing/account-resolution`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          account_number: accountNumber,
          bank_code: bankCode
        })
      });
      const body = await res.json();
      if (!res.ok || body.responseCode !== "00") {
        throw new Error(body.responseMessage ?? `HTTP ${res.status}`);
      }
      return body.data;
    } catch (error: any) {
      console.error('[QuasarSDK] resolveAccount failed:', error.message);
      throw error;
    }
  }
}
