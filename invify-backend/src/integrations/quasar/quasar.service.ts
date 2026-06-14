// src/integrations/quasar/quasar.service.ts
import { QuasarClient } from "@iips/quasar-sdk";

/**
 * QuasarService acts as a clean abstraction over the official Quasar SDK.
 * Rule: This is the ONLY integration point for Quasar in the application.
 * Responsibility: SDK interaction only. No database or business logic.
 */
export class QuasarService {
  private client: QuasarClient;
  private webhookSecret: string;
  private apiKey: string;

  constructor(apiKey: string, webhookSecret: string = '') {
    // Initialize QuasarClient with tenant-specific API key
    this.client = new QuasarClient({ apiKey });
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
   * Creates a payment intent via the Quasar SDK.
   * Aligns with SDK method: payments.createIntent
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
      return await this.client.payments.createIntent({
        ...params,
        amount: params.amount.toString(),
        currency: params.currency || 'NGN'
      });
    } catch (error: any) {
      console.error('[QuasarSDK] createIntent failed:', error.message);
      throw error;
    }
  }

  /**
   * Verifies the HMAC signature of an incoming webhook payload.
   * Aligns with SDK method: webhooks.verifySignature
   */
  async verifyWebhookSignature(payload: string, signature: string) {
    try {
       // Validate that the request actually came from Quasar
       return this.client.webhooks.verifySignature(payload, signature, this.webhookSecret);
    } catch (error: any) {
      console.error('[QuasarSDK] Webhook signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Provisions a unique virtual account for an end user (child) under a counterparty (parent).
   * Aligns with SDK method: endUsers.createVirtualAccount
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
      return await this.client.endUsers.createVirtualAccount({
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
   * Aligns with SDK method: transfers.create
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
      return await this.client.transfers.create({
        ...params,
        amount: params.amount.toString(),
        currency: 'NGN'
      });
    } catch (error: any) {
      console.error('[QuasarSDK] initiateTransfer failed:', error.message);
      throw error;
    }
  }

  // Add more SDK proxies here as needed, following the client structure.
}
