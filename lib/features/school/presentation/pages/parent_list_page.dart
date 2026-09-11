import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import 'parent_profile_page.dart';

class ParentListPage extends StatefulWidget {
  const ParentListPage({super.key});

  @override
  State<ParentListPage> createState() => _ParentListPageState();
}

class _ParentListPageState extends State<ParentListPage> {
  String _query = '';
  int? _classFilter;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Parents')),
      body: BlocBuilder<SchoolBloc, SchoolState>(
        builder: (context, state) {
          if (state.isLoading && state.parents.isEmpty) {
            return const InvifyLoadingIndicator(message: 'LOADING PARENTS...');
          }
          final q = _query.trim().toLowerCase();
          final parents = state.parents.where((p) {
            if (q.isNotEmpty) {
              final matchesText = p.fullName.toLowerCase().contains(q) ||
                  (p.phone ?? '').contains(q);
              if (!matchesText) return false;
            }
            if (_classFilter != null) {
              final inClass = state.students.any(
                (s) => s.parentId == p.id && s.classId == _classFilter,
              );
              if (!inClass) return false;
            }
            return true;
          }).toList()
            ..sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Column(
                  children: [
                    TextField(
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        hintText: 'Search by name or phone',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (v) => setState(() => _query = v),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<int?>(
                            value: _classFilter,
                            decoration: const InputDecoration(
                              labelText: 'Filter by child class',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            items: [
                              const DropdownMenuItem<int?>(
                                value: null,
                                child: Text('All classes'),
                              ),
                              ...state.classes.map(
                                (c) => DropdownMenuItem<int?>(
                                  value: c.id,
                                  child: Text(c.name),
                                ),
                              ),
                            ],
                            onChanged: (v) => setState(() => _classFilter = v),
                          ),
                        ),
                        if (_classFilter != null)
                          IconButton(
                            tooltip: 'Clear class filter',
                            onPressed: () => setState(() => _classFilter = null),
                            icon: const Icon(Icons.clear),
                          ),
                      ],
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          '${parents.length} parent${parents.length == 1 ? '' : 's'}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.blueGrey.shade700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: parents.isEmpty
                    ? const Center(child: Text('No parents yet. Add a student with a guardian.'))
                    : ListView.separated(
                        itemCount: parents.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final parent = parents[i];
                          final children = state.students
                              .where((s) => s.parentId == parent.id)
                              .toList();
                          final outstanding = children.fold<double>(
                            0,
                            (sum, s) => sum + (s.balance > 0 ? s.balance : 0),
                          );
                          final classNames = children
                              .map((s) {
                                for (final c in state.classes) {
                                  if (c.id == s.classId) return c.name;
                                }
                                return '';
                              })
                              .where((n) => n.isNotEmpty)
                              .toSet()
                              .join(', ');
                          return ListTile(
                            leading: CircleAvatar(
                              child: Text(
                                parent.fullName.isEmpty
                                    ? '?'
                                    : parent.fullName.trim()[0].toUpperCase(),
                              ),
                            ),
                            title: Text(parent.fullName),
                            subtitle: Text(
                              '${children.length} child${children.length == 1 ? '' : 'ren'}'
                              '${classNames.isEmpty ? '' : ' · $classNames'}'
                              '${parent.phone != null && parent.phone!.isNotEmpty ? ' · ${parent.phone}' : ''}'
                              '${parent.hasCanonicalVa ? ' · VA' : ''}',
                            ),
                            trailing: Text(
                              CurrencyFormatter.formatWithSymbol(outstanding),
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: outstanding > 0 ? Colors.red.shade700 : Colors.green.shade700,
                              ),
                            ),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ParentProfilePage(parentId: parent.id!),
                              ),
                            ),
                          );
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
