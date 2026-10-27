// lib/features/health_insurance/presentation/pages/hmo_welcome_page.dart
import 'package:flutter/material.dart';
import '../utils/hmo_tour_storage.dart';
import 'hmo_guided_tour_page.dart';

class HmoWelcomePage extends StatelessWidget {
  static const String routeName = '/hmo_welcome';

  final String? userId;
  final String? tenantId;
  final String? schoolName;
  final String? hmoProviderName;
  final VoidCallback? onDismiss;

  const HmoWelcomePage({
    super.key,
    this.userId,
    this.tenantId,
    this.schoolName,
    this.hmoProviderName,
    this.onDismiss,
  });

  /// Displays the welcome experience as an accessible modal sheet or pushes as route.
  static Future<void> showAsModal(
    BuildContext context, {
    String? userId,
    String? tenantId,
    String? schoolName,
    String? hmoProviderName,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      enableDrag: true,
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.92,
        child: HmoWelcomePage(
          userId: userId,
          tenantId: tenantId,
          schoolName: schoolName,
          hmoProviderName: hmoProviderName,
          onDismiss: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  void _markCompletedAndClose(BuildContext context) {
    HmoTourStorage.setTourCompleted(userId: userId, tenantId: tenantId);
    if (onDismiss != null) {
      onDismiss!();
    } else {
      Navigator.of(context).maybePop();
    }
  }

  void _startTour(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => HmoGuidedTourPage(
          userId: userId,
          tenantId: tenantId,
          schoolName: schoolName,
          hmoProviderName: hmoProviderName,
          onFinish: () {
            _markCompletedAndClose(context);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            // Handle bar
            const SizedBox(height: 12),
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 12),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Image / Illustration Banner
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        height: 180,
                        width: double.infinity,
                        color: theme.colorScheme.primary.withValues(alpha: 0.08),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.asset(
                              'assets/images/hmo_welcome.jpg',
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.health_and_safety_rounded,
                                        size: 64,
                                        color: theme.colorScheme.primary,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Invify Health & Wellness',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: theme.colorScheme.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                            Positioned(
                              top: 12,
                              right: 12,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.6),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.verified, color: Colors.tealAccent, size: 14),
                                    const SizedBox(width: 4),
                                    Text(
                                      hmoProviderName ?? 'Verified HMO Partner',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Title
                    Text(
                      'Welcome to Health & Wellness',
                      key: const Key('hmo_welcome_title'),
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Introduction
                    Text(
                      '${schoolName != null && schoolName!.isNotEmpty ? schoolName! : "Your school"} coordinates digital healthcare coverage for eligible students, staff, and families in partnership with accredited Health Maintenance Organizations (HMOs).',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Educational Explanation Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.teal.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.teal.withValues(alpha: 0.25)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.info_outline, color: Colors.teal, size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'What is an HMO?',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: Colors.teal,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'A Health Maintenance Organization (HMO) is a licensed healthcare provider network that manages medical treatment, hospital consultations, emergency care, and prescription benefits under defined plan terms.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    height: 1.35,
                                    color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Key Capabilities / Benefits Grid
                    Text(
                      'What you can do here:',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),

                    _buildBenefitItem(
                      context,
                      icon: Icons.list_alt_rounded,
                      color: Colors.blue,
                      title: 'View Eligible School Plans',
                      description: 'Explore health plans, covered hospital tiers, consultations, and benefit limits selected by your institution.',
                    ),
                    _buildBenefitItem(
                      context,
                      icon: Icons.pie_chart_outline_rounded,
                      color: Colors.purple,
                      title: 'Transparent Contributions',
                      description: 'See whether your school subsidizes coverage and understand exact member premium contributions before enrolling.',
                    ),
                    _buildBenefitItem(
                      context,
                      icon: Icons.track_changes_rounded,
                      color: Colors.orange,
                      title: 'Live Enrolment Tracking',
                      description: 'Submit beneficiary applications and monitor real-time verification and underwriter approval stages.',
                    ),
                    _buildBenefitItem(
                      context,
                      icon: Icons.badge_outlined,
                      color: Colors.green,
                      title: 'Digital Health ID',
                      description: 'Access hospital check-in passes and policy numbers once enrollment activation is confirmed by the HMO.',
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Bottom Actions Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: theme.scaffoldBackgroundColor,
                border: Border(
                  top: BorderSide(color: theme.dividerColor.withValues(alpha: 0.1)),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Primary Button: Take Quick Tour
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      key: const Key('hmo_take_tour_button'),
                      onPressed: () => _startTour(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 1,
                      ),
                      icon: const Icon(Icons.explore_outlined, size: 20),
                      label: const Text(
                        'Take the Quick Tour (1 min)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  Row(
                    children: [
                      // Secondary: Explore Health & Wellness
                      Expanded(
                        child: OutlinedButton(
                          key: const Key('hmo_explore_button'),
                          onPressed: () => _markCompletedAndClose(context),
                          style: OutlinedButton.styleFrom(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text('Explore Dashboard'),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Tertiary: Skip for now
                      TextButton(
                        key: const Key('hmo_skip_button'),
                        onPressed: () => _markCompletedAndClose(context),
                        child: Text(
                          'Skip for now',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBenefitItem(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String description,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
