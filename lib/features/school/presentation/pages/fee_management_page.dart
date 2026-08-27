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
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class FeeManagementPage extends StatefulWidget {
  const FeeManagementPage({super.key});

  @override
  State<FeeManagementPage> createState() => _FeeManagementPageState();
}

class _FeeManagementPageState extends State<FeeManagementPage> {
  int? _selectedClassId;
  final List<Item> _selectedFees = [];
  bool _isGenerating = false;
  String _searchQuery = '';

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
                showFriendlyErrorSnackBar(context, state.error);
              }
            },
          ),
        ],
        child: BlocBuilder<SchoolBloc, SchoolState>(
          builder: (context, schoolState) {
            return BlocBuilder<StockBloc, StockState>(
              builder: (context, stockState) {
                if (schoolState.isLoading || stockState.isLoading) {
                  return const InvifyLoadingIndicator(message: 'LOADING FEE STRUCTURES...');
                }

                // Auto-select defaults if list is empty (first load)
                if (_selectedFees.isEmpty && stockState.items.isNotEmpty) {
                  _selectedFees.addAll(stockState.items.where((i) => i.isDefault));
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
                        items: schoolState.classes.map((c) {
                          final count = schoolState.students.where((s) => s.classId == c.id).length;
                          return DropdownMenuItem(value: c.id, child: Text('${c.name} ($count students)'));
                        }).toList(),
                        onChanged: (val) => setState(() => _selectedClassId = val),
                      ),
                      if (_selectedClassId != null) ...[
                        const SizedBox(height: 12),
                        Card(
                          elevation: 1,
                          color: Theme.of(context).primaryColor.withValues(alpha: 0.05),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: BorderSide(color: Theme.of(context).primaryColor.withValues(alpha: 0.2)),
                          ),
                          child: ListTile(
                            dense: true,
                            leading: Icon(Icons.people_outline, color: Theme.of(context).primaryColor),
                            title: Text(
                              'Students in ${schoolState.classes.firstWhere((c) => c.id == _selectedClassId, orElse: () => schoolState.classes.first).name}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Theme.of(context).primaryColor,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${schoolState.students.where((s) => s.classId == _selectedClassId).length}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),

                      // Fee Item Selector
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Select Fee Items (from Products/Services)', style: TextStyle(fontWeight: FontWeight.bold)),
                          if (stockState.items.isNotEmpty)
                            Text(
                              'Selected: ${_selectedFees.length}',
                              style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Search / Filter
                      if (stockState.items.isNotEmpty) ...[
                        TextField(
                          decoration: const InputDecoration(
                            hintText: 'Search fee items...',
                            prefixIcon: Icon(Icons.search, size: 20),
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          onChanged: (val) {
                            setState(() {
                              _searchQuery = val;
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                      ],

                      Expanded(
                        child: stockState.items.isEmpty 
                          ? const Center(child: Text('No items found. Add Fees in Fee Structure first.'))
                          : () {
                              final filteredItems = stockState.items.where((item) {
                                return item.name.toLowerCase().contains(_searchQuery.toLowerCase());
                              }).toList();
                              
                              if (filteredItems.isEmpty) {
                                return const Center(child: Text('No matching items found.'));
                              }
                              
                              return ListView.builder(
                                itemCount: filteredItems.length,
                                itemBuilder: (context, index) {
                                  final item = filteredItems[index];
                                  final isSelected = _selectedFees.any((f) => f.id == item.id);
                                  return CheckboxListTile(
                                    title: Row(
                                      children: [
                                        Text(item.name),
                                        if (item.isDefault) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.amber.withOpacity(0.2),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: Colors.amber[700]!, width: 0.5),
                                            ),
                                            child: Text(
                                              'DEFAULT',
                                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber[900]),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    subtitle: Text(CurrencyFormatter.formatWithSymbol(item.price, symbol: '₦')),
                                    secondary: IconButton(
                                      icon: Icon(
                                        item.isDefault ? Icons.star : Icons.star_border,
                                        color: item.isDefault ? Colors.amber[700] : Colors.grey,
                                        size: 20,
                                      ),
                                      onPressed: () {
                                        context.read<StockBloc>().add(ToggleItemDefaultEvent(item));
                                      },
                                      tooltip: 'Toggle Default Status',
                                    ),
                                    value: isSelected,
                                    onChanged: (val) {
                                      setState(() {
                                        if (val == true) _selectedFees.add(item);
                                        else _selectedFees.removeWhere((f) => f.id == item.id);
                                      });
                                    },
                                  );
                                },
                              );
                            }(),
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
                            ? const Text('GENERATING BILLS...', style: TextStyle(fontWeight: FontWeight.bold)) 
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

      Navigator.pop(context);
      context.read<SchoolBloc>().add(LoadSchoolData());
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Successfully generated ${studentsInClass.length} bills!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isGenerating = false);
    }
  }
}
