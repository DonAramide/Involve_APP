import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import '../../domain/entities/service_customer.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_material.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class CreateJobPage extends StatefulWidget {
  const CreateJobPage({super.key});

  @override
  State<CreateJobPage> createState() => _CreateJobPageState();
}

class _CreateJobPageState extends State<CreateJobPage> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedCustomerId;
  String? _selectedCustomerName;
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _amountController = TextEditingController();
  final _laborAmountController = TextEditingController();
  DateTime? _dueDate;
  Uint8List? _imageBytes;
  String? _warrantyDuration;

  List<String> _jobTitlePresets = [];
  bool _showDetailedBilling = false;
  final List<ServiceJobItem> _selectedItems = [];

  @override
  void initState() {
    super.initState();
    context.read<ServicesBloc>().add(const SearchServiceCustomers());
    context.read<ServicesBloc>().add(const LoadServicePresets());
    context.read<ServicesBloc>().add(const LoadLaborPresets());
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('Select Project Image', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
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
          const SizedBox(height: 8),
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
        setState(() => _imageBytes = bytes);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.read<SettingsBloc>().state.settings;
    final symbol = settings?.currency ?? '₦';

    return BlocListener<ServicesBloc, ServicesState>(
      listener: (context, state) {
        if (state.successMessage != null && state.successMessage!.contains('Customer registered')) {
          // If we just registered a customer, select them automatically
          // Note: In the refactored bloc, the created customer is added to state.customers
          if (state.customers.isNotEmpty) {
            final last = state.customers.last;
            setState(() {
              _selectedCustomerId = last.id;
              _selectedCustomerName = last.name;
            });
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Create New Job')),
        body: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCustomerSelector(),
                const SizedBox(height: 24),
                
                // Project Image Section
                const Text('Project Photos', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Center(
                  child: GestureDetector(
                    onTap: _pickImage,
                    child: Container(
                      height: 150,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey[300]!, width: 2),
                        image: _imageBytes != null 
                            ? DecorationImage(image: MemoryImage(_imageBytes!), fit: BoxFit.cover)
                            : null,
                      ),
                      child: _imageBytes == null
                          ? Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add_a_photo_outlined, size: 40, color: Theme.of(context).primaryColor),
                                const SizedBox(height: 8),
                                const Text('Add Job/Expected Image', style: TextStyle(color: Colors.grey)),
                              ],
                            )
                          : Container(
                              alignment: Alignment.bottomRight,
                              padding: const EdgeInsets.all(8),
                              child: CircleAvatar(
                                backgroundColor: Colors.black54,
                                child: IconButton(
                                  icon: const Icon(Icons.edit, color: Colors.white, size: 20),
                                  onPressed: _pickImage,
                                ),
                              ),
                            ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                const Text('Job Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                
                // Job Title with Autocomplete
                BlocBuilder<ServicesBloc, ServicesState>(
                  builder: (context, state) {
                    _jobTitlePresets = state.presets;

                    return Autocomplete<String>(
                      optionsBuilder: (TextEditingValue textEditingValue) {
                        if (textEditingValue.text == '') return _jobTitlePresets;
                        return _jobTitlePresets.where((String option) {
                          return option.toLowerCase().contains(textEditingValue.text.toLowerCase());
                        });
                      },
                      onSelected: (String selection) {
                        _titleController.text = selection;
                      },
                      fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                        // Sync internal controller with field controller
                        if (controller.text != _titleController.text && _titleController.text.isNotEmpty) {
                          controller.text = _titleController.text;
                        }
                        controller.addListener(() => _titleController.text = controller.text);

                        return TextFormField(
                          controller: controller,
                          focusNode: focusNode,
                          decoration: InputDecoration(
                            labelText: 'Job Type / Title',
                            hintText: 'e.g. Traditional Dress Sewing',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            prefixIcon: const Icon(Icons.work_outline),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.arrow_drop_down),
                              onPressed: () {
                                if (_jobTitlePresets.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('No presets found. Add them in dashboard settings.'))
                                  );
                                }
                                if (!focusNode.hasFocus) focusNode.requestFocus();
                              },
                            ),
                          ),
                          validator: (v) => (v == null || v.isEmpty) ? 'Please enter a title' : null,
                        );
                      },
                    );
                  },
                ),
                
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Small Description',
                    hintText: 'e.g. Measurements, specific fabric info...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    prefixIcon: const Icon(Icons.description_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Detailed Billing (Materials + Labor)', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Add specific materials and workmanship fees'),
                  value: _showDetailedBilling,
                  activeColor: Theme.of(context).primaryColor,
                  onChanged: (v) {
                    setState(() {
                      _showDetailedBilling = v;
                      if (v) {
                        _amountController.text = _calculateTotal().toStringAsFixed(2);
                      }
                    });
                  },
                ),
                if (!_showDetailedBilling)
                  TextFormField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Total Cost ($symbol)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.money),
                      prefixText: '$symbol ',
                    ),
                    validator: (v) => (v == null || double.tryParse(v) == null) ? 'Invalid amount' : null,
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      BlocBuilder<ServicesBloc, ServicesState>(
                        builder: (context, state) {
                          return TextFormField(
                            controller: _laborAmountController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: 'Workmanship / Labor Fee ($symbol)',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              prefixIcon: const Icon(Icons.engineering),
                              prefixText: '$symbol ',
                              suffixIcon: state.laborPresets.isEmpty
                                  ? null
                                  : PopupMenuButton<double>(
                                      icon: const Icon(Icons.arrow_drop_down_circle_outlined),
                                      tooltip: 'Pick from presets',
                                      onSelected: (amount) {
                                        setState(() {
                                          _laborAmountController.text = amount.toStringAsFixed(2);
                                          _updateTotal();
                                        });
                                      },
                                      itemBuilder: (context) => state.laborPresets.map((p) => PopupMenuItem(
                                        value: p.amount,
                                        child: Text('${p.name} ($symbol${p.amount})'),
                                      )).toList(),
                                    ),
                            ),
                            onChanged: (v) => _updateTotal(),
                          );
                        },
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Materials / Parts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          TextButton.icon(
                            onPressed: () => _showMaterialPicker(context),
                            icon: const Icon(Icons.add),
                            label: const Text('Add Item'),
                          ),
                        ],
                      ),
                      if (_selectedItems.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey[300]!),
                          ),
                          child: const Center(child: Text('No materials added yet')),
                        )
                      else
                        ..._selectedItems.map((item) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            dense: true,
                            title: Text(item.name),
                            subtitle: Text('${item.category} • ${CurrencyFormatter.formatWithSymbol(item.price, symbol: symbol)} x ${item.quantity.toInt()}'),
                            trailing: IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                              onPressed: () {
                                setState(() {
                                  _selectedItems.removeWhere((i) => i.id == item.id);
                                  _updateTotal();
                                });
                              },
                            ),
                          ),
                        )),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).primaryColor.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Theme.of(context).primaryColor.withOpacity(0.2)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Grand Total:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                            Text(
                                CurrencyFormatter.formatWithSymbol(_calculateTotal(), symbol: symbol),
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Theme.of(context).primaryColor),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 16),
                _buildDatePicker(),
                if (settings?.warrantyEnabled == true) ...[
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String?>(
                    decoration: InputDecoration(
                      labelText: 'Warranty Duration',
                      prefixIcon: const Icon(Icons.security, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    value: _warrantyDuration,
                    items: [null, '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months', '9 Months', '1 Year', '2 Years', '3 Years']
                        .map((opt) => DropdownMenuItem<String?>(value: opt, child: Text(opt ?? 'None')))
                        .toList(),
                    onChanged: (val) {
                      setState(() => _warrantyDuration = val);
                    },
                  ),
                ],
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Save Job Offline', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCustomerSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Customer', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        InkWell(
          onTap: _showCustomerPicker,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[400]!),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.person_outline, color: Colors.grey),
                const SizedBox(width: 12),
                Text(
                  _selectedCustomerName ?? 'Select or Add Customer',
                  style: TextStyle(
                    color: _selectedCustomerName == null ? Colors.grey : Colors.black,
                    fontSize: 16,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.arrow_drop_down),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDatePicker() {
    return InkWell(
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: DateTime.now().add(const Duration(days: 7)),
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
        );
        if (date != null) setState(() => _dueDate = date);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[400]!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today, color: Colors.grey),
            const SizedBox(width: 12),
            Text(
              _dueDate == null ? 'Due Date (Optional)' : 'Due: ${_dueDate!.toLocal().toString().split(' ')[0]}',
              style: TextStyle(color: _dueDate == null ? Colors.grey : Colors.black),
            ),
          ],
        ),
      ),
    );
  }

  void _showMaterialPicker(BuildContext context) {
    context.read<ServicesBloc>().add(const LoadServiceMaterials());
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          final categories = state.categories;
          final materials = state.materials;

          return DraggableScrollableSheet(
            initialChildSize: 0.7,
            maxChildSize: 0.9,
            minChildSize: 0.5,
            expand: false,
            builder: (context, scrollController) => Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Select Material', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                    ],
                  ),
                ),
                if (materials.isEmpty)
                  const Expanded(child: Center(child: Text('No material items found.')))
                else
                  Expanded(
                    child: ListView.builder(
                      controller: scrollController,
                      itemCount: categories.length,
                      itemBuilder: (context, catIdx) {
                        final cat = categories[catIdx];
                        final items = materials.where((m) => m.category == cat).toList();
                        return ExpansionTile(
                          initiallyExpanded: true,
                          title: Text(cat, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                          children: items.map((m) => ListTile(
                            title: Text(m.name),
                            subtitle: Text('Default: ₦${m.defaultPrice}'),
                            trailing: const Icon(Icons.add_circle_outline),
                            onTap: () async {
                              final result = await _showPriceQtyDialog(context, m);
                              if (result != null) {
                                setState(() {
                                  _selectedItems.add(result);
                                  _updateTotal();
                                });
                                Navigator.pop(context);
                              }
                            },
                          )).toList(),
                        );
                      },
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<ServiceJobItem?> _showPriceQtyDialog(BuildContext context, dynamic material) async {
    final priceCtrl = TextEditingController(text: material.defaultPrice.toString());
    final qtyCtrl = TextEditingController(text: '1');
    return showDialog<ServiceJobItem>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Add ${material.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: priceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Price', prefixText: '₦ '),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final price = double.tryParse(priceCtrl.text) ?? 0.0;
              final qty = double.tryParse(qtyCtrl.text) ?? 1.0;
              Navigator.pop(context, ServiceJobItem(
                id: DateTime.now().millisecondsSinceEpoch,
                name: material.name,
                category: material.category,
                price: price,
                quantity: qty,
              ));
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _updateTotal() {
    setState(() {
      _amountController.text = _calculateTotal().toStringAsFixed(2);
    });
  }

  double _calculateTotal() {
    final labor = double.tryParse(_laborAmountController.text) ?? 0.0;
    if (!_showDetailedBilling) {
      return double.tryParse(_amountController.text) ?? 0.0;
    }
    final itemsTotal = _selectedItems.fold(0.0, (sum, item) => sum + (item.price * item.quantity));
    return labor + itemsTotal;
  }

  void _showCustomerPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CustomerSearchSheet(
        onSelected: (customer) {
          setState(() {
            _selectedCustomerId = customer.id;
            _selectedCustomerName = customer.name;
          });
          Navigator.pop(context);
        },
      ),
    );
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      if (_selectedCustomerId == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select or create a customer')));
        return;
      }

      final total = double.parse(_amountController.text);
      final labor = double.tryParse(_laborAmountController.text) ?? 0.0;

      context.read<ServicesBloc>().add(CreateServiceJob(
            customerId: _selectedCustomerId!,
            title: _titleController.text,
            description: _descController.text,
            totalAmount: total,
            laborAmount: labor,
            items: _selectedItems,
            dueDate: _dueDate,
            image: _imageBytes,
            warrantyDuration: _warrantyDuration,
          ));
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job saved locally.')),
      );
    } else if (_selectedCustomerId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a customer')));
    }
  }
}

