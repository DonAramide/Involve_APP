import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('About'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            // App Icon/Logo (Directly on background)
            Image.asset(
              'assets/images/logo_transparent.png',
              width: 150,
              height: 150,
            ),
            const SizedBox(height: 24),
            
            // App Name
            const Text(
              'Invify',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            
            // Version
            const Text(
              'Version 1.0.0',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 32),
            
            // Description
            const Text(
              'A comprehensive Point of Sale (POS) system designed for bars, hotels, and retail businesses. Manage inventory, create invoices, track sales, and print receipts with ease.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 40),
            
            // Features
            _buildFeatureCard(
              context,
              icon: Icons.inventory_2,
              title: 'Stock Management',
              description: 'Track and manage your inventory efficiently',
            ),
            const SizedBox(height: 16),
            _buildFeatureCard(
              context,
              icon: Icons.receipt_long,
              title: 'Invoice Generation',
              description: 'Create professional invoices with PDF support',
            ),
            const SizedBox(height: 16),
            _buildFeatureCard(
              context,
              icon: Icons.print,
              title: 'Thermal Printing',
              description: 'Print receipts to Bluetooth thermal printers',
            ),
            const SizedBox(height: 16),
            _buildFeatureCard(
              context,
              icon: Icons.share,
              title: 'Share & Export',
              description: 'Share receipts via WhatsApp, Email, or save as PDF',
            ),
            const SizedBox(height: 40),
            
            // Powered by
            const Divider(),
            const SizedBox(height: 20),
            const Text(
              'Powered by',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 16),
            // IIPS Logo without the rounded background (doubled size)
            Image.asset(
              'assets/images/iips_logo.png',
              height: 200,
            ),
            const SizedBox(height: 16),
            const Text(
              'Integrated Independent Products & Services',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.blueGrey,
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureCard(BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: Theme.of(context).primaryColor,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
