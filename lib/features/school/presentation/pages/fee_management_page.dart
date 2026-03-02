import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/repositories/school_repository.dart';
import '../../../invoicing/domain/entities/invoice.dart';
import '../../../invoicing/domain/repositories/invoice_repository.dart';
import '../../../invoicing/domain/services/invoice_calculation_service.dart';
import '../../../stock/domain/entities/item.dart';
import '../../../../core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';

class FeeManagementPage extends StatefulWidget {
  const FeeManagementPage({super.key});

  @override
  State<FeeManagementPage> createState() => _FeeManagementPageState();
}

class _FeeManagementPageState extends State<FeeManagementPage> {
  int? _selectedClassId;
  final List<Item> _selectedFees = [];
  bool _isGenerating = false;

  @override
  void initState() {
    super.initState();
    // Ensure school fees/items are loaded
    context.read<StockBloc>().add(LoadItems(businessMode: 'school'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('FEE MANAGEMENT'),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.cyan[700]!, Colors.cyan[900]!],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        foregroundColor: Colors.white,
      ),
      body: MultiBlocListener(
        listeners: [
          BlocListener<SchoolBloc, SchoolState>(
            listener: (context, state) {
              if (state.error != null) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error!), backgroundColor: Colors.red));
              }
            },
          ),
        ],
        child: BlocBuilder<SchoolBloc, SchoolState>(
          builder: (context, schoolState) {
            return BlocBuilder<StockBloc, StockState>(
              builder: (context, stockState) {
                if (schoolState.isLoading || stockState.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                return Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Generate Term Bills', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      const Text('Select a class and fee items to generate invoices for all students in that class.'),
                      const SizedBox(height: 24),
                      
                      // Class Selector
                      DropdownButtonFormField<int>(
                        decoration: const InputDecoration(labelText: 'Target Class', border: OutlineInputBorder()),
                        value: _selectedClassId,
                        items: schoolState.classes.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                        onChanged: (val) => setState(() => _selectedClassId = val),
                      ),
                      const SizedBox(height: 16),

                      // Fee Item Selector
                      const Text('Select Fee Items (from Products/Services)', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Expanded(
                        child: stockState.items.isEmpty 
                          ? const Center(child: Text('No items found. Add Fees in Fee Structure first.'))
                          : ListView.builder(
                              itemCount: stockState.items.length,
                              itemBuilder: (context, index) {
                                final item = stockState.items[index];
                                final isSelected = _selectedFees.any((f) => f.id == item.id);
                                return CheckboxListTile(
                                  title: Text(item.name),
                                  subtitle: Text(CurrencyFormatter.formatWithSymbol(item.price, symbol: '₦')),
                                  value: isSelected,
                                  onChanged: (val) {
                                    setState(() {
                                      if (val == true) _selectedFees.add(item);
                                      else _selectedFees.removeWhere((f) => f.id == item.id);
                                    });
                                  },
                                );
                              },
                            ),
                      ),

                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: (_selectedClassId == null || _selectedFees.isEmpty || _isGenerating) 
                            ? null 
                            : () => _generateBills(context, schoolState),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.cyan[700],
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isGenerating 
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                            : const Text('GENERATE BILLS FOR CLASS', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Future<void> _generateBills(BuildContext context, SchoolState schoolState) async {
    final studentsInClass = schoolState.students.where((s) => s.classId == _selectedClassId).toList();
    
    if (studentsInClass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No students found in selected class.')));
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Generate Bills?'),
        content: Text('This will create invoices for ${studentsInClass.length} students. Total per student: ${CurrencyFormatter.formatWithSymbol(_selectedFees.fold(0, (sum, f) => sum + f.price.toInt()), symbol: '₦')}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('GENERATE')),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isGenerating = true);

    try {
      final invoiceRepo = context.read<InvoiceRepository>();
      final calcService = InvoiceCalculationService();
      final activeYear = schoolState.activeYear;
      final activeTerm = schoolState.terms.where((t) => t.isActive).firstOrNull ?? schoolState.terms.firstOrNull;

      for (final student in studentsInClass) {
        final List<InvoiceItem> items = _selectedFees.map((f) => InvoiceItem(
          item: f,
          quantity: 1,
          unitPrice: f.price,
          type: f.type,
        )).toList();

        // Carry Forward Logic
        if (student.balance > 0) {
          final balanceItem = Item(
            id: -1,
            name: 'Previous Term Balance',
            price: student.balance,
            category: ItemCategory.service,
            type: 'service',
            stockQty: 0,
          );
          items.add(InvoiceItem(
            item: balanceItem,
            quantity: 1,
            unitPrice: student.balance,
            type: 'service',
          ));
        }

        final subtotal = calcService.calculateSubtotal(items);
        final total = subtotal; // Simplicity: No tax/discount for auto bills for now

        final invoice = Invoice(
          invoiceNumber: 'BILL-${student.admissionNumber ?? student.id}-${DateTime.now().millisecondsSinceEpoch}',
          dateCreated: DateTime.now(),
          items: items,
          subtotal: subtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: total,
          paymentStatus: 'Unpaid',
          amountPaid: 0,
          balanceAmount: total,
          customerName: student.fullName,
          customerPhone: student.parentPhone,
          businessMode: 'school',
          studentId: student.id,
          classId: student.classId,
          termId: activeTerm?.id,
          academicYearId: activeYear?.id,
          admissionNumber: student.admissionNumber,
          className: schoolState.classes.firstWhere((c) => c.id == student.classId, orElse: () => schoolState.classes.first).name,
          termName: activeTerm?.name,
          academicYearName: activeYear?.name,
          studentImage: student.image,
        );

        await invoiceRepo.saveInvoice(invoice);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Successfully generated ${studentsInClass.length} bills!')),
      );
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isGenerating = false);
    }
  }
}
