import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';
import '../../domain/entities/item.dart';
import '../../../../core/utils/terminology.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';

class StockHistoryPage extends StatefulWidget {
  final Item item;

  const StockHistoryPage({super.key, required this.item});

  @override
  State<StockHistoryPage> createState() => _StockHistoryPageState();
}

class _StockHistoryPageState extends State<StockHistoryPage> {
  DateTimeRange? _dateRange;
  String _supplierFilter = "";
  final TextEditingController _supplierController = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<StockBloc>().add(LoadStockHistoryRequested(widget.item.id!));
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.select((SettingsBloc bloc) => bloc.state.settings);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('${settings?.stockHistoryLabel ?? 'Stock History'}: ${widget.item.name}'),
      ),
      body: BlocBuilder<StockBloc, StockState>(
        builder: (context, state) {
          if (state is StockLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is StockHistoryLoaded) {
            // Apply filtering logic
            final filteredHistory = state.history.where((entry) {
              bool matchesSupplier = _supplierFilter.isEmpty || 
                  (entry.supplierName?.toLowerCase().contains(_supplierFilter.toLowerCase()) ?? false);
              
              bool matchesDate = true;
              if (_dateRange != null) {
                final date = DateTime(entry.dateAdded.year, entry.dateAdded.month, entry.dateAdded.day);
                matchesDate = date.isAtSameMomentAs(_dateRange!.start) ||
                    date.isAtSameMomentAs(_dateRange!.end) ||
                    (date.isAfter(_dateRange!.start) && date.isBefore(_dateRange!.end));
              }
              
              return matchesSupplier && matchesDate;
            }).toList();

            final int totalAdded = filteredHistory.fold(0, (sum, item) => sum + item.quantityAdded);

            return Column(
              children: [
                // Summary Card
                _buildSummaryCard(totalAdded, theme, settings),
                
                // Filters
                _buildFilterBar(context, theme),

                Expanded(
                  child: filteredHistory.isEmpty
                      ? Center(child: Text('No stock additions found for selected filters.'))
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredHistory.length,
                          separatorBuilder: (ctx, i) => const Divider(),
                          itemBuilder: (ctx, index) {
                            final entry = filteredHistory[index];
                            return _buildHistoryItem(entry, theme);
                          },
                        ),
                ),
              ],
            );
          } else if (state is StockError) {
            return Center(child: Text(state.message));
          }
          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildSummaryCard(int total, ThemeData theme, dynamic settings) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [theme.colorScheme.primary, theme.colorScheme.primary.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: theme.colorScheme.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'TOTAL ADDED STOCK',
            style: TextStyle(color: Colors.white.withOpacity(0.9), fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                total.toString(),
                style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 8),
              Text(
                'units',
                style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 16),
              ),
            ],
          ),
          if (_dateRange != null || _supplierFilter.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: Text(
                'Showing filtered results',
                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11, fontStyle: FontStyle.italic),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(BuildContext context, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _supplierController,
              decoration: InputDecoration(
                hintText: 'Search Supplier...',
                prefixIcon: const Icon(Icons.search, size: 20),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey.shade100,
              ),
              onChanged: (val) => setState(() => _supplierFilter = val),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filledTonal(
            onPressed: () async {
              final picked = await showDateRangePicker(
                context: context,
                firstDate: DateTime(2020),
                lastDate: DateTime.now(),
                initialDateRange: _dateRange,
              );
              if (picked != null) setState(() => _dateRange = picked);
            },
            icon: Icon(Icons.calendar_today, size: 20, color: _dateRange != null ? theme.colorScheme.primary : null),
          ),
          if (_dateRange != null || _supplierFilter.isNotEmpty)
            IconButton(
              onPressed: () {
                setState(() {
                  _dateRange = null;
                  _supplierFilter = "";
                  _supplierController.clear();
                });
              },
              icon: const Icon(Icons.clear_all, color: Colors.red),
              tooltip: 'Clear Filters',
            ),
        ],
      ),
    );
  }

  Widget _buildHistoryItem(StockHistoryEntry entry, ThemeData theme) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: Colors.green[50],
        child: const Icon(Icons.add, color: Colors.green),
      ),
      title: Row(
        children: [
          Text('+${entry.quantityAdded}', 
               style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green)),
          const Spacer(),
          Text('${entry.quantityBefore} → ${entry.quantityAfter}',
               style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        ],
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (entry.supplierName != null && entry.supplierName!.isNotEmpty)
              Row(
                children: [
                  const Icon(Icons.business, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text('Supplier: ${entry.supplierName!}', style: const TextStyle(fontWeight: FontWeight.w500)),
                ],
              ),
            if (entry.remarks != null && entry.remarks!.isNotEmpty)
              Text('Remarks: ${entry.remarks!}', style: const TextStyle(fontSize: 12)),
            Text(DateFormat('MMM dd, yyyy - hh:mm a').format(entry.dateAdded),
                 style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          ],
        ),
      ),
      trailing: entry.supplyInvoiceImage != null
          ? GestureDetector(
              onTap: () => _showImageDialog(entry.supplyInvoiceImage!, entry.supplierName ?? 'Invoice'),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.memory(entry.supplyInvoiceImage!, width: 40, height: 40, fit: BoxFit.cover),
              ),
            )
          : null,
    );
  }

  void _showImageDialog(Uint8List image, String title) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close, color: Colors.white)),
              ],
            ),
            Flexible(
              child: Container(
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: Colors.white),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.memory(image, fit: BoxFit.contain),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(title, 
                 textAlign: TextAlign.center,
                 style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16), // Bottom padding
          ],
        ),
      ),
    );
  }
}
