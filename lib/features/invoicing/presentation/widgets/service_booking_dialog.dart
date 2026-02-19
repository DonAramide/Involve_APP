import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../stock/domain/entities/item.dart';

class ServiceBookingDialog extends StatefulWidget {
  final Item item;
  final Function(DateTime start, DateTime end) checkAvailability;

  const ServiceBookingDialog({
    super.key,
    required this.item,
    required this.checkAvailability,
  });

  @override
  State<ServiceBookingDialog> createState() => _ServiceBookingDialogState();
}

class _ServiceBookingDialogState extends State<ServiceBookingDialog> {
  DateTime? _startDate;
  DateTime? _endDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  
  // For 'per_hour', we need a date plus time range
  /* 
    Logic:
    - per_day: Pick range (Start Date 12:00 PM - End Date 11:00 AM standard, or just dates)
      - Duration = End - Start (in days)
    - per_hour: Pick Date + Start Time + End Time
      - Duration = EndTime - StartTime (in hours)
  */

  double _quantity = 1;
  double _total = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.item.billingType == 'per_days') {
       // logic for days
    }
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
        _calculateTotal();
      });
    }
  }

  Future<void> _selectDateAndTimes(BuildContext context) async {
    // 1. Pick Date
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null) return;

    // 2. Pick Start Time
    if (!mounted) return;
    final start = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
      helpText: 'SELECT START TIME',
    );
    if (start == null) return;

    // 3. Pick End Time
    if (!mounted) return;
    final end = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: start.hour + 1, minute: start.minute),
      helpText: 'SELECT END TIME',
    );
    if (end == null) return;

    // Construct startDt properly
    final startDt = DateTime(date.year, date.month, date.day, start.hour, start.minute);

    // Calculation tentative end date/time
    var endDt = DateTime(date.year, date.month, date.day, end.hour, end.minute);
    
    // If end time is earlier than start time (e.g. 10 PM to 2 AM), assume next day
    if (endDt.isBefore(startDt)) {
       endDt = endDt.add(const Duration(days: 1));
    }
    
    // Check if endDt is valid
    if (!endDt.isAfter(startDt)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('End time must be after start time.')),
        );
      }
      return;
    }

    setState(() {
      _startDate = startDt;
      _endDate = endDt;
      _calculateTotal();
    });
  }

  void _calculateTotal() {
    _error = null;
    if (_startDate == null || _endDate == null) return;

    if (widget.item.billingType == 'per_day') {
      final days = _endDate!.difference(_startDate!).inDays;
      if (days <= 0) {
        _quantity = 1; // Minimum 1 day
      } else {
        _quantity = days.toDouble();
      }
    } else if (widget.item.billingType == 'per_hour') {
      final diff = _endDate!.difference(_startDate!);
      final hours = diff.inMinutes / 60.0;
      _quantity = hours.ceilToDouble(); // Round up to nearest hour
      if (_quantity < 1) _quantity = 1; // Minimum 1 hour
    } else {
      _quantity = 1;
    }

    _total = _quantity * widget.item.price;
    
    // Check availability
    _checkAvailability();
  }

  Future<void> _checkAvailability() async {
    if (_startDate == null || _endDate == null) return;
    final isAvailable = await widget.checkAvailability(_startDate!, _endDate!);
    if (!isAvailable) {
      if (mounted) {
        setState(() {
          _error = 'Selected slot is already booked!';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Book ${widget.item.name}'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Rate: ${NumberFormat.currency(symbol: '₦').format(widget.item.price)} / ${_getUnitLabel()}'),
            const SizedBox(height: 16),
            
            if (widget.item.billingType == 'fixed') ...[
              const Text('Fixed Price Service'),
              // Maybe allow quantity?
              TextFormField(
                initialValue: '1',
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quantity'),
                onChanged: (val) {
                  setState(() {
                    _quantity = double.tryParse(val) ?? 1;
                    _total = _quantity * widget.item.price;
                  });
                },
              ),
            ] else if (widget.item.billingType == 'per_day') ...[
              ElevatedButton.icon(
                icon: const Icon(Icons.date_range),
                label: Text(_startDate == null 
                  ? 'Select Dates' 
                  : '${DateFormat('MM/dd').format(_startDate!)} - ${DateFormat('MM/dd').format(_endDate!)}'),
                onPressed: () => _selectDateRange(context),
              ),
              if (_startDate != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text('${_quantity.toInt()} Night(s)'),
                ),
            ] else if (widget.item.billingType == 'per_hour') ...[
              ElevatedButton.icon(
                icon: const Icon(Icons.access_time),
                label: Text(_startDate == null 
                  ? 'Select Time Slot' 
                  : '${DateFormat('MM/dd HH:mm').format(_startDate!)} - ${DateFormat('HH:mm').format(_endDate!)}'),
                onPressed: () => _selectDateAndTimes(context),
              ),
              if (_startDate != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text('${_quantity.toInt()} Hour(s)'),
                ),
            ],

            const SizedBox(height: 16),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text(NumberFormat.currency(symbol: '₦').format(_total), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: (_error == null && _quantity > 0 && (widget.item.billingType == 'fixed' || _startDate != null)) 
            ? () {
                Navigator.pop(context, {
                  'quantity': _quantity,
                  'total': _total,
                  'startDate': _startDate?.toIso8601String(),
                  'endDate': _endDate?.toIso8601String(),
                  // Add more meta logic here if needed
                });
              } 
            : null,
          child: const Text('CONFIRM BOOKING'),
        ),
      ],
    );
  }
  
  String _getUnitLabel() {
    switch (widget.item.billingType) {
      case 'per_day': return 'Night';
      case 'per_hour': return 'Hour';
      default: return 'Unit';
    }
  }
}
