import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';
import '../../domain/entities/item.dart';

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
    return Scaffold(
      appBar: AppBar(
        title: Text('Stock History: ${widget.item.name}'),
      ),
      body: BlocBuilder<StockBloc, StockState>(
        builder: (context, state) {
          if (state is StockLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is StockHistoryLoaded) {
            if (state.history.isEmpty) {
              return const Center(child: Text('No stock additions recorded yet.'));
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: state.history.length,
              separatorBuilder: (ctx, i) => const Divider(),
              itemBuilder: (ctx, index) {
                final entry = state.history[index];
                return ListTile(
                  leading: CircleAvatar(
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
                      if (entry.remarks != null && entry.remarks!.isNotEmpty)
                        Text('Remarks: ${entry.remarks!}'),
                      Text(DateFormat('MMM dd, yyyy - hh:mm a').format(entry.dateAdded),
                           style: const TextStyle(fontSize: 12)),
                    ],
                  ),
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
}
