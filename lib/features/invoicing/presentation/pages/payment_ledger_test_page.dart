import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';

class PaymentLedgerTestPage extends StatefulWidget {
  const PaymentLedgerTestPage({super.key});

  @override
  State<PaymentLedgerTestPage> createState() => _PaymentLedgerTestPageState();
}

class _PaymentLedgerTestPageState extends State<PaymentLedgerTestPage> {
  final supabase = Supabase.instance.client;
  List<Map<String, dynamic>> ledgerEntries = [];
  List<Map<String, dynamic>> students = [];
  bool isLoading = true;
  String? currentSchoolId;

  @override
  void initState() {
    super.initState();
    _fetchData();
    _setupRealtime();
  }

  Future<void> _fetchData() async {
    try {
      // For testing, we just pick the first school we find if currentSchoolId is null
      if (currentSchoolId == null) {
        final schoolRes = await supabase.from('schools').select('id').limit(1).maybeSingle();
        currentSchoolId = schoolRes?['id'];
      }

      final studentsRes = await supabase.from('students').select('id, first_name, last_name, admission_number, running_balance');
      final ledgerRes = await supabase.from('ledgers').select('*, students(first_name, last_name)').order('created_at', ascending: false).limit(20);
      
      setState(() {
        students = List<Map<String, dynamic>>.from(studentsRes);
        ledgerEntries = List<Map<String, dynamic>>.from(ledgerRes);
        isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching data: $e');
      setState(() => isLoading = false);
    }
  }

  void _setupRealtime() {
    supabase
        .channel('public:ledgers')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'ledgers',
          callback: (payload) {
            _fetchData(); // Refresh on any change
          },
        )
        .subscribe();
  }

  Future<void> _triggerTestPayment(String studentId) async {
    if (currentSchoolId == null) return;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      // Note: Use your actual server IP/URL if not running locally on emulator
      final response = await http.post(
        Uri.parse('http://10.0.2.2:3000/api/test/mock-webhook'), 
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'studentId': studentId,
          'amount': 15000,
          'schoolId': currentSchoolId,
        }),
      );

      Navigator.pop(context); // Close loading

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🚀 Mock Webhook Triggered! Processing...'), backgroundColor: Colors.green),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Failed: ${response.body}'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
       Navigator.pop(context);
       ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(content: Text('❌ Connection Error: $e'), backgroundColor: Colors.red),
       );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: '₦', decimalDigits: 2);

    return Scaffold(
      appBar: AppBar(
        title: const Text('SFOS Test Suite'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchData),
        ],
      ),
      body: isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              // 1. Students List
              Container(
                padding: const EdgeInsets.all(16),
                alignment: Alignment.centerLeft,
                child: const Text('Students (Select to Pay)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ),
              Expanded(
                flex: 2,
                child: ListView.builder(
                  itemCount: students.length,
                  itemBuilder: (context, index) {
                    final s = students[index];
                    return ListTile(
                      title: Text('${s['first_name']} ${s['last_name']}'),
                      subtitle: Text('ID: ${s['admission_number']}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(currencyFormat.format(s['running_balance'] ?? 0), 
                            style: TextStyle(color: (s['running_balance'] ?? 0) < 0 ? Colors.red : Colors.green, fontWeight: FontWeight.bold)),
                          Text('Balance', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                      onTap: () => _triggerTestPayment(s['id']),
                    );
                  },
                ),
              ),
              const Divider(thickness: 2),
              // 2. Real-time Ledger Feed
              Container(
                padding: const EdgeInsets.all(16),
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    const Icon(Icons.bolt, color: Colors.orange),
                    const SizedBox(width: 8),
                    const Text('Live Ledger Feed', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  ],
                ),
              ),
              Expanded(
                flex: 3,
                child: ledgerEntries.isEmpty 
                  ? const Center(child: Text('No transactions yet'))
                  : ListView.builder(
                      itemCount: ledgerEntries.length,
                      itemBuilder: (context, index) {
                        final entry = ledgerEntries[index];
                        final isCredit = entry['amount'] > 0;
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: ListTile(
                            leading: Icon(isCredit ? Icons.add_circle : Icons.remove_circle, 
                              color: isCredit ? Colors.green : Colors.red),
                            title: Text('${entry['students']?['first_name']} ${entry['students']?['last_name']}'),
                            subtitle: Text(entry['description'] ?? entry['transaction_type']),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(currencyFormat.format(entry['amount']), 
                                  style: TextStyle(fontWeight: FontWeight.bold, color: isCredit ? Colors.green : Colors.red)),
                                Text(DateFormat('HH:mm:ss').format(DateTime.parse(entry['created_at'])), style: const TextStyle(fontSize: 10)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
              ),
            ],
          ),
    );
  }
}
