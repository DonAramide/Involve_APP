// lib/features/health_insurance/presentation/pages/hmo_guided_tour_page.dart
import 'package:flutter/material.dart';
import '../utils/hmo_tour_storage.dart';

class HmoTourStep {
  final String title;
  final String subtitle;
  final String imageAsset;
  final IconData fallbackIcon;
  final Color themeColor;
  final List<String> bulletPoints;
  final String? calloutText;
  final bool isNotice;

  const HmoTourStep({
    required this.title,
    required this.subtitle,
    required this.imageAsset,
    required this.fallbackIcon,
    required this.themeColor,
    required this.bulletPoints,
    this.calloutText,
    this.isNotice = false,
  });
}

class HmoGuidedTourPage extends StatefulWidget {
  static const String routeName = '/hmo_guided_tour';

  final String? userId;
  final String? tenantId;
  final String? schoolName;
  final String? hmoProviderName;
  final VoidCallback? onFinish;

  const HmoGuidedTourPage({
    super.key,
    this.userId,
    this.tenantId,
    this.schoolName,
    this.hmoProviderName,
    this.onFinish,
  });

  @override
  State<HmoGuidedTourPage> createState() => _HmoGuidedTourPageState();
}

class _HmoGuidedTourPageState extends State<HmoGuidedTourPage> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  late final List<HmoTourStep> _steps;

  @override
  void initState() {
    super.initState();
    final school = widget.schoolName?.trim().isNotEmpty == true ? widget.schoolName! : 'Your School';
    final hmo = widget.hmoProviderName?.trim().isNotEmpty == true ? widget.hmoProviderName! : 'Accredited HMO Partners';

    _steps = [
      // Step 1: Welcome to Health & Wellness
      HmoTourStep(
        title: 'Welcome to Health & Wellness',
        subtitle: '$school has partnered with $hmo to provide an integrated digital healthcare experience for eligible students and staff.',
        imageAsset: 'assets/images/hmo_welcome.jpg',
        fallbackIcon: Icons.health_and_safety_rounded,
        themeColor: Colors.teal,
        bulletPoints: [
          'View health plans tailored specifically for your school community.',
          'Track enrollment verification status live from your phone.',
          'Access a Digital Health ID pass once coverage is verified and activated.',
          'Clear visibility into what your school and the HMO each provide.',
        ],
        calloutText: 'Digital Health Pass is issued exclusively after policy confirmation.',
      ),

      // Step 2: What is an HMO?
      const HmoTourStep(
        title: 'What is an HMO?',
        subtitle: 'A Health Maintenance Organization (HMO) coordinates medical care through an authorized network of healthcare professionals.',
        imageAsset: 'assets/images/hmo_what_is.png',
        fallbackIcon: Icons.local_hospital_rounded,
        themeColor: Colors.indigo,
        bulletPoints: [
          'Direct access to designated clinics, private hospitals, and diagnostic centers.',
          'Coverage for outpatient consultations, inpatient admissions, and prescription drugs.',
          '24/7 emergency medical support and pre-authorized hospital admissions.',
          'No out-of-pocket payment required for covered benefits at network facilities.',
        ],
        calloutText: 'Covered hospital tiers and benefits depend on your school\'s selected plan.',
      ),

      // Step 3: Explore your school's plans
      HmoTourStep(
        title: 'Explore School Health Plans',
        subtitle: '$school administration selects and configures the exact plan packages offered to eligible families and staff.',
        imageAsset: 'assets/images/hmo_plans.png',
        fallbackIcon: Icons.menu_book_rounded,
        themeColor: Colors.purple,
        bulletPoints: [
          'Compare covered benefits, hospital tiers, and annual premium schedules.',
          'See if your school subsidizes coverage (school-funded, shared, or member-paid).',
          'Understand your exact family contribution before initiating enrollment.',
          'Transparent basis-point splits guarantee zero hidden charges.',
        ],
        calloutText: 'If no plans are currently visible, your school administration has not published them yet.',
      ),

      // Step 4: How enrollment works
      const HmoTourStep(
        title: 'How Enrollment Works',
        subtitle: 'A streamlined, 5-step journey ensures your beneficiary is enrolled and registered with the health insurer.',
        imageAsset: 'assets/images/hmo_enrollment.png',
        fallbackIcon: Icons.assignment_turned_in_rounded,
        themeColor: Colors.teal,
        bulletPoints: [
          '1. Select Beneficiary: Choose your linked child from the verified roster.',
          '2. Choose Plan: Pick an eligible school health package.',
          '3. Review Contribution: Confirm subsidy and parent share.',
          '4. Submit Request: Registered with school administration for verification.',
          '5. Insurer Activation: HMO issues policy number and digital ID pass.',
        ],
        calloutText: 'IMPORTANT: Submitting enrollment does NOT immediately activate coverage. Full coverage begins once verified and activated by the insurer.',
        isNotice: true,
      ),
    ];
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _finishTour() {
    HmoTourStorage.setTourCompleted(
      userId: widget.userId,
      tenantId: widget.tenantId,
      completed: true,
    );
    if (widget.onFinish != null) {
      widget.onFinish!();
    } else {
      Navigator.of(context).pop();
    }
  }

  void _nextPage() {
    if (_currentIndex < _steps.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeInOut,
      );
    } else {
      _finishTour();
    }
  }

  void _previousPage() {
    if (_currentIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isLastStep = _currentIndex == _steps.length - 1;
    final step = _steps[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Step ${_currentIndex + 1} of ${_steps.length}',
          key: const Key('hmo_tour_step_counter'),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            key: const Key('hmo_tour_skip_button'),
            onPressed: _finishTour,
            child: const Text('Skip Tour'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Progress Bar
            LinearProgressIndicator(
              value: (_currentIndex + 1) / _steps.length,
              backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
              valueColor: AlwaysStoppedAnimation<Color>(step.themeColor),
              minHeight: 4,
            ),

            // Page View
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _steps.length,
                onPageChanged: (index) {
                  setState(() => _currentIndex = index);
                },
                itemBuilder: (context, index) {
                  return _buildStepContent(context, _steps[index]);
                },
              ),
            ),

            // Bottom Navigation Toolbar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: theme.scaffoldBackgroundColor,
                border: Border(
                  top: BorderSide(color: theme.dividerColor.withValues(alpha: 0.12)),
                ),
              ),
              child: Row(
                children: [
                  // Back Button (hidden on first page)
                  if (_currentIndex > 0)
                    OutlinedButton.icon(
                      key: const Key('hmo_tour_back_button'),
                      onPressed: _previousPage,
                      icon: const Icon(Icons.arrow_back, size: 16),
                      label: const Text('Back'),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    )
                  else
                    const SizedBox(width: 80),

                  const Spacer(),

                  // Dots Indicator
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(
                      _steps.length,
                      (index) => Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _currentIndex == index ? 20 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentIndex == index
                              ? step.themeColor
                              : (isDark ? Colors.grey.shade700 : Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),

                  const Spacer(),

                  // Next / Finish Button
                  ElevatedButton.icon(
                    key: const Key('hmo_tour_next_button'),
                    onPressed: _nextPage,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isLastStep ? Colors.teal : theme.colorScheme.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 1,
                    ),
                    icon: Icon(isLastStep ? Icons.check_circle_outline : Icons.arrow_forward, size: 18),
                    label: Text(
                      isLastStep ? 'Get Started' : 'Next',
                      style: const TextStyle(fontWeight: FontWeight.bold),
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

  Widget _buildStepContent(BuildContext context, HmoTourStep step) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Illustration Card
          Center(
            child: Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: step.themeColor.withValues(alpha: 0.08),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset(
                  step.imageAsset,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Center(
                      child: Icon(
                        step.fallbackIcon,
                        size: 72,
                        color: step.themeColor,
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Title
          Text(
            step.title,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 6),

          // Subtitle
          Text(
            step.subtitle,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 16),

          // Bullet Points
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: theme.dividerColor.withValues(alpha: 0.15),
              ),
            ),
            child: Column(
              children: step.bulletPoints.map((point) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Icon(Icons.check_circle_rounded, size: 16, color: step.themeColor),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          point,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.35,
                            color: isDark ? Colors.grey.shade200 : Colors.grey.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          if (step.calloutText != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: step.isNotice
                    ? Colors.amber.withValues(alpha: 0.12)
                    : step.themeColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: step.isNotice
                      ? Colors.amber.shade700.withValues(alpha: 0.4)
                      : step.themeColor.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    step.isNotice ? Icons.security_rounded : Icons.info_outline,
                    size: 18,
                    color: step.isNotice ? Colors.amber.shade900 : step.themeColor,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      step.calloutText!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: step.isNotice
                            ? (isDark ? Colors.amber.shade200 : Colors.amber.shade900)
                            : (isDark ? Colors.tealAccent : Colors.teal.shade800),
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
