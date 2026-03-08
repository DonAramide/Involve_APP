import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'dart:typed_data';

class SchoolUserGuidePage extends StatelessWidget {
  const SchoolUserGuidePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('School Mode User Guide'),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: 'Print to PDF',
            onPressed: () => _printGuide(context),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildHeader(context),
          const SizedBox(height: 24),
          _buildIntroduction(),
          const SizedBox(height: 16),
          _buildChecklist(),
          _buildSectionTitle('1. Core Dashboard Functions'),
          _buildFeatureItem(
            'NEW TERM BILL (Generate Bill)',
            'The primary tool for issuing receipts. Use the search bar for students, select fees, choose payment method, and process.',
            Icons.receipt_long,
            Colors.cyan,
          ),
          _buildFeatureItem(
            'FEE MANAGEMENT',
            'Dashboard for all billing activities. Support for batch billing, setting default fees, and viewing history.',
            Icons.payments,
            Colors.orange,
          ),
          _buildTipBox('PRO TIP: Carry Forward Logic', 'The system automatically detects outstanding balances from previous terms and adds them to new bills.'),
          _buildSectionTitle('2. Academic & Student Administration'),
          _buildFeatureItem(
            'STUDENT DIRECTORY / PROFILE',
            'Manage enrollment, parent contacts, billing history, and individual balances.',
            Icons.people,
            Colors.indigo,
          ),
          _buildFeatureItem(
            'ACADEMIC SETUP',
            'Configure years, terms, classes, grading rules, and subjects.',
            Icons.school,
            Colors.brown,
          ),
          _buildSectionTitle('3. Advanced Academic Tools'),
          _buildFeatureItem(
            'RESULT ENTRY',
            'Digitize academic performance. Dedicated CA/Exam fields with dynamic grade calculation.',
            Icons.edit_note,
            Colors.redAccent,
          ),
          _buildFeatureItem(
            'STUDENT ANALYTICS',
            'Visual reporting with pie charts, bar charts, and revenue trends.',
            Icons.analytics,
            Colors.blueAccent,
          ),
          _buildSectionTitle('4. Communication & Staff'),
          _buildFeatureItem(
            'CONTACT DIRECTORY',
            'Single source of truth for management, teachers, and parents with direct call/WhatsApp actions.',
            Icons.contact_phone,
            Colors.teal,
          ),
          const SizedBox(height: 40),
          const Center(
            child: Text(
              '© 2026 Invify | Innovative School Management',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Icon(Icons.auto_stories, size: 64, color: Colors.white),
          const SizedBox(height: 16),
          const Text(
            'Invify School Mode',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          Text(
            'Comprehensive User Guide & Manual',
            style: TextStyle(color: Colors.white.withOpacity(0.9)),
          ),
        ],
      ),
    );
  }

  Widget _buildIntroduction() {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Welcome to the specialized environment for educational institutions.',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        SizedBox(height: 8),
        Text(
          'Manage fees, students, academic records, and collection analytics with ease.',
          style: TextStyle(color: Colors.blueGrey),
        ),
      ],
    );
  }

  Widget _buildChecklist() {
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
            _buildChecklistItem('1. Academic Setup', 'Define your Year and active term.'),
            _buildChecklistItem('2. Classes & Subjects', 'Create grade levels and curriculum.'),
            _buildChecklistItem('3. Grading Rules', 'Set score ranges (A, B, C, etc.).'),
            _buildChecklistItem('4. Fee Catalog', 'Add tuition and other fee items.'),
            _buildChecklistItem('5. Enrolment', 'Add students to respective classes.'),
          ],
        ),
      ),
    );
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

  Future<void> _printGuide(BuildContext context) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Text('Invify School Mode User Guide', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
            ),
            pw.Paragraph(text: 'Comprehensive Feature Manual & Guide'),
            pw.Divider(),
            pw.Header(level: 1, text: 'Getting Started Checklist'),
            pw.Bullet(text: 'Academic Setup: Define Year and Active Term'),
            pw.Bullet(text: 'Classes & Subjects: Setup Curriculum'),
            pw.Bullet(text: 'Grading Rules: Set score ranges'),
            pw.Bullet(text: 'Fee Catalog: Add tuition items'),
            pw.Bullet(text: 'Enrolment: Register students'),
            pw.SizedBox(height: 20),
            pw.Header(level: 1, text: 'Core Functions'),
            pw.Bullet(text: 'NEW TERM BILL: Primary tool for issuing receipts.'),
            pw.Bullet(text: 'FEE MANAGEMENT: Dashboard for billing and batch operations.'),
            pw.Bullet(text: 'STUDENT DIRECTORY: Manage enrollment and parent contacts.'),
            pw.Bullet(text: 'ACADEMIC SETUP: Core system configuration.'),
            pw.Bullet(text: 'RESULT ENTRY: Scoring and grade calculation.'),
            pw.Bullet(text: 'STUDENT ANALYTICS: Visual reporting and charts.'),
            pw.Bullet(text: 'CONTACT DIRECTORY: Integrated communication tool.'),
            pw.Footer(
              trailing: pw.Text('Invify School Management | 2026'),
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}
