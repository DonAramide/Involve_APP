import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:printing/printing.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'dart:typed_data';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/terminology.dart';

class AppUserGuidePage extends StatelessWidget {
  const AppUserGuidePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, state) {
        final settings = state.settings;
        final mode = settings?.businessMode ?? 'retail';
        final modeTitle = mode == 'school' ? 'School' : (mode == 'services' ? 'Services' : 'Retail');
        
        return Scaffold(
          appBar: AppBar(
            title: Text('$modeTitle Mode User Guide'),
            actions: [
              IconButton(
                icon: const Icon(Icons.picture_as_pdf),
                tooltip: 'Print to PDF',
                onPressed: () => _printGuide(context, state),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _buildHeader(context, modeTitle),
              const SizedBox(height: 24),
              _buildIntroduction(mode),
              const SizedBox(height: 16),
              _buildChecklist(mode),
              _buildSections(context, settings),
              const SizedBox(height: 40),
              Center(
                child: Text(
                  '© 2026 Invify | ${modeTitle} Management Solutions',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, String modeTitle) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).primaryColor, Color.lerp(Theme.of(context).primaryColor, Colors.black, 0.2)!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Icon(Icons.auto_stories, size: 64, color: Colors.white),
          const SizedBox(height: 16),
          Text(
            'Invify $modeTitle Mode',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          Text(
            'Comprehensive User Guide & Manual',
            style: TextStyle(color: Colors.white.withOpacity(0.9)),
          ),
        ],
      ),
    );
  }

  Widget _buildIntroduction(String mode) {
    String text = '';
    if (mode == 'school') {
      text = 'Welcome to the specialized environment for educational institutions. Manage fees, students, academic records, and collection analytics with ease.';
    } else if (mode == 'services') {
      text = 'Welcome to the Services & Job Management hub. Track work orders, manage client service history, and handle professional billing effortlessly.';
    } else {
      text = 'Welcome to your Retail & POS power tool. Track stock levels, manage customer sales, and monitor your business revenue in real-time.';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Introduction',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          text,
          style: const TextStyle(color: Colors.blueGrey, fontSize: 15),
        ),
      ],
    );
  }

  Widget _buildChecklist(String mode) {
    return Card(
      color: Colors.orange.shade50,
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.flag, color: Colors.orange),
                SizedBox(width: 8),
                Text('GETTING STARTED CHECKLIST', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange)),
              ],
            ),
            const SizedBox(height: 12),
            if (mode == 'school') ...[
              _buildChecklistItem('1. Academic Setup', 'Define your Year and active term.'),
              _buildChecklistItem('2. Classes & Subjects', 'Create grade levels and curriculum.'),
              _buildChecklistItem('3. Grading Rules', 'Set score ranges (A, B, C, etc.).'),
              _buildChecklistItem('4. Fee Catalog', 'Add tuition and other fee items.'),
              _buildChecklistItem('5. Enrolment', 'Add students to respective classes.'),
            ] else if (mode == 'services') ...[
              _buildChecklistItem('1. Service Catalog', 'Define the types of services you offer and their rates.'),
              _buildChecklistItem('2. Client Directory', 'Add your regular clients for easy billing.'),
              _buildChecklistItem('3. Job Workflow', 'Learn how to create and manage jobs from Pending to Completed.'),
            ] else ...[
              _buildChecklistItem('1. Inventory Setup', 'Add your products, categories, and stock levels.'),
              _buildChecklistItem('2. Pricing', 'Configure cost and selling prices for accurate profit tracking.'),
              _buildChecklistItem('3. POS Ready', 'Connect your printer and start issuing receipts.'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSections(BuildContext context, dynamic settings) {
    final mode = settings?.businessMode ?? 'retail';
    
    if (mode == 'school') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('1. Core Dashboard Functions'),
          _buildFeatureItem('NEW TERM BILL', 'Issue receipts to students. Search for students, select fees, and process payments.', Icons.receipt_long, Colors.cyan),
          _buildFeatureItem('FEE MANAGEMENT', 'Dashboard for all billing activities. Supports batch billing and history.', Icons.payments, Colors.orange),
          _buildTipBox('Carry Forward Logic', 'The system automatically detects outstanding balances from previous terms and adds them to new bills.'),
          _buildSectionTitle('2. Administration'),
          _buildFeatureItem('STUDENT DIRECTORY', 'Manage enrollment, contacts, and individual balances.', Icons.people, Colors.indigo),
          _buildFeatureItem('ACADEMIC SETUP', 'Configure years, terms, classes, and subjects.', Icons.school, Colors.brown),
          _buildSectionTitle('3. Academic Tools'),
          _buildFeatureItem('RESULT ENTRY', 'Digitize academic performance with dynamic grade calculation.', Icons.edit_note, Colors.redAccent),
          _buildFeatureItem('STUDENT ANALYTICS', 'Visual reporting for revenue trends and student statistics.', Icons.analytics, Colors.blueAccent),
        ],
      );
    } else if (mode == 'services') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('1. Job Management'),
          _buildFeatureItem('NEW JOB / WORK ORDER', 'Initiate a new service request. Define client, tasks, and estimated costs.', Icons.add_task, Colors.green),
          _buildFeatureItem('SERVICES DASHBOARD', 'Overview of all active, pending, and completed jobs.', Icons.dashboard, Colors.blue),
          _buildTipBox('Workmanship vs Material', 'You can separate professional fees from material costs in each job invoice.'),
          _buildSectionTitle('2. Client & History'),
          _buildFeatureItem('CLIENT LEDGER', 'Track billing history and outstanding payments per client.', Icons.person_search, Colors.purple),
          _buildFeatureItem('SERVICE RECORDS', 'Detailed logs of all services rendered over time.', Icons.history, Colors.orange),
        ],
      );
    } else {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('1. Sales & POS'),
          _buildFeatureItem('NEW INVOICE / SALE', 'Quickly generate receipts. Use barcode scanning or search for items.', Icons.shopping_cart, Colors.indigo),
          _buildFeatureItem('SALES RECORDS', 'Complete history of all transactions with refund and reprint options.', Icons.assessment, Colors.green),
          _buildTipBox('Offline Capability', 'Transactions are saved locally first and synced when connection is available.'),
          _buildSectionTitle('2. Inventory Control'),
          _buildFeatureItem('STOCK MANAGEMENT', 'Track stock levels, set reorder alerts, and manage product variants.', Icons.inventory, Colors.orange),
          _buildFeatureItem('INVENTORY REPORT', 'View valuation of current stock and profit/loss projections.', Icons.assessment_outlined, Colors.blueGrey),
        ],
      );
    }
  }

  Widget _buildChecklistItem(String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_box_outline_blank, size: 18, color: Colors.orange),
          const SizedBox(width: 8),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(color: Colors.black87, fontSize: 13),
                children: [
                  TextSpan(text: '$title: ', style: const TextStyle(fontWeight: FontWeight.bold)),
                  TextSpan(text: desc),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
      child: Text(
        title,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blueGrey),
      ),
    );
  }

  Widget _buildFeatureItem(String title, String desc, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 4),
                Text(desc, style: const TextStyle(color: Colors.grey, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTipBox(String title, String content) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        border: Border(left: BorderSide(color: Colors.blue.shade400, width: 4)),
        borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade800)),
          const SizedBox(height: 4),
          Text(content, style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }

  Future<void> _printGuide(BuildContext context, SettingsState state) async {
    final pdf = pw.Document();
    final settings = state.settings;
    final mode = settings?.businessMode ?? 'retail';
    final modeTitle = mode == 'school' ? 'School' : (mode == 'services' ? 'Services' : 'Retail');

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Text('Invify $modeTitle Mode User Guide', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
            ),
            pw.Paragraph(text: 'Comprehensive Feature Manual & Guide'),
            pw.Divider(),
            pw.Header(level: 1, text: 'Introduction'),
            pw.Paragraph(text: mode == 'school' 
              ? 'Educational institution management.' 
              : (mode == 'services' ? 'Professional service and job tracking.' : 'Retail and inventory management.')),
            pw.SizedBox(height: 20),
            pw.Header(level: 1, text: 'Core Functions'),
            if (mode == 'school') ...[
              pw.Bullet(text: 'NEW TERM BILL: Issue receipts to students.'),
              pw.Bullet(text: 'FEE MANAGEMENT: Dashboard for billing and batch operations.'),
              pw.Bullet(text: 'STUDENT DIRECTORY: Manage enrollment and parent contacts.'),
              pw.Bullet(text: 'RESULT ENTRY: Scoring and grade calculation.'),
            ] else if (mode == 'services') ...[
              pw.Bullet(text: 'NEW JOB / WORK ORDER: Initiate service requests.'),
              pw.Bullet(text: 'SERVICES DASHBOARD: Track job statuses.'),
              pw.Bullet(text: 'CLIENT LEDGER: Billing history per client.'),
            ] else ...[
              pw.Bullet(text: 'NEW INVOICE / SALE: Quick checkout and POS.'),
              pw.Bullet(text: 'STOCK MANAGEMENT: Inventory and reorder alerts.'),
              pw.Bullet(text: 'SALES RECORDS: Transaction history and reporting.'),
            ],
            pw.Footer(
              trailing: pw.Text('Invify Management Solutions | 2026'),
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}
