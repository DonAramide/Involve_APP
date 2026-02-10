import 'package:drift/drift.dart';
import '../../../stock/data/datasources/app_database.dart';
import '../../domain/entities/invoice.dart';
import '../../domain/entities/item.dart';
import '../../domain/repositories/invoice_repository.dart';

class InvoiceRepositoryImpl implements InvoiceRepository {
  final AppDatabase db;

  InvoiceRepositoryImpl(this.db);

  @override
  Future<void> saveInvoice(Invoice invoice) async {
    await db.transaction(() async {
      final invoiceId = await db.into(db.invoices).insert(
            InvoicesCompanion.insert(
              invoiceNumber: invoice.invoiceNumber,
              dateCreated: Value(invoice.dateCreated),
              subtotal: invoice.subtotal,
              taxAmount: invoice.taxAmount,
              discountAmount: invoice.discountAmount,
              totalAmount: invoice.totalAmount,
              paymentStatus: invoice.paymentStatus,
            ),
          );

      for (final item in invoice.items) {
        await db.into(db.invoiceItems).insert(
              InvoiceItemsCompanion.insert(
                invoiceId: invoiceId,
                itemId: item.item.id!,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              ),
            );
      }
    });
  }

  @override
  Future<List<Invoice>> getAllInvoices() async {
    return _getInvoicesWithItems(db.select(db.invoices));
  }

  @override
  Future<List<Invoice>> getInvoicesByDateRange(DateTime start, DateTime end) async {
    final query = db.select(db.invoices)
      ..where((t) => t.dateCreated.isBetweenValues(start, end));
    return _getInvoicesWithItems(query);
  }

  Future<List<Invoice>> _getInvoicesWithItems(SimpleSelectStatement<dynamic, dynamic> query) async {
    final invoiceRows = await query.get();
    final List<Invoice> result = [];

    for (final row in invoiceRows) {
      final itemsQuery = db.select(db.invoiceItems).join([
        leftOuterJoin(db.items, db.items.id.equalsExp(db.invoiceItems.itemId)),
      ])..where(db.invoiceItems.invoiceId.equals(row.id));

      final itemRows = await itemsQuery.get();
      
      final invoiceItems = itemRows.map((itemRow) {
        final itemData = itemRow.readTable(db.items);
        final invoiceItemData = itemRow.readTable(db.invoiceItems);
        
        return InvoiceItem(
          id: invoiceItemData.id,
          item: Item(
            id: itemData.id,
            name: itemData.name,
            category: ItemCategory.values.byName(itemData.category),
            price: itemData.price,
            stockQty: itemData.stockQty,
          ),
          quantity: invoiceItemData.quantity,
          unitPrice: invoiceItemData.unitPrice,
        );
      }).toList();

      result.add(Invoice(
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        dateCreated: row.dateCreated,
        items: invoiceItems,
        subtotal: row.subtotal,
        taxAmount: row.taxAmount,
        discountAmount: row.discountAmount,
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
      ));
    }
    return result;
  }
}
