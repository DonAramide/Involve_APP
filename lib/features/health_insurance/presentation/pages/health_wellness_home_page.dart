// lib/features/health_insurance/presentation/pages/health_wellness_home_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/health_insurance_entities.dart';
import '../bloc/health_insurance_bloc.dart';
import '../bloc/health_insurance_event.dart';
import '../bloc/health_insurance_state.dart';
import '../widgets/coverage_status_badge.dart';
import '../widgets/unverified_warning_banner.dart';
import '../widgets/plan_card.dart';
import '../widgets/child_coverage_card.dart';
import '../utils/hmo_tour_storage.dart';
import 'plan_details_page.dart';
import 'policy_details_page.dart';
import 'enrolment_flow_page.dart';
import 'claims_status_page.dart';
import 'hmo_welcome_page.dart';
import 'hmo_guided_tour_page.dart';

class HealthWellnessHomePage extends StatefulWidget {
  static const String routeName = '/health_wellness';

  const HealthWellnessHomePage({super.key});

  @override
  State<HealthWellnessHomePage> createState() => _HealthWellnessHomePageState();
}

class _HealthWellnessHomePageState extends State<HealthWellnessHomePage> {
  @override
  void initState() {
    super.initState();
    context.read<HealthInsuranceBloc>().add(const LoadHealthInsuranceData());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkFirstTimeWelcome();
    });
  }

  Future<void> _checkFirstTimeWelcome() async {
    final state = context.read<HealthInsuranceBloc>().state;
    final isDone = await HmoTourStorage.isTourCompleted(
      tenantId: state.activeTenantId,
    );
    if (!isDone && mounted) {
      HmoWelcomePage.showAsModal(
        context,
        tenantId: state.activeTenantId,
        hmoProviderName: state.assignedProvider?.name,
      );
    }
  }

  void _openWelcomeModal(BuildContext context, HealthInsuranceState state) {
    HmoWelcomePage.showAsModal(
      context,
      tenantId: state.activeTenantId,
      hmoProviderName: state.assignedProvider?.name,
    );
  }

  void _openGuidedTour(BuildContext context, HealthInsuranceState state) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => HmoGuidedTourPage(
          tenantId: state.activeTenantId,
          hmoProviderName: state.assignedProvider?.name,
        ),
      ),
    );
  }

  void _openHmoIntroModal(BuildContext context, HealthInsuranceState state) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final theme = Theme.of(ctx);
        final isDark = theme.brightness == Brightness.dark;
        return Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.teal.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.local_hospital_rounded, color: Colors.teal, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'How HMO Healthcare Works',
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  'A Health Maintenance Organization (HMO) coordinates hospital and medical care for schools and organizations. Instead of paying unexpected out-of-pocket medical bills, eligible members receive covered services at authorized clinics and hospitals under the terms of their school\'s selected health plan.',
                  style: TextStyle(
                    fontSize: 13.5,
                    height: 1.4,
                    color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '• School Role: Selects and sponsors or subsidizes eligible plan packages.\n• HMO Role: Provides the accredited network of hospitals, doctors, and covers authorized treatments.\n• Family Role: Enrols verified beneficiaries and accesses digital health ID passes for care.',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: isDark ? Colors.grey.shade200 : Colors.grey.shade800,
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _openGuidedTour(context, state);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Take Full 4-Step Guided Tour'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showLinkingGuidance(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final theme = Theme.of(ctx);
        return Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Row(
                  children: [
                    Icon(Icons.family_restroom, color: Colors.indigo, size: 24),
                    SizedBox(width: 10),
                    Text(
                      'Linking Your Dependants',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'To protect student privacy and ensure proper underwriter records, students must be linked to a verified guardian profile.\n\n1. Ensure your child is registered with the school.\n2. Obtain their official admission number or student identifier.\n3. The school administration will verify your guardian relationship.\n4. Once verified, your child appears here with full plan options.',
                  style: TextStyle(fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Understood'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showSchoolSupportDialog(BuildContext context, HealthInsuranceState state) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.contact_support_outlined, color: Colors.teal),
            SizedBox(width: 8),
            Text('School Support', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'For assistance with student linking, roster updates, or health insurance plan availability, contact your school administration office:',
              style: TextStyle(fontSize: 13, height: 1.35),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Campus Administrative Office', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 2),
                  const Text('Email: health-support@invify.org', style: TextStyle(fontSize: 12)),
                  const SizedBox(height: 2),
                  Text('Underwriting Partner: ${state.assignedProvider?.name ?? "Assigned HMO"}', style: const TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocConsumer<HealthInsuranceBloc, HealthInsuranceState>(
      listener: (context, state) {
        if (state.actionSuccessMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.actionSuccessMessage!),
              backgroundColor: Colors.green,
            ),
          );
        } else if (state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: const Row(
              children: [
                Icon(Icons.health_and_safety, color: Colors.tealAccent, size: 26),
                SizedBox(width: 8),
                Text('Health & Wellness'),
              ],
            ),
            actions: [
              IconButton(
                key: const Key('hmo_app_bar_tour_button'),
                icon: const Icon(Icons.help_outline),
                tooltip: 'HMO Tour & Guide',
                onPressed: () => _openWelcomeModal(context, state),
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: 'Refresh Data',
                onPressed: () {
                  context.read<HealthInsuranceBloc>().add(const LoadHealthInsuranceData(forceRefresh: true));
                },
              ),
              IconButton(
                icon: const Icon(Icons.receipt_long),
                tooltip: 'Claims',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ClaimsStatusPage()),
                  );
                },
              ),
            ],
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: theme.dividerColor.withValues(alpha: 0.12)),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _roleIcon(state.currentRole),
                      size: 16,
                      color: Colors.tealAccent,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _roleLabel(state.currentRole),
                      key: const Key('verified_health_role_badge'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                    const Spacer(),
                    if (state.assignedProvider != null)
                      Flexible(
                        child: Container(
                          key: const Key('assigned_hmo_header_badge'),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.teal.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.tealAccent.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                state.tenantSettings?.assignmentMode == 'LOCKED'
                                    ? Icons.lock_outline
                                    : Icons.verified_user_outlined,
                                size: 13,
                                color: Colors.tealAccent,
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  state.assignedProvider!.name,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
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
          ),
          body: _buildDashboardBody(context, state),
          floatingActionButton: state.currentRole == HealthUserRole.admin || state.currentRole == HealthUserRole.parent
              ? FloatingActionButton.extended(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => EnrolmentFlowPage(
                          preselectedChild: state.selectedChild,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Enrol Beneficiary'),
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                )
              : null,
        );
      },
    );
  }

  Widget _buildDashboardBody(BuildContext context, HealthInsuranceState state) {
    // 1. Loading State (do NOT show misleading 0 values)
    if (state.status == HealthInsuranceStatus.loading && state.offers.isEmpty && state.guardianChildren.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'Loading school health plans & dependants...',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
          ],
        ),
      );
    }

    // 2. Error State with Retry
    if (state.status == HealthInsuranceStatus.error && state.offers.isEmpty && state.guardianChildren.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_off_rounded, size: 56, color: Colors.red.shade300),
              const SizedBox(height: 14),
              const Text(
                'Unable to Load Health Information',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 6),
              Text(
                state.errorMessage ?? 'Please check your connection or contact the school office.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: () {
                  context.read<HealthInsuranceBloc>().add(const LoadHealthInsuranceData(forceRefresh: true));
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // 3. Normal Content
    return RefreshIndicator(
      onRefresh: () async {
        context.read<HealthInsuranceBloc>().add(const LoadHealthInsuranceData(forceRefresh: true));
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcoming Hero Card
            _buildWelcomeHeroCard(context, state),
            const SizedBox(height: 14),

            if (state.assignedProvider != null) ...[
              _buildAssignedHmoBanner(context, state),
              const SizedBox(height: 16),
            ],

            _buildRoleContent(context, state),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeHeroCard(BuildContext context, HealthInsuranceState state) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      key: const Key('hmo_welcome_hero_card'),
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.colorScheme.primary.withValues(alpha: 0.12),
            Colors.teal.withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.health_and_safety, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'School Health & Wellness Hub',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      state.assignedProvider != null
                          ? 'Underwritten by ${state.assignedProvider!.name}'
                          : 'Accredited Healthcare Protection',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Explore health plans, manage your family\'s coverage, and access your Digital Health ID once policy activation is confirmed by the insurer.',
            style: TextStyle(
              fontSize: 12.5,
              height: 1.35,
              color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 12),

          // Quick Action Entry Points
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ElevatedButton.icon(
                key: const Key('dashboard_take_tour_button'),
                onPressed: () => _openGuidedTour(context, state),
                icon: const Icon(Icons.explore_outlined, size: 16),
                label: const Text('Quick Tour'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0.5,
                ),
              ),
              OutlinedButton.icon(
                key: const Key('dashboard_how_it_works_button'),
                onPressed: () => _openHmoIntroModal(context, state),
                icon: const Icon(Icons.info_outline, size: 16),
                label: const Text('How HMO Works'),
                style: OutlinedButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              TextButton.icon(
                key: const Key('dashboard_support_button'),
                onPressed: () => _showSchoolSupportDialog(context, state),
                icon: const Icon(Icons.support_agent_outlined, size: 16),
                label: const Text('Support'),
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _roleLabel(HealthUserRole role) {
    switch (role) {
      case HealthUserRole.parent:
        return 'Parent / Guardian';
      case HealthUserRole.student:
        return 'Student View';
      case HealthUserRole.staff:
        return 'School Staff';
      case HealthUserRole.admin:
        return 'School Admin';
    }
  }

  IconData _roleIcon(HealthUserRole role) {
    switch (role) {
      case HealthUserRole.parent:
        return Icons.family_restroom;
      case HealthUserRole.student:
        return Icons.school;
      case HealthUserRole.staff:
        return Icons.badge;
      case HealthUserRole.admin:
        return Icons.admin_panel_settings;
    }
  }

  Widget _buildAssignedHmoBanner(BuildContext context, HealthInsuranceState state) {
    final provider = state.assignedProvider!;
    final isLocked = state.tenantSettings?.assignmentMode == 'LOCKED';
    return Container(
      key: const Key('assigned_hmo_banner'),
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.teal.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.teal.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.local_hospital, color: Colors.teal, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Underwritten by ${provider.name}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isLocked
                            ? Colors.amber.withValues(alpha: 0.18)
                            : Colors.teal.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isLocked ? 'INSTITUTION LOCKED' : 'VERIFIED HMO',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isLocked ? Colors.amber.shade800 : Colors.teal,
                        ),
                      ),
                    ),
                  ],
                ),
                if (provider.licenceReference != null || provider.supportPhone != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      [
                        if (provider.licenceReference != null)
                          '${provider.regulatorType ?? "NHIA"}: ${provider.licenceReference}',
                        if (provider.supportPhone != null) 'Support: ${provider.supportPhone}',
                      ].join(' • '),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleContent(BuildContext context, HealthInsuranceState state) {
    switch (state.currentRole) {
      case HealthUserRole.parent:
        return _buildParentExperience(context, state);
      case HealthUserRole.student:
        return _buildStudentExperience(context, state);
      case HealthUserRole.staff:
        return _buildStaffExperience(context, state);
      case HealthUserRole.admin:
        return _buildAdminExperience(context, state);
    }
  }

  // ─── 1. Parent / Guardian Experience ─────────────────────────────
  Widget _buildParentExperience(BuildContext context, HealthInsuranceState state) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final children = state.guardianChildren;
    final selectedChild = state.selectedChild;

    // Find enrolment for selected child
    HealthEnrolment? childEnrolment;
    if (selectedChild != null) {
      try {
        childEnrolment = state.enrolments.firstWhere(
          (e) => e.memberId == selectedChild.studentId || e.memberName.contains(selectedChild.firstName),
        );
      } catch (_) {
        childEnrolment = null;
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section: Linked Dependants
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Linked Dependants (${children.length})',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            if (children.any((c) => !c.isVerified))
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(Icons.shield_outlined, size: 12, color: Colors.amber.shade900),
                    const SizedBox(width: 4),
                    Text(
                      'Verification Pending',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.amber.shade900,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),

        // Contextual Empty State for Dependants
        if (children.isEmpty) ...[
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.indigo.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.family_restroom_rounded, color: Colors.indigo, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'No Linked Dependants Found',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Coverage is tied to verified student records',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'To enrol your child in school health insurance, their student profile must be linked to your account with a verified admission number.',
                    style: TextStyle(fontSize: 12.5, height: 1.35, color: isDark ? Colors.grey.shade300 : Colors.grey.shade700),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => _showLinkingGuidance(context),
                        icon: const Icon(Icons.help_outline, size: 16),
                        label: const Text('How Linking Works'),
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => _showSchoolSupportDialog(context, state),
                        icon: const Icon(Icons.contact_support_outlined, size: 16),
                        label: const Text('Contact School Office'),
                        style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ] else ...[
          ...children.map((child) {
            HealthEnrolment? enrol;
            try {
              enrol = state.enrolments.firstWhere(
                (e) => e.memberId == child.studentId || e.memberName.contains(child.firstName),
              );
            } catch (_) {}

            return ChildCoverageCard(
              child: child,
              enrolment: enrol,
              isSelected: selectedChild?.linkId == child.linkId,
              onTap: () {
                context.read<HealthInsuranceBloc>().add(SelectGuardianChild(child));
              },
            );
          }),
        ],

        const SizedBox(height: 20),

        // Focus details on selected child
        if (selectedChild != null) ...[
          if (!selectedChild.isVerified) ...[
            // STRICT PRIVACY SAFEGUARD: Unverified Banner
            UnverifiedWarningBanner(
              studentName: selectedChild.fullName,
              isRejected: selectedChild.status == GuardianVerificationStatus.rejected,
            ),
          ] else ...[
            // VERIFIED CHILD DETAILS
            _buildVerifiedChildSection(context, state, selectedChild, childEnrolment),
          ],
        ],

        const SizedBox(height: 24),

        // Available School Plan Offers
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'School Health Plans (${state.offers.length})',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Contextual Empty State for School Plans
        if (state.offers.isEmpty) ...[
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.teal.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.health_and_safety_outlined, color: Colors.teal, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'No School Health Plans Published Yet',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Waiting for school package configuration',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Your school administration selects and configures the exact health plans offered to families and staff. Once published, plan benefits, hospital tiers, and any school subsidies will appear here.',
                    style: TextStyle(fontSize: 12.5, height: 1.35, color: isDark ? Colors.grey.shade300 : Colors.grey.shade700),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => _openGuidedTour(context, state),
                        icon: const Icon(Icons.explore_outlined, size: 16),
                        label: const Text('Learn How Plans Work'),
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => _showSchoolSupportDialog(context, state),
                        icon: const Icon(Icons.contact_support_outlined, size: 16),
                        label: const Text('Contact School Admin'),
                        style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ] else ...[
          ...state.offers.map((offer) => PlanCard(
                offer: offer,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PlanDetailsPage(offer: offer),
                    ),
                  );
                },
                onEnrolTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => EnrolmentFlowPage(
                        selectedOffer: offer,
                        preselectedChild: selectedChild?.isVerified == true ? selectedChild : null,
                      ),
                    ),
                  );
                },
              )),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildVerifiedChildSection(
    BuildContext context,
    HealthInsuranceState state,
    GuardianChild child,
    HealthEnrolment? enrolment,
  ) {
    final theme = Theme.of(context);
    final dateFormatter = DateFormat('MMM dd, yyyy');

    final hasActivePolicy = enrolment?.policyStatus == PolicyLifecycleStatus.active;
    final isAwaitingActivation = enrolment?.status == EnrolmentLifecycleStatus.awaitingInsurerActivation ||
        enrolment?.policyStatus == PolicyLifecycleStatus.pendingActivation;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${child.fullName}\'s Coverage',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Class: ${child.currentClass} • Adm: ${child.admissionNumber}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                CoverageStatusBadge(
                  status: enrolment?.status ?? EnrolmentLifecycleStatus.unknown,
                  policyStatus: enrolment?.policyStatus ?? PolicyLifecycleStatus.unknown,
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 14),

            if (enrolment != null) ...[
              Row(
                children: [
                  const Icon(Icons.health_and_safety, color: Colors.teal, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${enrolment.planName} (${enrolment.providerName})',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Policy Number:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Text(
                    enrolment.policyNumber ?? 'Pending Confirmation',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Insurer State:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Text(
                    hasActivePolicy ? 'Confirmed Active' : (isAwaitingActivation ? 'Insurer Activation Pending' : 'Under Review'),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: hasActivePolicy ? Colors.green : Colors.amber.shade900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Valid Until:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Text(
                    enrolment.periodEnd != null ? dateFormatter.format(enrolment.periodEnd!) : 'N/A',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PolicyDetailsPage(enrolment: enrolment),
                          ),
                        );
                      },
                      icon: const Icon(Icons.badge, size: 16),
                      label: const Text('View Policy'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ClaimsStatusPage(policyId: enrolment.policyId),
                          ),
                        );
                      },
                      icon: const Icon(Icons.receipt_long, size: 16),
                      label: const Text('Claims'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ] else ...[
              const Text(
                'This student does not currently have an active health insurance policy.',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => EnrolmentFlowPage(
                        preselectedChild: child,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.add_task),
                label: const Text('Enrol in School Health Plan'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ─── 2. Student Experience (Minimal, Zero Leakage) ───────────────
  Widget _buildStudentExperience(BuildContext context, HealthInsuranceState state) {
    final enrolment = state.studentActiveEnrolment;
    final dateFormatter = DateFormat('MMM dd, yyyy');

    final bool isInsurerConfirmed = enrolment?.policyStatus == PolicyLifecycleStatus.active;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title
        const Text(
          'Student Health Pass',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        const Text(
          'Present this digital coverage card at accredited school partner hospitals and the campus sick bay.',
          style: TextStyle(fontSize: 12, color: Colors.grey),
        ),
        const SizedBox(height: 16),

        // Digital Card — STRICT: No financial data, no kobo, no guardian data
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                isInsurerConfirmed ? const Color(0xFF004D40) : const Color(0xFF263238),
                isInsurerConfirmed ? const Color(0xFF00796B) : const Color(0xFF37474F),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.local_hospital, color: Colors.white, size: 24),
                      const SizedBox(width: 8),
                      Text(
                        enrolment?.providerName.toUpperCase() ?? 'HMO PARTNER',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isInsurerConfirmed
                          ? Colors.greenAccent.withValues(alpha: 0.3)
                          : Colors.amberAccent.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isInsurerConfirmed ? 'ACTIVE' : 'PENDING',
                      style: TextStyle(
                        color: isInsurerConfirmed ? Colors.lightGreenAccent : Colors.amberAccent,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text(
                enrolment?.memberName.isNotEmpty == true ? enrolment!.memberName : 'Student Beneficiary',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Student ID: ${enrolment?.admissionNumber.isNotEmpty == true ? enrolment!.admissionNumber : "VERIFIED"}',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 22),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'POLICY ID',
                        style: TextStyle(color: Colors.white60, fontSize: 10),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        enrolment?.policyNumber ?? 'POL-STD-CONFIRMED',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'VALID UNTIL',
                        style: TextStyle(color: Colors.white60, fontSize: 10),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        enrolment?.periodEnd != null ? dateFormatter.format(enrolment!.periodEnd!) : 'Session End',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Emergency Medical Contact Section
        Card(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: const Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.phone_in_talk, color: Colors.redAccent, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'Emergency Medical Hotline',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ],
                ),
                SizedBox(height: 10),
                Text(
                  'If you feel unwell or sustain an injury on campus, report immediately to the campus clinic or contact emergency staff:',
                  style: TextStyle(fontSize: 12.5, height: 1.4),
                ),
                SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: Colors.redAccent,
                    child: Icon(Icons.call, color: Colors.white, size: 18),
                  ),
                  title: Text('Campus Sick Bay / Clinic', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text('Emergency Extension: 112 / 0800-INVIFY-HEALTH'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ─── 3. School Staff Experience ──────────────────────────────────
  Widget _buildStaffExperience(BuildContext context, HealthInsuranceState state) {
    final theme = Theme.of(context);
    final enrolment = state.staffActiveEnrolment;
    final dateFormatter = DateFormat('MMM dd, yyyy');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Staff Health Benefit',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            if (enrolment != null)
              CoverageStatusBadge(
                status: enrolment.status,
                policyStatus: enrolment.policyStatus,
              ),
          ],
        ),
        const SizedBox(height: 12),

        if (enrolment != null) ...[
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: Colors.teal,
                        child: Icon(Icons.badge, color: Colors.white),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              enrolment.memberName.isNotEmpty ? enrolment.memberName : 'Staff Member',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Text(
                              'Staff ID: ${enrolment.admissionNumber.isNotEmpty ? enrolment.admissionNumber : "STF-ACTIVE"}',
                              style: const TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Plan & Provider:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text(
                        '${enrolment.planName} (${enrolment.providerName})',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Policy Number:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text(
                        enrolment.policyNumber ?? 'Pending Activation',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Coverage Period:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text(
                        enrolment.periodEnd != null ? dateFormatter.format(enrolment.periodEnd!) : 'Annual',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => PolicyDetailsPage(enrolment: enrolment),
                              ),
                            );
                          },
                          icon: const Icon(Icons.badge, size: 16),
                          label: const Text('View Policy'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ClaimsStatusPage(policyId: enrolment.policyId),
                              ),
                            );
                          },
                          icon: const Icon(Icons.receipt_long, size: 16),
                          label: const Text('My Claims'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ] else ...[
          Card(
            elevation: 1,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.health_and_safety, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    const Text(
                      'No staff health enrolment record found.',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Check with HR or enrol in one of the school\'s staff health plans below.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],

        const SizedBox(height: 24),
        Text(
          'Available Staff Health Plans',
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),

        ...state.offers.map((offer) => PlanCard(
              offer: offer,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => PlanDetailsPage(offer: offer)),
                );
              },
              onEnrolTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => EnrolmentFlowPage(selectedOffer: offer),
                  ),
                );
              },
            )),
      ],
    );
  }

  // ─── 4. School Administrator Experience ──────────────────────────
  Widget _buildAdminExperience(BuildContext context, HealthInsuranceState state) {
    final theme = Theme.of(context);
    final metrics = state.metrics;
    final formatter = NumberFormat('#,##0', 'en_US');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Health & Wellness Governance',
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        // KPI Metric Cards
        Row(
          children: [
            Expanded(
              child: _kpiCard(
                'Total Members',
                metrics.totalMembers.toString(),
                Icons.people,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _kpiCard(
                'Active Coverage',
                metrics.activeCoverageCount.toString(),
                Icons.verified_user,
                Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _kpiCard(
                'Awaiting Verification',
                metrics.awaitingVerificationCount.toString(),
                Icons.pending_actions,
                Colors.amber.shade800,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _kpiCard(
                'Pending Activation',
                metrics.awaitingActivationCount.toString(),
                Icons.hourglass_top,
                Colors.deepOrange,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _kpiCard(
                'Billed Premiums',
                '₦${formatter.format(metrics.billedNaira)}',
                Icons.payments,
                Colors.indigo,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _kpiCard(
                'Outstanding',
                '₦${formatter.format(metrics.outstandingNaira)}',
                Icons.account_balance_wallet,
                Colors.teal,
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        // Enrolment Management Table / List
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Enrolments (${state.enrolments.length})',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            TextButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ClaimsStatusPage()),
                );
              },
              icon: const Icon(Icons.receipt_long, size: 16),
              label: const Text('All Claims'),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (state.enrolments.isEmpty) ...[
          const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Center(
                child: Text('No enrolments registered for this school yet.', style: TextStyle(color: Colors.grey)),
              ),
            ),
          ),
        ] else ...[
          ...state.enrolments.take(15).map((enrol) => Card(
                elevation: 1,
                margin: const EdgeInsets.symmetric(vertical: 4),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: enrol.isCoverageActive ? Colors.green.withValues(alpha: 0.15) : Colors.amber.withValues(alpha: 0.15),
                    child: Icon(
                      enrol.isCoverageActive ? Icons.verified : Icons.hourglass_top,
                      color: enrol.isCoverageActive ? Colors.green : Colors.amber.shade900,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    enrol.memberName.isNotEmpty ? enrol.memberName : 'Member',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  subtitle: Text(
                    '${enrol.planName} • ID: ${enrol.admissionNumber}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: CoverageStatusBadge(
                    status: enrol.status,
                    policyStatus: enrol.policyStatus,
                  ),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PolicyDetailsPage(enrolment: enrol),
                      ),
                    );
                  },
                ),
              )),
        ],
        const SizedBox(height: 32),
      ],
    );
  }

  static Widget _kpiCard(String label, String value, IconData icon, Color color) {
    return Card(
      elevation: 1.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 18),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
