export interface MerchantWallet {
  merchantId: string;
  availableBalance: number;
  pendingBalance: number;
  settlementBalance: number;
  totalRevenue: number;
}

export interface MerchantInvoice {
  invoiceId: string;
  amount: number;
  vat: number;
  tax: number;
  status: 'PAID' | 'UNPAID';
  issuedAt: string;
}

export interface MerchantStatementItem {
  id: string;
  type: 'WITHDRAWAL' | 'DEPOSIT';
  amount: number;
  fee: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  timestamp: string;
}

export interface MerchantPortalSnapshot {
  wallet: MerchantWallet;
  invoices: MerchantInvoice[];
  recentStatements: MerchantStatementItem[];
  projectedRevenue30Days: number;
  capturedAt: string;
}

export class MerchantFinancialPortal {
  private static wallets: Map<string, MerchantWallet> = new Map();
  private static invoices: Map<string, MerchantInvoice[]> = new Map();
  private static statements: Map<string, MerchantStatementItem[]> = new Map();

  static clearState() {
    this.wallets.clear();
    this.invoices.clear();
    this.statements.clear();
  }

  static setupMockMerchant(merchantId: string) {
    this.wallets.set(merchantId, {
      merchantId,
      availableBalance: 8_500_000,
      pendingBalance: 1_200_000,
      settlementBalance: 3_500_000,
      totalRevenue: 15_000_000
    });

    this.invoices.set(merchantId, [
      {
        invoiceId: 'INV-001',
        amount: 500_000,
        vat: 37_500, // 7.5% VAT
        tax: 25_000, // 5% WHT Tax
        status: 'PAID',
        issuedAt: new Date(Date.now() - 5 * 24 * 3600_000).toISOString()
      },
      {
        invoiceId: 'INV-002',
        amount: 800_000,
        vat: 60_000,
        tax: 40_000,
        status: 'UNPAID',
        issuedAt: new Date(Date.now() - 1 * 24 * 3600_000).toISOString()
      }
    ]);

    this.statements.set(merchantId, [
      {
        id: 'ST-001',
        type: 'WITHDRAWAL',
        amount: 2_000_000,
        fee: 5_000,
        status: 'COMPLETED',
        timestamp: new Date(Date.now() - 3 * 24 * 3600_000).toISOString()
      },
      {
        id: 'ST-002',
        type: 'WITHDRAWAL',
        amount: 1_500_000,
        fee: 3_750,
        status: 'PENDING',
        timestamp: new Date(Date.now() - 1 * 24 * 3600_000).toISOString()
      }
    ]);
  }

  static getSnapshot(merchantId: string): MerchantPortalSnapshot {
    const wallet = this.wallets.get(merchantId) ?? {
      merchantId,
      availableBalance: 0,
      pendingBalance: 0,
      settlementBalance: 0,
      totalRevenue: 0
    };

    const invoices = this.invoices.get(merchantId) ?? [];
    const recentStatements = this.statements.get(merchantId) ?? [];

    return {
      wallet,
      invoices,
      recentStatements,
      projectedRevenue30Days: wallet.totalRevenue * 1.25, // Mock forecast multiplier
      capturedAt: new Date().toISOString()
    };
  }

  static requestWithdrawal(merchantId: string, amount: number): {
    success: boolean;
    statementItem?: MerchantStatementItem;
    errorMessage?: string;
  } {
    const wallet = this.wallets.get(merchantId);
    if (!wallet) {
      return { success: false, errorMessage: 'Merchant wallet not found' };
    }

    const fee = amount * 0.0025; // 0.25% fee
    const totalDeduction = amount + fee;

    if (wallet.availableBalance < totalDeduction) {
      return { success: false, errorMessage: 'Insufficient available balance' };
    }

    wallet.availableBalance -= totalDeduction;
    wallet.settlementBalance += amount;

    const newItem: MerchantStatementItem = {
      id: `ST-WTH-${Date.now()}`,
      type: 'WITHDRAWAL',
      amount,
      fee,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };

    const list = this.statements.get(merchantId) || [];
    list.unshift(newItem);
    this.statements.set(merchantId, list);

    return {
      success: true,
      statementItem: newItem
    };
  }

  static triggerExport(merchantId: string, format: 'PDF' | 'CSV' | 'EXCEL'): {
    downloadUrl: string;
    fileName: string;
    bytesCount: number;
  } {
    const timestamp = Date.now();
    return {
      downloadUrl: `https://api.invify.com/v1/downloads/statements/${merchantId}_${timestamp}.${format.toLowerCase()}`,
      fileName: `statement_${merchantId}_${timestamp}.${format.toLowerCase()}`,
      bytesCount: 45 * 1024 // 45 KB simulated
    };
  }
}
