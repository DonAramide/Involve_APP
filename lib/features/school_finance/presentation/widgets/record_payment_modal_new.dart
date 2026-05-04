// lib/features/school_finance/presentation/widgets/record_payment_modal_new.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/finance_new_bloc.dart';
import '../bloc/finance_new_event.dart';
import '../bloc/finance_new_state.dart';

class RecordPaymentModal extends StatefulWidget {
  final String studentId;
  final String studentName;

  const RecordPaymentModal({
    super.key,
    required this.studentId,
    required this.studentName,
  });

  static void show(BuildContext context, {required String studentId, required String studentName}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => RecordPaymentModal(
        studentId: studentId, 
        studentName: studentName,
      ),
    );
  }

  @override
  State<RecordPaymentModal> createState() => _RecordPaymentModalState();
}

class _RecordPaymentModalState extends State<RecordPaymentModal> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<FinanceBloc, FinanceState>(
      listener: (context, state) {
        if (state.paymentSuccess) {
          // Close the modal after a short delay to show the success feedback
          Future.delayed(const Duration(milliseconds: 1500), () {
            if (mounted) Navigator.pop(context);
          });
        }
      },
      builder: (context, state) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            left: 24,
            right: 24,
            top: 24,
          ),
          child: state.paymentSuccess 
            ? _buildSuccessFeedback()
            : _buildForm(state),
        );
      },
    );
  }

  Widget _buildForm(FinanceState state) {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Record Payment',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          Text(
            'Recording payment for ${widget.studentName}',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          const SizedBox(height: 32),

          // Amount Input
          const Text('Amount', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          TextFormField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            onChanged: (v) => HapticFeedback.lightImpact(),
            decoration: InputDecoration(
              prefixText: '₦ ',
              hintText: '0',
              filled: true,
              fillColor: Colors.grey.shade50,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
            validator: (v) => (v == null || v.isEmpty || double.tryParse(v) == null) ? 'Enter a valid amount' : null,
          ),
          const SizedBox(height: 24),

          // Method (Hardcoded to Cash as requested for this feature)
          const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0052FF).withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF0052FF).withOpacity(0.2)),
            ),
            child: const Row(
              children: [
                Icon(Icons.money_outlined, color: Color(0xFF0052FF)),
                SizedBox(width: 12),
                Text('Cash Payment', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0052FF))),
                Spacer(),
                Icon(Icons.check_circle, color: Color(0xFF0052FF), size: 20),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Notes
          const Text('Note (Optional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          TextFormField(
            controller: _noteController,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'e.g. Paid in full for Q1',
              filled: true,
              fillColor: Colors.grey.shade50,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Error Message (if any)
          if (state.error != null) ...[
            Text(state.error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            const SizedBox(height: 16),
          ],

          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: state.isSubmitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0052FF),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: state.isSubmitting
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Record Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessFeedback() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 40),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Color(0xFF34A853),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check_rounded, color: Colors.white, size: 48),
        ),
        const SizedBox(height: 24),
        const Text(
          'Payment Recorded',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        const Text(
          'The student ledger is being updated in real-time.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 48),
      ],
    );
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      context.read<FinanceBloc>().add(RecordCashPayment(
        studentId: widget.studentId,
        amount: double.parse(_amountController.text),
        note: _noteController.text,
      ));
    }
  }
}
