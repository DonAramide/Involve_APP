// lib/features/health_insurance/presentation/pages/claims_status_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/health_insurance_entities.dart';
import '../bloc/health_insurance_bloc.dart';
import '../bloc/health_insurance_state.dart';
import '../widgets/claim_card.dart';

class ClaimsStatusPage extends StatefulWidget {
  static const String routeName = '/health_wellness/claims';
  final String? policyId;

  const ClaimsStatusPage({super.key, this.policyId});

  @override
  State<ClaimsStatusPage> createState() => _ClaimsStatusPageState();
}

class _ClaimsStatusPageState extends State<ClaimsStatusPage> {
  String _searchQuery = '';
  ClaimStatus? _selectedStatus;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Claims & Authorisations'),
      ),
      body: BlocBuilder<HealthInsuranceBloc, HealthInsuranceState>(
        builder: (context, state) {
          final allClaims = state.claims;
          final filteredClaims = allClaims.where((c) {
            if (_selectedStatus != null && c.status != _selectedStatus) {
              return false;
            }
            if (_searchQuery.isNotEmpty) {
              final query = _searchQuery.toLowerCase();
              final matchRef = c.claimReference.toLowerCase().contains(query);
              final matchFacility = c.facilityName.toLowerCase().contains(query);
              final matchMember = c.memberName.toLowerCase().contains(query);
              return matchRef || matchFacility || matchMember;
            }
            return true;
          }).toList();

          return Column(
            children: [
              // Search & filter bar
              Padding(
                padding: const EdgeInsets.all(12),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search by claim ref, hospital or beneficiary...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () => setState(() => _searchQuery = ''),
                          )
                        : null,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  onChanged: (val) => setState(() => _searchQuery = val.trim()),
                ),
              ),

              // Status Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    FilterChip(
                      label: const Text('All'),
                      selected: _selectedStatus == null,
                      onSelected: (_) => setState(() => _selectedStatus = null),
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('Pre-Authorized'),
                      selected: _selectedStatus == ClaimStatus.preAuthorized,
                      onSelected: (_) => setState(() => _selectedStatus = ClaimStatus.preAuthorized),
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('Under Review'),
                      selected: _selectedStatus == ClaimStatus.submitted,
                      onSelected: (_) => setState(() => _selectedStatus = ClaimStatus.submitted),
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('Paid'),
                      selected: _selectedStatus == ClaimStatus.paid,
                      onSelected: (_) => setState(() => _selectedStatus = ClaimStatus.paid),
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('Rejected'),
                      selected: _selectedStatus == ClaimStatus.rejected,
                      onSelected: (_) => setState(() => _selectedStatus = ClaimStatus.rejected),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Claims list
              Expanded(
                child: filteredClaims.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.assignment_turned_in, size: 54, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text(
                              _searchQuery.isNotEmpty || _selectedStatus != null
                                  ? 'No claims match your filter criteria.'
                                  : 'No claims or hospitalisations recorded yet.',
                              style: const TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        itemCount: filteredClaims.length,
                        itemBuilder: (context, index) {
                          return ClaimCard(claim: filteredClaims[index]);
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
