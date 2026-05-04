// lib/features/school_finance/presentation/pages/defaulters_page.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../../../core/services/service_locator.dart';
import 'package:intl/intl.dart';

class DefaultersPage extends StatefulWidget {
  const DefaultersPage({super.key});

  @override
  State<DefaultersPage> createState() => _DefaultersPageState();
}

class _DefaultersPageState extends State<DefaultersPage> {
  final _repository = sl<FinanceRepository>();
  List<dynamic> _defaulters = [];
  bool _isLoading = true;
  String? _selectedClass;

  @override
  void initState() {
    super.initState();
    _fetchDefaulters();
  }

  Future<void> _fetchDefaulters() async {
    setState(() => _isLoading = true);
    try {
      final data = await _repository.getDefaulters(className: _selectedClass);
      setState(() {
        _defaulters = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _sendReminder(Map<String, dynamic> student) async {
    try {
      await _repository.sendReminder(student['studentId'], student['outstanding']);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reminder sent successfully!'), backgroundColor: Colors.green));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to send reminder: $e'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Fee Defaulters', style: TextStyle(fontWeight: FontWeight.w900)),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        actions: [
          IconButton(icon: const Icon(Icons.sort_rounded), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _fetchDefaulters,
                    child: _defaulters.isEmpty
                        ? _buildEmptyState()
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _defaulters.length,
                            itemBuilder: (context, index) => _buildDefaulterCard(_defaulters[index]),
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    final classes = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
    return Container(
      height: 60,
      color: Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        itemCount: classes.length + 1,
        itemBuilder: (context, index) {
          final isAll = index == 0;
          final className = isAll ? 'All Classes' : classes[index - 1];
          final isSelected = isAll ? _selectedClass == null : _selectedClass == className;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(className),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  _selectedClass = isAll ? null : className;
                });
                _fetchDefaulters();
              },
              selectedColor: const Color(0xFF1A1C1E),
              labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black87, fontWeight: FontWeight.bold),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDefaulterCard(Map<String, dynamic> item) {
    final currencyFormat = NumberFormat.currency(symbol: '₦', decimalDigits: 0);
    final outstanding = item['outstanding'] as double;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.withOpacity(0.1)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: Colors.red.shade50,
                child: Text(item['studentName'][0], style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['studentName'], style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                    Text(item['class'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(currencyFormat.format(outstanding), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.red)),
                  const Text('Outstanding', style: TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.person_outline, size: 16),
                  label: const Text('Profile'),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    foregroundColor: Colors.black87,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _sendReminder(item),
                  icon: const Icon(Icons.notifications_active_outlined, size: 16),
                  label: const Text('Remind'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline_rounded, size: 64, color: Colors.green.shade200),
          const SizedBox(height: 16),
          const Text('No defaulters found!', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
          const Text('All students have cleared their fees.', style: TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }
}