class _CustomerSearchSheet extends StatefulWidget {
  final Function(ServiceCustomer) onSelected;
  const _CustomerSearchSheet({required this.onSelected});

  @override
  State<_CustomerSearchSheet> createState() => _CustomerSearchSheetState();
}

class _CustomerSearchSheetState extends State<_CustomerSearchSheet> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<ServicesBloc>().add(const SearchServiceCustomers());
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ServicesBloc, ServicesState>(
      listener: (context, state) {
        if (state.successMessage != null && state.successMessage!.contains('Customer registered')) {
          if (state.customers.isNotEmpty) {
            widget.onSelected(state.customers.last);
          }
        }
      },
      child: Container(
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search customer...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => context.read<ServicesBloc>().add(SearchServiceCustomers(query: v)),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: _showAddCustomerDialog,
              icon: const Icon(Icons.add),
              label: const Text('Add New Customer'),
            ),
            const Divider(),
            Expanded(
              child: BlocBuilder<ServicesBloc, ServicesState>(
                builder: (context, state) {
                  final customers = state.customers;

                  if (state.status == ServicesStatus.loading && customers.isEmpty) {
                    return const InvifyLoadingIndicator(message: 'SEARCHING CUSTOMERS...');
                  }

                  if (customers.isEmpty) {
                    return const Center(child: Text('No customers found.'));
                  }

                  return ListView.builder(
                    itemCount: customers.length,
                    itemBuilder: (context, index) {
                      final customer = customers[index];
                      return ListTile(
                        title: Text(customer.name),
                        subtitle: Text(customer.phone ?? ''),
                        onTap: () => widget.onSelected(customer),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddCustomerDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    Uint8List? customerImage;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add New Customer'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: () async {
                    final picker = ImagePicker();
                    final XFile? image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 300, imageQuality: 70);
                    if (image != null) {
                      final bytes = await image.readAsBytes();
                      setDialogState(() => customerImage = bytes);
                    }
                  },
                  child: CircleAvatar(
                    radius: 40,
                    backgroundColor: Colors.grey[200],
                    backgroundImage: customerImage != null ? MemoryImage(customerImage!) : null,
                    child: customerImage == null ? const Icon(Icons.camera_alt, size: 30, color: Colors.grey) : null,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: addressCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Home/Office Address', border: OutlineInputBorder())),
              ],
            ),
          ),
          actions: [
            NoLabelButton(onPressed: () => Navigator.pop(context), text: 'Cancel'),
            ElevatedButton(
              onPressed: () {
                if (nameCtrl.text.isNotEmpty) {
                  context.read<ServicesBloc>().add(CreateServiceCustomer(
                    name: nameCtrl.text,
                    phone: phoneCtrl.text,
                    address: addressCtrl.text,
                    image: customerImage,
                  ));
                  Navigator.pop(context);
                }
              },
              child: const Text('Save Customer'),
            ),
          ],
        ),
      ),
    );
  }
}

// Helper for No Label buttons if not defined, otherwise use TextButton
class NoLabelButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String text;
  const NoLabelButton({super.key, required this.onPressed, required this.text});
  @override
  Widget build(BuildContext context) => TextButton(onPressed: onPressed, child: Text(text));
}
