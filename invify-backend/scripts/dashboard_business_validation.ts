import axios from 'axios';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.NODE_ENV = 'test';

const API_URL = process.env.API_URL || 'http://localhost:3004';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!; // use service role key for admin access

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runParityTest() {
  console.log('--- RC2.5.1D Transport Parity Test ---');
  
  const tenantId = 'TENANT-001'; // Ensure this tenant exists or use a known test tenant
  const deviceId = 'SYNC-PARITY-DEVICE';
  
  const syncInvoiceId = randomUUID();
  const restInvoiceId = randomUUID();
  const customerId = randomUUID();
  
  const baseInvoicePayload = {
    customerId: customerId,
    customerName: 'Parity Test Customer',
    subtotal: 1000,
    taxAmount: 100,
    discountAmount: 0,
    totalAmount: 1100,
    amountPaid: 0,
    balanceAmount: 1100,
    paymentStatus: 'Unpaid',
    paymentMethod: 'Transfer',
    dateCreated: new Date().toISOString(),
    items: [
      {
        itemId: randomUUID(),
        quantity: 2,
        unitPrice: 500,
        type: 'product'
      }
    ]
  };

  // Log in as super admin to get a token for endpoints (if needed)
  let token = 'mocked-offline-token';
  // Alternatively, just pass headers for local testing if offline auth is bypassed
  try {
    console.log('1. Path A: Submitting via Sync Outbox Handler (Flutter POS simulation)');
    const syncPayload = {
      ...baseInvoicePayload,
      syncId: syncInvoiceId,
      invoiceNumber: `INV-SYNC-${Date.now()}`,
      items: baseInvoicePayload.items.map(item => ({ ...item, syncId: randomUUID() }))
    };
    
    // Simulate Sync Outbox (which delegates to InvoiceFacade)
    const { InvoiceFacade } = require('../src/facades/invoice.facade');
    await InvoiceFacade.createInvoice(
      syncPayload,
      { tenantId, deviceId },
      randomUUID(),
      randomUUID()
    );
    
    console.log('2. Path B: Submitting via REST Wrapper (Dashboard simulation)');
    const restPayload = {
      ...baseInvoicePayload,
      syncId: restInvoiceId,
      invoiceNumber: `INV-REST-${Date.now()}`,
      items: baseInvoicePayload.items.map(item => ({ ...item, syncId: randomUUID() }))
    };
    
    // Simulate REST API Request
    const { InvoiceController } = require('../src/controllers/invoice.controller');
    const mockReq = {
      user: { tenantId },
      headers: { 'x-device-id': 'dashboard', 'x-idempotency-key': randomUUID() },
      body: restPayload,
      correlationId: randomUUID()
    };
    const mockRes = {
      status: (code: number) => ({ json: (data: any) => { console.log(`REST Response [${code}]:`, data); } })
    };
    await InvoiceController.createInvoice(mockReq as any, mockRes as any);
    
    console.log('Waiting for background processing (2 seconds)...');
    await sleep(2000);
    
    console.log('\n--- VERIFICATION ---');
    
    // DB Checks
    const { data: invSync } = await supabase.from('invoices').select('*').eq('id', syncInvoiceId).single();
    const { data: invRest } = await supabase.from('invoices').select('*').eq('id', restInvoiceId).single();
    
    console.log(`[Invoice Row] Sync: ${invSync ? 'FOUND' : 'MISSING'} | REST: ${invRest ? 'FOUND' : 'MISSING'}`);
    
    const { data: itemsSync } = await supabase.from('invoice_items').select('*').eq('invoice_id', syncInvoiceId);
    const { data: itemsRest } = await supabase.from('invoice_items').select('*').eq('invoice_id', restInvoiceId);
    
    console.log(`[Invoice Items] Sync: ${itemsSync?.length || 0} | REST: ${itemsRest?.length || 0}`);
    
    const { data: ledgerSync } = await supabase.from('ledger_entries').select('*').eq('reference', syncInvoiceId);
    const { data: ledgerRest } = await supabase.from('ledger_entries').select('*').eq('reference', restInvoiceId);
    
    console.log(`[Ledger Entries] Sync: ${ledgerSync?.length || 0} | REST: ${ledgerRest?.length || 0}`);
    
    // Now verify the Payment API works
    console.log('\n3. Testing Payment API on REST Invoice...');
    const mockPayReq = {
      user: { tenantId, email: 'admin@test.com', name: 'Admin' },
      headers: {},
      params: { id: restInvoiceId },
      socket: { remoteAddress: '127.0.0.1' },
      body: { amount: 1100, paymentMethod: 'Bank Transfer' }
    };
    await InvoiceController.recordPayment(mockPayReq as any, mockRes as any);
    
    console.log('Waiting for payment processing (1 sec)...');
    await sleep(1000);
    
    const { data: paidInvRest } = await supabase.from('invoices').select('*').eq('id', restInvoiceId).single();
    console.log(`[REST Invoice Status After Payment] Paid: ${paidInvRest?.amount_paid} / Balance: ${paidInvRest?.balance_amount} / Status: ${paidInvRest?.payment_status}`);
    
    const { data: auditLogs } = await supabase.from('audit_logs_v2').select('*').eq('target', restInvoiceId);
    console.log(`[Audit Logs for Payment] Count: ${auditLogs?.length || 0}`);
    
    console.log('\nParity Check Complete. If all rows are FOUND and counts are equal, Transport Parity is confirmed!');
    
  } catch (err: any) {
    console.error('Validation failed!', err);
  }
}

runParityTest();
