import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/utils/validators.dart';
import '../../domain/entities/item.dart';
import '../../domain/entities/category.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';

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
  final _priceController = TextEditingController();
  final _costPriceController = TextEditingController();
  late int _stockQty;
  ItemCategory _legacyCategory = ItemCategory.drink; // Fallback
  int? _selectedCategoryId;
  Uint8List? _imageBytes;
  late double _minStockLevel;
  
  // Phase 3: Service Billing
  String _type = 'product';
  String? _billingType;
  String? _serviceCategory; 

  @override
  void initState() {
    super.initState();
    _name = widget.item?.name ?? '';
    _priceController.text = (widget.item?.price ?? 0.0).toString();
    _costPriceController.text = (widget.item?.costPrice ?? 0.0).toString();
    _stockQty = widget.item?.stockQty ?? 0;
    _legacyCategory = widget.item?.category ?? ItemCategory.drink;
    _selectedCategoryId = widget.item?.categoryId;
    _imageBytes = widget.item?.image;
    _minStockLevel = widget.item?.minStockQty ?? 0;
    
    // Initialize Phase 3 fields
    if (widget.item != null) {
      _type = widget.item!.type;
      _billingType = widget.item!.billingType;
      _serviceCategory = widget.item!.serviceCategory;
    }
    
    // Ensure categories are loaded
    widget.stockBloc.add(LoadCategories());
  }

  @override
  void dispose() {
    _priceController.dispose();
    _costPriceController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      if (kIsWeb) {
        // Use file_picker for web - better browser support
        FilePickerResult? result = await FilePicker.platform.pickFiles(
          type: FileType.image,
          allowMultiple: false,
        );
        
        if (result != null && result.files.isNotEmpty) {
          setState(() {
            _imageBytes = result.files.first.bytes;
          });
        }
        return;
      }

      // Show selection dialog for mobile
      final source = await showModalBottomSheet<ImageSource>(
        context: context,
        builder: (ctx) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      );

      if (source != null) {
        final picker = ImagePicker();
        final XFile? image = await picker.pickImage(
          source: source,
          maxWidth: 600,
          imageQuality: 85,
        );
        
        if (image != null) {
          final bytes = await image.readAsBytes();
          setState(() {
            _imageBytes = bytes;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Access settings for Service Billing config
    final settingsState = context.read<SettingsBloc>().state;
    final isServiceBillingEnabled = settingsState.settings?.serviceBillingEnabled ?? false;
    final serviceTypes = settingsState.settings?.serviceTypes ?? [];

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
              
              if (isServiceBillingEnabled) ...[
                DropdownButtonFormField<String>(
                  value: _type,
                  decoration: const InputDecoration(labelText: 'Item Type'),
                  items: const [
                    DropdownMenuItem(value: 'product', child: Text('Product')),
                    DropdownMenuItem(value: 'service', child: Text('Service')),
                  ],
                  onChanged: (val) {
                    setState(() {
                      _type = val!;
                      // Reset service fields if switched to product
                      if (_type == 'product') {
                        _billingType = null;
                        _serviceCategory = null;
                      }
                    });
                  },
                ),
                const SizedBox(height: 10),
              ],

              TextFormField(
                initialValue: _name,
                decoration: const InputDecoration(labelText: 'Item Name'),
                onSaved: (val) => _name = val ?? '',
                validator: (val) => InputValidator.validateNotEmpty(val, 'Item Name'),
              ),
              
              // Conditional Fields based on Type
              if (_type == 'product') ...[
                BlocBuilder<StockBloc, StockState>(
                  bloc: widget.stockBloc,
                  builder: (context, state) {
                    List<Category> categories = [];
                    if (state is StockLoaded) {
                      categories = state.categories;
                    }

                    if (categories.isNotEmpty) {
                      // Safety check: Ensure the selected ID exists in the loaded categories
                      final bool isValidId = _selectedCategoryId != null && 
                                           categories.any((c) => c.id == _selectedCategoryId);
                      
                      return DropdownButtonFormField<int>(
                        value: isValidId ? _selectedCategoryId : null,
                        decoration: const InputDecoration(labelText: 'Category'),
                        items: categories.map((cat) {
                          return DropdownMenuItem(value: cat.id, child: Text(cat.name));
                        }).toList(),
                        onChanged: (val) => setState(() => _selectedCategoryId = val),
                        validator: (val) => val == null ? 'Please select a category' : null,
                      );
                    } else {
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
                    initialValue: _stockQty.toString(),
                    decoration: const InputDecoration(labelText: 'Stock Quantity'),
                    keyboardType: TextInputType.number,
                    onSaved: (val) => _stockQty = int.tryParse(val ?? '0') ?? 0,
                    validator: (val) => InputValidator.validateNumber(val, 'Stock', allowDecimal: false),
                  ),
                  TextFormField(
                    initialValue: _minStockLevel.toString(),
                    decoration: const InputDecoration(labelText: 'Min Stock Alert Level'),
                    keyboardType: TextInputType.number,
                    onSaved: (val) => _minStockLevel = double.tryParse(val ?? '0') ?? 0,
                    validator: (val) => InputValidator.validateNumber(val, 'Min Stock'),
                  ),
                ] else ...[
                // Service Fields
                DropdownButtonFormField<String>(
                  value: _serviceCategory,
                  decoration: const InputDecoration(labelText: 'Service Category'),
                  items: serviceTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (val) => setState(() => _serviceCategory = val),
                  validator: (val) => val == null ? 'Select service category' : null,
                ),
                DropdownButtonFormField<String>(
                  value: _billingType,
                  decoration: const InputDecoration(labelText: 'Billing Type'),
                  items: const [
                    DropdownMenuItem(value: 'fixed', child: Text('Fixed Price')),
                    DropdownMenuItem(value: 'per_day', child: Text('Per Day (e.g. Hotel)')),
                    DropdownMenuItem(value: 'per_half_day', child: Text('Per Half Day')),
                    DropdownMenuItem(value: 'per_hour', child: Text('Per Hour (e.g. Lounge)')),
                  ],
                  onChanged: (val) => setState(() => _billingType = val),
                  validator: (val) => val == null ? 'Select billing type' : null,
                ),
              ],
              
              TextFormField(
                controller: _priceController,
                decoration: const InputDecoration(labelText: 'Price / Rate'),
                keyboardType: TextInputType.number,
                validator: (val) => InputValidator.validateNumber(val, 'Price'),
              ),
              if (_type == 'product') ...[
                const SizedBox(height: 10),
                TextFormField(
                  controller: _costPriceController,
                  decoration: const InputDecoration(labelText: 'Cost Price (Optional)'),
                  keyboardType: TextInputType.number,
                  validator: (val) {
                    if (val == null || val.isEmpty || val == '0' || val == '0.0') return null;
                    
                    final costErr = InputValidator.validateNumber(val, 'Cost Price');
                    if (costErr != null) return costErr;

                    final cost = double.tryParse(val) ?? 0.0;
                    final price = double.tryParse(_priceController.text) ?? 0.0;

                    if (cost > price) {
                      return 'Cost Price cannot exceed Selling Price';
                    }
                    return null;
                  },
                ),
              ],
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
      
      final price = double.tryParse(_priceController.text) ?? 0.0;
      final costPrice = double.tryParse(_costPriceController.text) ?? 0.0;

      final newItem = Item(
        id: widget.item?.id,
        name: _name,
        category: _legacyCategory, 
        categoryId: _selectedCategoryId,
        price: price,
        costPrice: costPrice,
        stockQty: _type == 'service' ? 999999 : _stockQty, 
        minStockQty: _minStockLevel,
        image: _imageBytes,
        type: _type,
        billingType: _billingType,
        serviceCategory: _serviceCategory,
        requiresTimeTracking: _billingType == 'per_day' || _billingType == 'per_hour' || _billingType == 'per_half_day',
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
