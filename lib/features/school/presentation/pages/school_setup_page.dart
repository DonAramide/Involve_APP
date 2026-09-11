import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import '../../domain/entities/grading_rule.dart';
import 'manage_grading_rules_page.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/presentation/widgets/password_dialog.dart';

class SchoolSetupPage extends StatelessWidget {
  const SchoolSetupPage({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Academic Setup'),
          actions: [
            IconButton(
              icon: const Icon(Icons.rule),
              tooltip: 'Grading Rules',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ManageGradingRulesPage()),
                );
              },
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Years', icon: Icon(Icons.calendar_today)),
              Tab(text: 'Terms', icon: Icon(Icons.segment)),
              Tab(text: 'Classes', icon: Icon(Icons.class_)),
            ],
          ),
        ),
        body: BlocListener<SchoolBloc, SchoolState>(
          listener: (context, state) {
            if (state.error != null) {
              showFriendlyErrorSnackBar(context, state.error);
            }
          },
          child: BlocBuilder<SchoolBloc, SchoolState>(
            builder: (context, state) {
              if (state.isLoading) return const InvifyLoadingIndicator(message: 'FETCHING ACADEMIC SETUP DATA...');
              
              return TabBarView(
                children: [
                  _YearsTab(state: state),
                  _TermsTab(state: state),
                  _ClassesTab(state: state),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

int _compareByName(String a, String b) =>
    a.toLowerCase().compareTo(b.toLowerCase());

final _academicSessionPattern = RegExp(r'^(\d{4})/(\d{4})$');

String? _validateAcademicSession(String? value) {
  final text = (value ?? '').trim();
  if (text.isEmpty) return 'Enter a session like 2026/2027';
  final match = _academicSessionPattern.firstMatch(text);
  if (match == null) return 'Use session format YYYY/YYYY, e.g. 2026/2027';
  final start = int.parse(match.group(1)!);
  final end = int.parse(match.group(2)!);
  if (end != start + 1) return 'Second year must be ${start + 1}';
  if (start < 1990 || start > 2100) return 'Enter a valid session year';
  return null;
}

({int start, int end})? _parseAcademicSession(String value) {
  final match = _academicSessionPattern.firstMatch(value.trim());
  if (match == null) return null;
  final start = int.parse(match.group(1)!);
  final end = int.parse(match.group(2)!);
  if (end != start + 1) return null;
  return (start: start, end: end);
}

class _AcademicSessionFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > 8) digits = digits.substring(0, 8);

    final oldDigits = oldValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    String formatted;
    if (digits.length == 4 && oldDigits.length < 4) {
      final year = int.tryParse(digits);
      formatted = year == null ? digits : '$digits/${year + 1}';
    } else if (digits.length <= 4) {
      formatted = digits;
    } else {
      formatted = '${digits.substring(0, 4)}/${digits.substring(4)}';
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class _YearsTab extends StatelessWidget {
  final SchoolState state;
  const _YearsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    final years = [...state.academicYears]
      ..sort((a, b) => _compareByName(a.name, b.name));
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddYearDialog(context),
        child: const Icon(Icons.add),
      ),
      body: ListView.builder(
        itemCount: years.length,
        itemBuilder: (context, index) {
          final year = years[index];
          return ListTile(
            title: Text(year.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _showEditYearDialog(context, year),
                ),
                if (year.isActive)
                  const Icon(Icons.check_circle, color: Colors.green)
                else
                  ElevatedButton(
                    onPressed: () => context.read<SchoolBloc>().add(SetActiveYearEvent(year.id!)),
                    child: const Text('Set Active'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showAddYearDialog(BuildContext context) {
    _showYearDialog(context);
  }

  void _showEditYearDialog(BuildContext context, AcademicYear year) {
    _showYearDialog(context, year: year);
  }

  void _showYearDialog(BuildContext context, {AcademicYear? year}) {
    final isEdit = year != null;
    final controller = TextEditingController(text: year?.name);
    final formKey = GlobalKey<FormState>();
    context.read<SchoolBloc>().add(ResetSchoolStatus());
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.of(ctx).pop();
          }
        },
        child: AlertDialog(
          title: Text(isEdit ? 'Edit Academic Year' : 'Add Academic Year'),
          content: Form(
            key: formKey,
            child: TextFormField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9/]')),
                _AcademicSessionFormatter(),
              ],
              decoration: const InputDecoration(
                labelText: 'Academic session',
                hintText: '2026/2027',
                helperText: 'Use standard session format YYYY/YYYY',
              ),
              validator: _validateAcademicSession,
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (!(formKey.currentState?.validate() ?? false)) return;
                final session = controller.text.trim();
                final years = _parseAcademicSession(session);
                if (years == null) return;
                if (isEdit) {
                  context.read<SchoolBloc>().add(UpdateAcademicYearEvent(
                    year!.copyWith(name: session),
                  ));
                } else {
                  context.read<SchoolBloc>().add(AddAcademicYearEvent(
                    name: session,
                    startDate: DateTime(years.start, 9, 1),
                    endDate: DateTime(years.end, 8, 31),
                  ));
                }
              },
              child: BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  if (state.isLoading && state.status == SchoolStatus.loading) {
                    return const Text('Saving...', style: TextStyle(fontWeight: FontWeight.bold));
                  }
                  return Text(isEdit ? 'Update' : 'Add');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TermsTab extends StatelessWidget {
  final SchoolState state;
  const _TermsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    final activeYear = state.activeYear;
    if (activeYear == null) {
      return const Center(child: Text('Please add an Academic Year first.'));
    }

    final terms = [...state.terms]
      ..sort((a, b) => _compareByName(a.name, b.name));

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddTermDialog(context, activeYear.id!),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text('Terms for ${activeYear.name}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: terms.length,
              itemBuilder: (context, index) {
                final term = terms[index];
                return ListTile(
                  title: Text(term.name),
                  subtitle: Text(term.dateRangeLabel),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_outlined),
                        onPressed: () => _showEditTermDialog(context, term),
                      ),
                      if (term.isActive)
                        const Icon(Icons.check_circle, color: Colors.green)
                      else
                        ElevatedButton(
                          onPressed: () => context.read<SchoolBloc>().add(SetActiveTermEvent(term.id!)),
                          child: const Text('Set Active'),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showAddTermDialog(BuildContext context, int yearId) {
    _showTermDialog(context, yearId: yearId);
  }

  void _showEditTermDialog(BuildContext context, Term term) {
    _showTermDialog(context, yearId: term.academicYearId, term: term);
  }

  void _showTermDialog(BuildContext context, {required int yearId, Term? term}) {
    final isEdit = term != null;
    final controller = TextEditingController(text: term?.name);
    DateTime startDate = term?.startDate ?? DateTime.now();
    DateTime endDate = term?.endDate ?? DateTime.now().add(const Duration(days: 90));
    context.read<SchoolBloc>().add(ResetSchoolStatus());
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.of(ctx).pop();
          }
        },
        child: StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> pickDate({required bool isStart}) async {
              final initial = isStart ? startDate : endDate;
              final date = await showDatePicker(
                context: context,
                initialDate: initial,
                firstDate: DateTime(1990),
                lastDate: DateTime(2100),
              );
              if (date == null) return;
              setDialogState(() {
                if (isStart) {
                  startDate = date;
                  if (endDate.isBefore(startDate)) {
                    endDate = startDate.add(const Duration(days: 90));
                  }
                } else {
                  endDate = date.isBefore(startDate) ? startDate : date;
                }
              });
            }

            return AlertDialog(
              title: Text(isEdit ? 'Edit Term' : 'Add Term'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: controller,
                    decoration: const InputDecoration(
                      labelText: 'Term name',
                      hintText: 'e.g. First Term',
                    ),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Start date'),
                    subtitle: Text(DateFormat('dd MMM yyyy').format(startDate)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => pickDate(isStart: true),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('End date'),
                    subtitle: Text(DateFormat('dd MMM yyyy').format(endDate)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => pickDate(isStart: false),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () {
                    if (controller.text.trim().isEmpty) return;
                    if (isEdit) {
                      context.read<SchoolBloc>().add(UpdateTermEvent(
                        term!.copyWith(
                          name: controller.text.trim(),
                          startDate: startDate,
                          endDate: endDate,
                        ),
                      ));
                    } else {
                      context.read<SchoolBloc>().add(AddTermEvent(
                        academicYearId: yearId,
                        name: controller.text.trim(),
                        startDate: startDate,
                        endDate: endDate,
                      ));
                    }
                  },
                  child: BlocBuilder<SchoolBloc, SchoolState>(
                    builder: (context, state) {
                      if (state.isLoading && state.status == SchoolStatus.loading) {
                        return const Text('Saving...', style: TextStyle(fontWeight: FontWeight.bold));
                      }
                      return Text(isEdit ? 'Update' : 'Add');
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ClassesTab extends StatelessWidget {
  final SchoolState state;
  const _ClassesTab({required this.state});

  @override
  Widget build(BuildContext context) {
    final classes = [...state.classes]
      ..sort((a, b) => _compareByName(a.name, b.name));
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddClassDialog(context),
        child: const Icon(Icons.add),
      ),
      body: ListView.builder(
        itemCount: classes.length,
        itemBuilder: (context, index) {
          final sClass = classes[index];
          return ListTile(
            title: Text(sClass.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: sClass.description != null ? Text(sClass.description!) : null,
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: () => _confirmDelete(context, sClass),
            ),
          );
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, SchoolClass sClass) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Class?'),
        content: Text('Are you sure you want to delete ${sClass.name}? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _verifyAndExecute(context, () {
                context.read<SchoolBloc>().add(DeleteClassEvent(sClass.id!));
              });
            },
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _verifyAndExecute(BuildContext context, VoidCallback onSuccess) {
    final settingsBloc = context.read<SettingsBloc>();
    
    // Reset auth to ensure listener catches new success
    settingsBloc.add(ResetSystemAuth());
    
    // Show password dialog
    showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PasswordDialog(bloc: settingsBloc),
    ).then((authorized) {
      if (authorized == true && context.mounted) {
        onSuccess();
      }
    });
  }

  void _showAddClassDialog(BuildContext context) {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    context.read<SchoolBloc>().add(ResetSchoolStatus());
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => BlocListener<SchoolBloc, SchoolState>(
        listenWhen: (previous, current) => previous.status != current.status,
        listener: (context, state) {
          if (state.status == SchoolStatus.success) {
            Navigator.of(ctx).pop();
          }
        },
        child: AlertDialog(
          title: const Text('Add Class'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Class Name')),
              TextField(controller: descController, decoration: const InputDecoration(labelText: 'Description (Optional)')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (nameController.text.isNotEmpty) {
                  context.read<SchoolBloc>().add(AddClassEvent(nameController.text, description: descController.text));
                }
              },
              child: BlocBuilder<SchoolBloc, SchoolState>(
                builder: (context, state) {
                  if (state.isLoading && state.status == SchoolStatus.loading) {
                    return const Text('Saving...', style: TextStyle(fontWeight: FontWeight.bold));
                  }
                  return const Text('Add');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
