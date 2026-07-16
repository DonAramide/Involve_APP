import { PoolClient } from 'pg';

export class InvoiceItemRepository {
  static async bulkUpsert(client: PoolClient, items: {
    id: string;
    invoiceId: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    type?: string;
  }[]) {
    if (!items || items.length === 0) return;

    // Use Postgres parameterized query with multiple values
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    items.forEach((item, index) => {
      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`);
      values.push(
        item.id,
        item.invoiceId,
        item.itemId,
        item.quantity,
        item.unitPrice,
        item.type || 'product'
      );
      paramIndex += 6;
    });

    const query = `
      INSERT INTO invoice_items (id, invoice_id, item_id, quantity, unit_price, type)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE 
      SET invoice_id = EXCLUDED.invoice_id,
          item_id = EXCLUDED.item_id,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          type = EXCLUDED.type
    `;
    
    await client.query(query, values);
  }
}
