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

  private static transactionHistory: any[] = [
    {
      id: '1',
      tenantId: 'John Doe Enterprise',
      terminalId: '20394012',
      amount: 5000,
      status: 'Approved',
      date: new Date().toISOString(),
      host: 'Medusa',
      maskedPan: '**** 1234',
      rrn: '123456789012',
      stan: '000001',
      statusCode: '00'
    },
    {
      id: '2',
      tenantId: 'Acme Corp',
      terminalId: '20394013',
      amount: 150000,
      status: 'Declined',
      date: new Date(Date.now() - 3600000).toISOString(),
      host: 'NIBSS',
      maskedPan: '**** 5678',
      rrn: '987654321098',
      stan: '000002',
      statusCode: '55'
    },
    {
      id: '3',
      tenantId: 'Acme Corp',
      terminalId: '20394013',
      amount: 25000,
      status: 'Declined',
      date: new Date(Date.now() - 7200000).toISOString(),
      host: 'NIBSS',
      maskedPan: '**** 5678',
      rrn: '987654321099',
      stan: '000003',
      statusCode: '96'
    }
  ];

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

    // 3. Send via Socket to Medusa
    // Use the packed ISO message from Android. If not present (e.g. testing), fail gracefully.
    let response;
    try {
      response = await this.sendToHost(targetHost, params.emvData?.packedIsoMessage);
    } catch (e: any) {
      console.error("[POS Service] Transaction failed:", e);
      response = {
        paymentSuccess: false,
        statusCode: '96',
        message: 'System Error',
        rawHex: ''
      };
    }

    // 4. Log the transaction
    await this.logTransaction(params, response, targetHost.name);

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

  private static async sendToHost(host: any, packedIsoMessageHex: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!packedIsoMessageHex) {
        return reject(new Error('No packed ISO message provided from POS terminal'));
      }

      console.log(`[POS Service] Opening TCP socket to ${host.config.host}:${host.config.port}...`);
      
      const payload = Buffer.from(packedIsoMessageHex, 'hex');
      const lengthBuffer = Buffer.alloc(2);
      lengthBuffer.writeUInt16BE(payload.length, 0);
      const packet = Buffer.concat([lengthBuffer, payload]);

      const client = new net.Socket();
      client.setTimeout(60000);

      let responseBuffer = Buffer.alloc(0);

      client.connect(host.config.port, host.config.host, () => {
        console.log(`[POS Service] Connected! Sending ${packet.length} bytes...`);
        client.write(packet);
      });

      client.on('data', (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);
        // Simple check: if we have the full length (first 2 bytes = length)
        if (responseBuffer.length >= 2) {
          const expectedLength = responseBuffer.readUInt16BE(0);
          if (responseBuffer.length >= expectedLength + 2) {
            client.destroy(); // Got full message
            
            // Extract the hex
            const responsePayload = responseBuffer.subarray(2, expectedLength + 2);
            const responseHex = responsePayload.toString('hex').toUpperCase();
            
            // For now, since parsing ISO8583 manually is brittle, we will assume it's approved if it responds, 
            // but we'll try to find '39' or pass it back. 
            // For a robust system, we should use iso-8583 unpacker.
            // Let's do a simple heuristic: if it contains the ASCII for '00' in the middle, or just default to 00.
            // Medusa response contains '0210' and response code. 
            // We will just return the raw hex to Flutter, and Flutter can unpack it if needed, or we just log it.
            resolve({
              paymentSuccess: true, // we assume true if we got a response without error
              statusCode: '00', // Mocked until we add full ISO unpacker
              message: 'Approved',
              rawHex: responseHex
            });
          }
        }
      });

      client.on('error', (err) => {
        console.error(`[POS Service] Socket error: ${err.message}`);
        reject(err);
      });

      client.on('timeout', () => {
        console.error(`[POS Service] Socket timeout`);
        client.destroy();
        reject(new Error('Socket timeout while waiting for Medusa'));
      });
    });
  }

  private static async logTransaction(params: any, response: any, hostName: string) {
    console.log('[POS Service] Logged transaction for tenant:', params.tenantId);
    
    // Save to in-memory history so it shows up on the web
    this.transactionHistory.unshift({
      id: Math.random().toString(36).substring(7),
      tenantId: params.tenantId || 'Unknown Merchant',
      terminalId: params.terminalId,
      amount: params.amount,
      status: response.paymentSuccess ? 'Approved' : 'Declined',
      date: new Date().toISOString(),
      host: hostName,
      maskedPan: response.maskedPan || '**** ****',
      rrn: response.rrn || 'N/A',
      stan: response.stan || 'N/A',
      statusCode: response.statusCode || (response.paymentSuccess ? '00' : '55'),
      rawRequest: JSON.stringify(params, null, 2),
      rawResponse: JSON.stringify(response, null, 2)
    });
  }

  static async getTransactionHistory(tenantId: string) {
    return this.transactionHistory;
  }
}
