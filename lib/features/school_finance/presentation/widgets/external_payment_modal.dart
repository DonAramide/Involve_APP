// lib/features/school_finance/presentation/widgets/external_payment_modal.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import '../bloc/finance_new_bloc.dart';
import '../bloc/finance_new_event.dart';
import '../bloc/finance_new_state.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

class ExternalPaymentModal extends StatefulWidget {
  final String studentId;
  final String walletId;
  final String studentName;
  final double amount;

  const ExternalPaymentModal({
    super.key,
    required this.studentId,
    required this.walletId,
    required this.studentName,
    required this.amount,
  });

  static Future<void> show(
    BuildContext context, {
    required String studentId,
    required String walletId,
    required String studentName,
    required double amount,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ExternalPaymentModal(
        studentId: studentId,
        walletId: walletId,
        studentName: studentName,
        amount: amount,
      ),
    );
  }

  @override
  State<ExternalPaymentModal> createState() => _ExternalPaymentModalState();
}

class _ExternalPaymentModalState extends State<ExternalPaymentModal> {
  bool _launched = false;

  @override
  void initState() {
    super.initState();
    // Auto-initiate the payment when modal opens
    _initiate();
  }

  void _initiate() {
    context.read<FinanceBloc>().add(InitiateExternalPayment(
          studentId: widget.studentId,
          walletId: widget.walletId,
          amount: widget.amount,
          studentName: widget.studentName,
        ));
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      setState(() => _launched = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<FinanceBloc, FinanceState>(
      listener: (context, state) {
        if (state.paymentIntent != null && !_launched) {
          final intent = state.paymentIntent!['intent'];
          final checkoutUrl = intent['checkoutUrl'] ?? intent['authorization_url'];
          if (checkoutUrl != null) {
            _launchUrl(checkoutUrl);
          }
        }
        if (state.paymentSuccess) {
          // Navigator.pop(context); // Optional: close on success
        }
      },
      builder: (context, state) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeader(),
              const SizedBox(height: 32),
              if (state.isSubmitting) _buildLoadingState(),
              if (state.error != null) _buildErrorState(state.error!),
              if (state.paymentIntent != null) _buildWaitingState(state),
              if (state.paymentSuccess) _buildSuccessState(),
              const SizedBox(height: 32),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Online Payment',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.close_rounded),
          style: IconButton.styleFrom(
            backgroundColor: Colors.grey.shade100,
            padding: const EdgeInsets.all(8),
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingState() {
    return const InvifyLoadingIndicator(message: 'INITIALIZING SECURE CHECKOUT...');
  }

  Widget _buildErrorState(String error) {
    return Column(
      children: [
        const Icon(Icons.error_outline_rounded, color: Colors.red, size: 48),
        const SizedBox(height: 16),
        Text(error, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _initiate,
          child: const Text('Retry'),
        ),
      ],
    );
  }

  Widget _buildWaitingState(FinanceState state) {
    final reference = state.paymentIntent!['reference'];
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFFBBC05).withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Column(
            children: [
              Icon(Icons.sync, size: 28, color: Color(0xFFFBBC05)),
              SizedBox(height: 16),
              Text(
                'Waiting for confirmation',
                style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFC08C00)),
              ),
              SizedBox(height: 8),
              Text(
                'Once you complete the payment in your browser, this screen will update automatically.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Color(0xFFC08C00)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Reference: $reference',
          style: const TextStyle(fontFamily: 'monospace', fontSize: 13, color: Colors.blueGrey),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () => _launchUrl(state.paymentIntent!['intent']['checkoutUrl'] ?? state.paymentIntent!['intent']['authorization_url']),
          child: const Text('Re-open payment page'),
        ),
      ],
    );
  }

  Widget _buildSuccessState() {
    return Column(
      children: [
        const Icon(Icons.check_circle_rounded, color: Color(0xFF34A853), size: 64),
        const SizedBox(height: 16),
        const Text(
          'Payment Successful!',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF34A853)),
        ),
        const SizedBox(height: 8),
        const Text('Your balance has been updated.', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF34A853),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Done'),
          ),
        ),
      ],
    );
  }
}
