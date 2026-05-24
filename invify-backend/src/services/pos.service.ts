import * as net from 'net';

export class PosService {
  // Simple mock or in-memory config for now. In a real scenario, this would come from the database.
  static routingConfig = {
    activeHost: 'medusa', // 'medusa' | 'nibss'
    medusa: {
      host: 'core.medusang.com', // or 52.209.119.78
      port: 8080,
      thresholdAmount: 0, // Route to Medusa if amount > threshold
      isActive: true
    },
    nibss: {
      host: 'nibss.example.com',
      port: 5000,
      thresholdAmount: 50000,
      isActive: true
    }
  };

  static async getRoutingConfig() {
    return this.routingConfig;
  }

  static async updateRoutingConfig(newConfig: any) {
    this.routingConfig = { ...this.routingConfig, ...newConfig };
    return this.routingConfig;
  }

  static async processTransaction(params: {
    tenantId: string;
    terminalId: string;
    amount: number;
    emvData: any;
  }) {
    // 1. Determine routing based on config and amount
    const targetHost = this.determineRoute(params.amount);

    console.log(`[POS Service] Routing transaction of ${params.amount} to ${targetHost.name}`);

    // 2. Build ISO-8583 Message
    // This is where we'd use iso-8583 package.
    // For now, we simulate the ISO builder and socket connection to not block execution without a real test environment.
    const isoMessage = this.buildIsoMessage(params);

    // 3. Send via Socket (Simulated for safety/lack of VPN)
    const response = await this.sendToHostSimulated(targetHost, isoMessage);

    // 4. Log the transaction to Supabase/DB
    await this.logTransaction(params, response);

    return response;
  }

  private static determineRoute(amount: number) {
    // Basic routing logic
    let route = this.routingConfig.activeHost === 'nibss' 
      ? { name: 'NIBSS', config: this.routingConfig.nibss }
      : { name: 'Medusa', config: this.routingConfig.medusa };

    // If the preferred route is inactive, try the fallback
    if (!route.config.isActive) {
      if (route.name === 'NIBSS' && this.routingConfig.medusa.isActive) {
        console.warn('[POS Service] NIBSS is inactive. Falling back to Medusa.');
        route = { name: 'Medusa', config: this.routingConfig.medusa };
      } else if (route.name === 'Medusa' && this.routingConfig.nibss.isActive) {
        console.warn('[POS Service] Medusa is inactive. Falling back to NIBSS.');
        route = { name: 'NIBSS', config: this.routingConfig.nibss };
      } else {
        throw new Error('All POS Gateway Hosts are currently inactive. Transaction cannot be routed.');
      }
    }

    return route;
  }

  private static buildIsoMessage(params: any) {
    // Logic to map EMV data to ISO8583 tags
    return {
      mti: '0200',
      2: params.emvData.cardNo,
      3: '000000',
      4: params.amount * 100, // Amount in minor units
      11: params.emvData.cardSequenceNumber || '000001',
      // ... mapping other EMV ICC data to field 55
      55: params.emvData.iccData,
    };
  }

  private static async sendToHostSimulated(host: any, isoMessage: any) {
    // Simulating socket delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate successful response from Medusa/NIBSS
    return {
      aid: isoMessage['55'] ? 'A0000000031010' : null,
      amount: (isoMessage['4'] / 100).toString(),
      cashbackAmount: '0.00',
      appLabel: 'VISA',
      authCode: '123456',
      cardExpireDate: '2612',
      cardHolderName: 'CUSTOMER',
      dateTime: new Date().toISOString(),
      maskedPan: '**** **** **** ' + (isoMessage['2']?.slice(-4) || '0000'),
      message: 'Approved',
      rrn: '123456789012',
      stan: isoMessage['11'],
      statusCode: '00',
      transactionType: 'PURCHASE',
      paymentSuccess: true
    };
  }

  private static async logTransaction(params: any, response: any) {
    // Here we would use supabase to log this into a 'pos_transactions' table
    console.log('[POS Service] Logged transaction for tenant:', params.tenantId);
  }

  static async getTransactionHistory(tenantId: string) {
    // Mock history
    return [
      {
        id: '1',
        tenantId: 'John Doe Enterprise', // Mock Business Owner
        terminalId: '20394012',
        amount: 5000,
        status: 'Approved',
        date: new Date().toISOString(),
        host: 'Medusa',
        maskedPan: '**** 1234',
        rrn: '123456789012',
        stan: '000001'
      },
      {
        id: '2',
        tenantId: 'Acme Corp',
        terminalId: '20394013',
        amount: 150000,
        status: 'Declined',
        date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        host: 'NIBSS',
        maskedPan: '**** 5678',
        rrn: '987654321098',
        stan: '000002'
      }
    ];
  }
}
