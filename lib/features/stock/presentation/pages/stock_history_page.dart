import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';
import '../../domain/entities/item.dart';
import '../../../../core/utils/terminology.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class StockHistoryPage extends StatefulWidget {
  final Item item;

  const StockHistoryPage({super.key, required this.item});

  @override
  State<StockHistoryPage> createState() => _StockHistoryPageState();
}

class _StockHistoryPageState extends State<StockHistoryPage> {
  @override
  void initState() {
    super.initState();
    context.read<StockBloc>().add(LoadStockHistoryRequested(widget.item.id!));
  }
  @override
  Widget build(BuildContext context) {
    final settings = context.select((SettingsBloc bloc) => bloc.state.settings);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('${settings?.stockHistoryLabel ?? 'Stock History'}: ${widget.item.name}'),
      ),
      body: BlocBuilder<StockBloc, StockState>(
        builder: (context, state) {
          if (state is StockLoading) {
            return const InvifyLoadingIndicator(message: 'LOADING STOCK TIMELINE...');
          } else if (state is StockHistoryLoaded) {
            if (state.history.isEmpty) {
              return Center(child: Text(settings?.stockAdditionsLabel ?? 'No stock additions recorded yet.'));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: state.history.length,
              separatorBuilder: (ctx, i) => const Divider(),
              itemBuilder: (ctx, index) {
                final entry = state.history[index];
                return ListTile(
                  leading: entry.receiptImage != null && entry.receiptImage!.isNotEmpty
                      ? GestureDetector(
                          onTap: () => _showReceiptPhoto(context, entry),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: Image.memory(
                              Uint8List.fromList(entry.receiptImage!),
                              width: 40,
                              height: 40,
                              fit: BoxFit.cover,
                            ),
                          ),
                        )
                      : CircleAvatar(
                          backgroundColor: Colors.green[100],
                          child: const Icon(Icons.add, color: Colors.green),
                        ),
                  title: Row(
                    children: [
                      Text('+${entry.quantityAdded}', 
                           style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green)),
                      const Spacer(),
                      Text('${entry.quantityBefore} → ${entry.quantityAfter}',
                           style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                    ],
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (entry.supplierName != null && entry.supplierName!.isNotEmpty)
                        Text('Supplier: ${entry.supplierName!}'),
                      if (entry.receiptNumber != null && entry.receiptNumber!.isNotEmpty)
                        Text('Receipt: ${entry.receiptNumber!}'),
                      if (entry.trackingNumber != null && entry.trackingNumber!.isNotEmpty)
                        Text('Tracking: ${entry.trackingNumber!}'),
                      if (entry.remarks != null && entry.remarks!.isNotEmpty)
                        Text('Remarks: ${entry.remarks!}'),
                      Text(DateFormat('MMM dd, yyyy - hh:mm a').format(entry.dateAdded),
                           style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                  isThreeLine: true,
                );
              },
            );
          } else if (state is StockError) {
            return Center(child: Text(state.message));
          }
          return const SizedBox();
        },
      ),
    );
  }

  void _showReceiptPhoto(BuildContext context, StockHistoryEntry entry) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppBar(
              automaticallyImplyLeading: false,
              title: const Text('Receipt / stock photo'),
              actions: [
                IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
              ],
            ),
            Flexible(
              child: Image.memory(
                Uint8List.fromList(entry.receiptImage!),
                fit: BoxFit.contain,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
