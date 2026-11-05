"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantFinancialPortal = void 0;
class MerchantFinancialPortal {
    static wallets = new Map();
    static invoices = new Map();
    static statements = new Map();
    static clearState() {
        this.wallets.clear();
        this.invoices.clear();
        this.statements.clear();
    }
    static setupMockMerchant(merchantId) {
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
    static getSnapshot(merchantId) {
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
    static requestWithdrawal(merchantId, amount) {
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
        const newItem = {
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
    static triggerExport(merchantId, format) {
        const timestamp = Date.now();
        return {
            downloadUrl: `https://api.invify.com/v1/downloads/statements/${merchantId}_${timestamp}.${format.toLowerCase()}`,
            fileName: `statement_${merchantId}_${timestamp}.${format.toLowerCase()}`,
            bytesCount: 45 * 1024 // 45 KB simulated
        };
    }
}
exports.MerchantFinancialPortal = MerchantFinancialPortal;
//# sourceMappingURL=MerchantFinancialPortal.js.map