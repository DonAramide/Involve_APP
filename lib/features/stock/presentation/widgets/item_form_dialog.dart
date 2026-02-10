import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/utils/validators.dart';
import '../../domain/entities/item.dart';
import '../../domain/entities/category.dart';
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
  ItemCategory _legacyCategory = ItemCategory.drink; // Fallback
  int? _selectedCategoryId;
  Uint8List? _imageBytes;

  @override
  void initState() {
    super.initState();
    _name = widget.item?.name ?? '';
    _price = widget.item?.price ?? 0.0;
    _stockQty = widget.item?.stockQty ?? 0;
    _legacyCategory = widget.item?.category ?? ItemCategory.drink;
    _selectedCategoryId = widget.item?.categoryId;
    _imageBytes = widget.item?.image;
    
    // Ensure categories are loaded
    widget.stockBloc.add(LoadCategories());
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 600);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() {
        _imageBytes = bytes;
      });
    }
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
              // Image Picker
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  height: 100,
                  width: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[400]!),
                    image: _imageBytes != null 
                        ? DecorationImage(image: MemoryImage(_imageBytes!), fit: BoxFit.cover)
                        : null,
                  ),
                  child: _imageBytes == null
                      ? const Icon(Icons.add_a_photo, color: Colors.grey)
                      : null,
                ),
              ),
              const SizedBox(height: 10),
              
              TextFormField(
                initialValue: _name,
                decoration: const InputDecoration(labelText: 'Item Name'),
                onSaved: (val) => _name = val ?? '',
                validator: (val) => InputValidator.validateNotEmpty(val, 'Item Name'),
              ),
              
              // Dynamic Category Dropdown
              BlocBuilder<StockBloc, StockState>(
                bloc: widget.stockBloc,
                builder: (context, state) {
                  List<Category> categories = [];
                  if (state is StockLoaded) {
                    categories = state.categories;
                  }
                  
                  // If we have categories, prefer them
                  if (categories.isNotEmpty) {
                    return DropdownButtonFormField<int>(
                      value: _selectedCategoryId,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: categories.map((cat) {
                        return DropdownMenuItem(value: cat.id, child: Text(cat.name));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedCategoryId = val),
                      validator: (val) => val == null ? 'Please select a category' : null,
                    );
                  } else {
                    // Fallback to legacy enum if no categories defined
                    return DropdownButtonFormField<ItemCategory>(
                      value: _legacyCategory,
                      decoration: const InputDecoration(labelText: 'Category (Legacy)'),
                      items: ItemCategory.values.map((cat) {
                        return DropdownMenuItem(value: cat, child: Text(cat.name.toUpperCase()));
                      }).toList(),
                      onChanged: (val) => setState(() => _legacyCategory = val!),
                    );
                  }
                },
              ),
              
              TextFormField(
                initialValue: _price.toString(),
                decoration: const InputDecoration(labelText: 'Price'),
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
        category: _legacyCategory, // Maintain for compatibility
        categoryId: _selectedCategoryId,
        price: _price,
        stockQty: _stockQty,
        image: _imageBytes,
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
