import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/validators.dart';
import 'package:involve_app/features/stock/domain/entities/expense.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';

class LogExpenseDialog extends StatefulWidget {
  final StockBloc stockBloc;

  const LogExpenseDialog({super.key, required this.stockBloc});

  @override
  State<LogExpenseDialog> createState() => _LogExpenseDialogState();
}

class _LogExpenseDialogState extends State<LogExpenseDialog> {
  final _formKey = GlobalKey<FormState>();
  double _amount = 0.0;
  String _description = '';
  String? _category;
  DateTime _selectedDate = DateTime.now();

  final List<String> _categories = [
    'Rent',
    'Electricity',
    'Salaries',
    'Transport',
    'Marketing',
    'Maintenance',
    'Other',
  ];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Log Business Expense'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                decoration: const InputDecoration(labelText: 'Amount'),
                keyboardType: TextInputType.number,
                onSaved: (val) => _amount = double.tryParse(val ?? '0') ?? 0.0,
                validator: (val) => InputValidator.validateNumber(val, 'Amount'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (val) => setState(() => _category = val),
                validator: (val) => val == null ? 'Please select a category' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Description'),
                onSaved: (val) => _description = val ?? '',
                validator: (val) => InputValidator.validateNotEmpty(val, 'Description'),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Date'),
                subtitle: Text('${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (picked != null) {
                    setState(() => _selectedDate = picked);
                  }
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
        ElevatedButton(
          onPressed: _submit,
          child: const Text('LOG EXPENSE'),
        ),
      ],
    );
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      
      final expense = Expense(
        amount: _amount,
        description: _description,
        category: _category,
        date: _selectedDate,
      );

      widget.stockBloc.add(AddExpenseRequested(expense));
      Navigator.pop(context);
    }
  }
}
