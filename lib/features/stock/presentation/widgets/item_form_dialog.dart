import 'package:flutter/material.dart';
import '../../../../core/utils/validators.dart';
import '../../domain/entities/item.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';

class ItemFormDialog extends StatefulWidget {
  final Item? item;
  final StockBloc stockBloc;

  const ItemFormDialog({super.key, this.item, required this.stockBloc});

  @override
  State<ItemFormDialog> createState() => _ItemFormDialogState();
}

class _ItemFormDialogState extends State<ItemFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late String _name;
  late double _price;
  late int _stockQty;
  late ItemCategory _category;

  @override
  void initState() {
    super.initState();
    _name = widget.item?.name ?? '';
    _price = widget.item?.price ?? 0.0;
    _stockQty = widget.item?.stockQty ?? 0;
    _category = widget.item?.category ?? ItemCategory.drink;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.item == null ? 'Add New Item' : 'Edit Item'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                initialValue: _name,
                decoration: const InputDecoration(labelText: 'Item Name'),
                onSaved: (val) => _name = val ?? '',
                validator: (val) => InputValidator.validateNotEmpty(val, 'Item Name'),
              ),
              DropdownButtonFormField<ItemCategory>(
                value: _category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: ItemCategory.values.map((cat) {
                  return DropdownMenuItem(value: cat, child: Text(cat.name.toUpperCase()));
                }).toList(),
                onChanged: (val) => setState(() => _category = val!),
              ),
              TextFormField(
                initialValue: _price.toString(),
                decoration: const InputDecoration(labelText: 'Price (\$)'),
                keyboardType: TextInputType.number,
                onSaved: (val) => _price = double.tryParse(val ?? '0') ?? 0.0,
                validator: (val) => InputValidator.validateNumber(val, 'Price'),
              ),
              TextFormField(
                initialValue: _stockQty.toString(),
                decoration: const InputDecoration(labelText: 'Stock Quantity'),
                keyboardType: TextInputType.number,
                onSaved: (val) => _stockQty = int.tryParse(val ?? '0') ?? 0,
                validator: (val) => InputValidator.validateNumber(val, 'Stock', allowDecimal: false),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: _submit,
          child: Text(widget.item == null ? 'ADD' : 'SAVE'),
        ),
      ],
    );
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      final newItem = Item(
        id: widget.item?.id,
        name: _name,
        category: _category,
        price: _price,
        stockQty: _stockQty,
      );

      if (widget.item == null) {
        widget.stockBloc.add(AddStockItem(newItem));
      } else {
        widget.stockBloc.add(UpdateStockItem(newItem));
      }
      Navigator.pop(context);
    }
  }
}
