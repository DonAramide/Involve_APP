import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

class StockUpResult {
  final int quantity;
  final String? remarks;
  final String? supplierName;
  final String? receiptNumber;
  final String? trackingNumber;
  final DateTime receivedAt;
  final Uint8List? receiptImage;

  const StockUpResult({
    required this.quantity,
    required this.receivedAt,
    this.remarks,
    this.supplierName,
    this.receiptNumber,
    this.trackingNumber,
    this.receiptImage,
  });
}

class StockUpDialog extends StatefulWidget {
  final String itemName;
  final int currentQty;

  const StockUpDialog({
    super.key,
    required this.itemName,
    required this.currentQty,
  });

  @override
  State<StockUpDialog> createState() => _StockUpDialogState();
}

class _StockUpDialogState extends State<StockUpDialog> {
  final _qtyController = TextEditingController();
  final _supplierController = TextEditingController();
  final _receiptController = TextEditingController();
  final _trackingController = TextEditingController();
  final _remarksController = TextEditingController();
  late DateTime _receivedAt;
  Uint8List? _receiptImage;
  String? _qtyError;

  @override
  void initState() {
    super.initState();
    _receivedAt = DateTime.now();
    _trackingController.text = 'IN-${DateFormat('yyyyMMdd-HHmmss').format(_receivedAt)}';
  }

  @override
  void dispose() {
    _qtyController.dispose();
    _supplierController.dispose();
    _receiptController.dispose();
    _trackingController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _pickReceivedAt() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _receivedAt,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_receivedAt),
    );
    if (!mounted) return;
    setState(() {
      _receivedAt = DateTime(
        date.year,
        date.month,
        date.day,
        time?.hour ?? _receivedAt.hour,
        time?.minute ?? _receivedAt.minute,
      );
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: source,
      maxWidth: 1280,
      imageQuality: 80,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    if (!mounted) return;
    setState(() => _receiptImage = bytes);
  }

  Future<void> _chooseImageSource() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Receipt / stock photo', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source != null) await _pickImage(source);
  }

  void _submit() {
    final qty = int.tryParse(_qtyController.text.trim());
    if (qty == null || qty <= 0) {
      setState(() => _qtyError = 'Enter a quantity greater than 0.');
      return;
    }
    Navigator.pop(
      context,
      StockUpResult(
        quantity: qty,
        remarks: _remarksController.text.trim(),
        supplierName: _supplierController.text.trim(),
        receiptNumber: _receiptController.text.trim(),
        trackingNumber: _trackingController.text.trim(),
        receivedAt: _receivedAt,
        receiptImage: _receiptImage,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Stock Up: ${widget.itemName}'),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Current Stock: ${widget.currentQty}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _qtyController,
                decoration: InputDecoration(
                  labelText: 'Quantity to Add',
                  border: const OutlineInputBorder(),
                  errorText: _qtyError,
                ),
                keyboardType: TextInputType.number,
                autofocus: true,
                onChanged: (_) {
                  if (_qtyError != null) setState(() => _qtyError = null);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _supplierController,
                decoration: const InputDecoration(
                  labelText: 'Supplier company name',
                  border: OutlineInputBorder(),
                ),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _receiptController,
                decoration: const InputDecoration(
                  labelText: 'Receipt / invoice number',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _trackingController,
                decoration: const InputDecoration(
                  labelText: 'Tracking / GRN number',
                  border: OutlineInputBorder(),
                  helperText: 'Waybill, delivery note, or upload number',
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.schedule),
                title: const Text('Date & time received'),
                subtitle: Text(DateFormat('dd MMM yyyy, hh:mm a').format(_receivedAt)),
                trailing: const Icon(Icons.edit_calendar),
                onTap: _pickReceivedAt,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _remarksController,
                decoration: const InputDecoration(
                  labelText: 'Remarks (optional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              const Text('Receipt / stock photo', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              if (_receiptImage != null)
                Stack(
                  alignment: Alignment.topRight,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.memory(
                        _receiptImage!,
                        height: 140,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _receiptImage = null),
                      icon: const CircleAvatar(
                        radius: 14,
                        backgroundColor: Colors.black54,
                        child: Icon(Icons.close, size: 16, color: Colors.white),
                      ),
                    ),
                  ],
                )
              else
                OutlinedButton.icon(
                  onPressed: _chooseImageSource,
                  icon: const Icon(Icons.add_a_photo_outlined),
                  label: const Text('Take photo or pick from gallery'),
                ),
              if (_receiptImage != null) ...[
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: _chooseImageSource,
                  icon: const Icon(Icons.swap_horiz),
                  label: const Text('Replace photo'),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
        ElevatedButton(onPressed: _submit, child: const Text('ADD')),
      ],
    );
  }
}
