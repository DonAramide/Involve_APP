import 'dart:async';
import 'dart:convert';
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
import '../utils/create_job_draft_store.dart';
import 'package:involve_app/core/utils/phone_number_input.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_state.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/staff_auth_dialog.dart';
import '../utils/job_staff_store.dart';

class CreateJobPage extends StatefulWidget {
  const CreateJobPage({super.key});

  @override
  State<CreateJobPage> createState() => _CreateJobPageState();
}

class _CreateJobPageState extends State<CreateJobPage> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedCustomerId;
  String? _selectedCustomerName;
  Staff? _selectedStaff;
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _amountController = TextEditingController();
  final _laborAmountController = TextEditingController();
  DateTime? _dueDate;
  Uint8List? _imageBytes;
  String? _warrantyDuration;

  List<String> _jobTitlePresets = [];
  bool _showDetailedBilling = false;
  bool _projectPhotoExpanded = false;
  final List<ServiceJobItem> _selectedItems = [];
  Key _titleFieldKey = UniqueKey();
  Timer? _draftSaveTimer;
  bool _draftReady = false;

  @override
  void initState() {
    super.initState();
    context.read<ServicesBloc>().add(const SearchServiceCustomers());
    context.read<ServicesBloc>().add(const LoadServicePresets());
    context.read<ServicesBloc>().add(const LoadLaborPresets());
    context.read<StaffBloc>().add(LoadStaffList());
    _titleController.addListener(_scheduleDraftSave);
    _descController.addListener(_scheduleDraftSave);
    _amountController.addListener(_scheduleDraftSave);
    _laborAmountController.addListener(_scheduleDraftSave);
    _restoreDraft();
  }

  @override
  void dispose() {
    _draftSaveTimer?.cancel();
    if (_draftReady && _hasUnsavedJobData()) {
      unawaited(CreateJobDraftStore.save(_draftMap()));
    }
    _titleController.dispose();
    _descController.dispose();
    _amountController.dispose();
    _laborAmountController.dispose();
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
        setState(() {
          _imageBytes = bytes;
          _projectPhotoExpanded = true;
        });
        _scheduleDraftSave();
      }
    }
  }

  bool _hasUnsavedJobData() {
    return _selectedCustomerId != null ||
        _selectedStaff != null ||
        _titleController.text.trim().isNotEmpty ||
        _descController.text.trim().isNotEmpty ||
        _amountController.text.trim().isNotEmpty ||
        _laborAmountController.text.trim().isNotEmpty ||
        _dueDate != null ||
        _imageBytes != null ||
        _warrantyDuration != null ||
        _showDetailedBilling ||
        _selectedItems.isNotEmpty;
  }

  Map<String, dynamic> _draftMap() {
    return {
      'customerId': _selectedCustomerId,
      'customerName': _selectedCustomerName,
      'staffId': _selectedStaff?.id,
      'staffName': _selectedStaff?.name,
      'staffCode': _selectedStaff?.staffCode,
      'staffRole': _selectedStaff?.role,
      'title': _titleController.text,
      'description': _descController.text,
      'amount': _amountController.text,
      'laborAmount': _laborAmountController.text,
      'dueDate': _dueDate?.toIso8601String(),
      'warrantyDuration': _warrantyDuration,
      'showDetailedBilling': _showDetailedBilling,
      'projectPhotoExpanded': _projectPhotoExpanded,
      'imageBase64': _imageBytes == null ? null : base64Encode(_imageBytes!),
      'items': _selectedItems
          .map((i) => {
                'id': i.id,
                'name': i.name,
                'category': i.category,
                'price': i.price,
                'quantity': i.quantity,
              })
          .toList(),
    };
  }

  Future<void> _restoreDraft() async {
    final draft = await CreateJobDraftStore.load();
    if (!mounted) return;
    if (draft == null) {
      _draftReady = true;
      return;
    }

    Uint8List? image;
    final rawImage = draft['imageBase64'] as String?;
    if (rawImage != null && rawImage.isNotEmpty) {
      try {
        image = base64Decode(rawImage);
      } catch (_) {}
    }

    DateTime? due;
    final rawDue = draft['dueDate'] as String?;
    if (rawDue != null && rawDue.isNotEmpty) {
      due = DateTime.tryParse(rawDue);
    }

    final items = <ServiceJobItem>[];
    final rawItems = draft['items'];
    if (rawItems is List) {
      for (final row in rawItems) {
        if (row is! Map) continue;
        items.add(ServiceJobItem(
          id: (row['id'] as num?)?.toInt(),
          name: (row['name'] as String?) ?? '',
          category: row['category'] as String?,
          price: (row['price'] as num?)?.toDouble() ?? 0,
          quantity: (row['quantity'] as num?)?.toDouble() ?? 1,
        ));
      }
    }

    Staff? staff;
    if (draft['staffId'] != null && draft['staffName'] != null) {
      staff = Staff(
        id: (draft['staffId'] as num).toInt(),
        name: draft['staffName'] as String,
        staffCode: draft['staffCode'] as String? ?? '',
        role: draft['staffRole'] as String? ?? 'STAFF',
      );
    }

    setState(() {
      _selectedCustomerId = draft['customerId'] as String?;
      _selectedCustomerName = draft['customerName'] as String?;
      _selectedStaff = staff;
      _titleController.text = (draft['title'] as String?) ?? '';
      _descController.text = (draft['description'] as String?) ?? '';
      _amountController.text = (draft['amount'] as String?) ?? '';
      _laborAmountController.text = (draft['laborAmount'] as String?) ?? '';
      _dueDate = due;
      _imageBytes = image;
      _warrantyDuration = draft['warrantyDuration'] as String?;
      _showDetailedBilling = draft['showDetailedBilling'] == true;
      _projectPhotoExpanded = draft['projectPhotoExpanded'] == true || image != null;
      _selectedItems
        ..clear()
        ..addAll(items);
      _titleFieldKey = UniqueKey();
      _draftReady = true;
    });
  }

  void _scheduleDraftSave() {
    if (!_draftReady) return;
    _draftSaveTimer?.cancel();
    _draftSaveTimer = Timer(const Duration(milliseconds: 400), () {
      if (!_draftReady) return;
      if (_hasUnsavedJobData()) {
        unawaited(CreateJobDraftStore.save(_draftMap()));
      } else {
        unawaited(CreateJobDraftStore.clear());
      }
    });
  }

  Future<void> _confirmClearDraft() async {
    if (!_hasUnsavedJobData()) {
      await CreateJobDraftStore.clear();
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear this job?'),
        content: const Text(
          'This removes the saved draft and all fields on this page. This cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Clear', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _clearForm();
  }

  Future<void> _clearForm() async {
    _draftReady = false;
    await CreateJobDraftStore.clear();
    if (!mounted) return;
    setState(() {
      _selectedCustomerId = null;
      _selectedCustomerName = null;
      _titleController.clear();
      _descController.clear();
      _amountController.clear();
      _laborAmountController.clear();
      _dueDate = null;
      _imageBytes = null;
      _warrantyDuration = null;
      _showDetailedBilling = false;
      _projectPhotoExpanded = false;
      _selectedItems.clear();
      _titleFieldKey = UniqueKey();
      _draftReady = true;
    });
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
            _scheduleDraftSave();
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Create New Job'),
          actions: [
            IconButton(
              tooltip: 'Clear form',
              icon: const Icon(Icons.delete_sweep_outlined),
              onPressed: _confirmClearDraft,
            ),
          ],
        ),
        body: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCustomerSelector(),
                const SizedBox(height: 16),
                _buildStaffSelector(),
                const SizedBox(height: 24),
                
                // Project Image Section — optional; collapsed for hotel rooms and similar jobs
                Card(
                  margin: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Column(
                    children: [
                      ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.blue.withValues(alpha: 0.1),
                          backgroundImage: _imageBytes != null ? MemoryImage(_imageBytes!) : null,
                          child: _imageBytes == null
                              ? Icon(Icons.add_a_photo_outlined, color: Theme.of(context).primaryColor)
                              : null,
                        ),
                        title: const Text('Project Photo', style: TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(
                          _imageBytes != null
                              ? 'Photo attached. Tap to view or change.'
                              : 'Optional. Skip for hotel rooms or when a photo cannot be taken.',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_imageBytes != null)
                              IconButton(
                                tooltip: 'Remove photo',
                                icon: const Icon(Icons.close),
                                onPressed: () {
                                  setState(() => _imageBytes = null);
                                  _scheduleDraftSave();
                                },
                              ),
                            Icon(_projectPhotoExpanded ? Icons.expand_less : Icons.expand_more),
                          ],
                        ),
                        onTap: () => setState(() => _projectPhotoExpanded = !_projectPhotoExpanded),
                      ),
                      if (_projectPhotoExpanded)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
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
                                        const Text('Add Job / Expected Image', style: TextStyle(color: Colors.grey)),
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
                    ],
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
                      key: _titleFieldKey,
                      initialValue: TextEditingValue(text: _titleController.text),
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
                            labelText: 'Service Offering / Job Type',
                            hintText: 'e.g. Repair, Consultation, Maintenance',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            prefixIcon: const Icon(Icons.design_services_outlined),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.arrow_drop_down),
                              onPressed: () {
                                if (_jobTitlePresets.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('No service presets found. Add them in Services Setup.')),
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
                    _scheduleDraftSave();
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
                                _scheduleDraftSave();
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
                      _scheduleDraftSave();
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
        if (date != null) {
          setState(() => _dueDate = date);
          _scheduleDraftSave();
        }
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
                            leading: CircleAvatar(
                              backgroundColor: Colors.blue.withValues(alpha: 0.1),
                              backgroundImage: m.image != null ? MemoryImage(m.image!) : null,
                              child: m.image == null
                                  ? const Icon(Icons.build_outlined, color: Colors.blue, size: 20)
                                  : null,
                            ),
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
                                _scheduleDraftSave();
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
          _scheduleDraftSave();
          Navigator.pop(context);
        },
      ),
    );
  }

  Widget _buildStaffSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Assigned Staff (Required)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            if (_selectedStaff != null)
              TextButton(
                onPressed: _authenticateStaff,
                child: const Text('Change Staff', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: _authenticateStaff,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: _selectedStaff != null ? Colors.blue.withValues(alpha: 0.06) : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _selectedStaff != null ? Colors.blue.shade300 : Colors.grey.shade300,
                width: _selectedStaff != null ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: _selectedStaff != null ? Colors.blue.shade100 : Colors.grey.shade200,
                  child: Icon(
                    Icons.badge_outlined,
                    color: _selectedStaff != null ? Colors.blue.shade800 : Colors.grey.shade600,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedStaff != null ? 'Assigned Staff (PIN Verified)' : 'Service Staff Assignment',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _selectedStaff != null ? Colors.blue.shade700 : Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _selectedStaff != null
                            ? '${_selectedStaff!.name} (ID: ${_selectedStaff!.staffId ?? "None"})'
                            : 'Select Staff & Login with 4-Digit PIN',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: _selectedStaff != null ? FontWeight.bold : FontWeight.normal,
                          color: _selectedStaff != null ? Colors.black87 : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_selectedStaff != null)
                  Chip(
                    avatar: const Icon(Icons.check_circle, color: Colors.green, size: 14),
                    label: const Text('PIN VERIFIED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green)),
                    backgroundColor: Colors.green.shade50,
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  )
                else
                  const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _authenticateStaff() async {
    final staff = await showDialog<Staff>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => const StaffAuthDialog(),
    );
    if (staff != null && mounted) {
      setState(() {
        _selectedStaff = staff;
      });
      _scheduleDraftSave();
    }
  }

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      if (_selectedCustomerId == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select or create a customer')));
        return;
      }

      // If staff is not yet assigned/authenticated, require staff authentication
      if (_selectedStaff == null) {
        final staffList = context.read<StaffBloc>().state.staffList;
        if (staffList.isNotEmpty) {
          final staff = await showDialog<Staff>(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => const StaffAuthDialog(),
          );
          if (staff == null) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Staff PIN authentication is required to create a service job')),
              );
            }
            return;
          }
          if (mounted) {
            setState(() => _selectedStaff = staff);
          }
        }
      }

      if (_selectedStaff != null) {
        await JobStaffStore.saveLatestStaff(_selectedStaff!.id!, _selectedStaff!.name);
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
      _draftReady = false;
      unawaited(CreateJobDraftStore.clear());
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
    String? phoneError;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
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
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder(), prefixIcon: Icon(Icons.person)),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  inputFormatters: PhoneNumberInput.formatters,
                  maxLength: PhoneNumberInput.maxDigits,
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    border: const OutlineInputBorder(),
                    prefixIcon: const Icon(Icons.phone),
                    errorText: phoneError,
                  ),
                  onChanged: (_) {
                    if (phoneError != null) {
                      setDialogState(() => phoneError = null);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: addressCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Home/Office Address', border: OutlineInputBorder(), prefixIcon: Icon(Icons.location_on)),
                ),
              ],
            ),
          ),
          actions: [
            NoLabelButton(onPressed: () => Navigator.pop(dialogCtx), text: 'Cancel'),
            ElevatedButton(
              onPressed: () {
                final name = nameCtrl.text.trim();
                final phone = phoneCtrl.text.trim();

                if (name.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Customer name is required')),
                  );
                  return;
                }

                if (phone.isNotEmpty) {
                  final existingList = context.read<ServicesBloc>().state.customers;
                  final digits = phone.replaceAll(RegExp(r'\D'), '');
                  final match = existingList.where((c) {
                    final p = (c.phone ?? '').trim();
                    if (p.isEmpty) return false;
                    if (p == phone) return true;
                    final cd = p.replaceAll(RegExp(r'\D'), '');
                    if (cd.isNotEmpty && digits.isNotEmpty) {
                      if (cd == digits) return true;
                      if (cd.length >= 10 && digits.length >= 10) {
                        return cd.substring(cd.length - 10) == digits.substring(digits.length - 10);
                      }
                    }
                    return false;
                  }).firstOrNull;

                  if (match != null) {
                    setDialogState(() {
                      phoneError = 'Phone already used by ${match.name}';
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('A customer with phone number "$phone" already exists (${match.name}).'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }
                }

                context.read<ServicesBloc>().add(CreateServiceCustomer(
                  name: name,
                  phone: phone.isEmpty ? null : phone,
                  address: addressCtrl.text.trim().isEmpty ? null : addressCtrl.text.trim(),
                  image: customerImage,
                ));
                Navigator.pop(dialogCtx);
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
