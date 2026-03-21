import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_state.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';

class ContactPage extends StatefulWidget {
  const ContactPage({super.key});

  @override
  State<ContactPage> createState() => _ContactPageState();
}

class _ContactPageState extends State<ContactPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  int? _selectedClassId;

  @override
  void initState() {
    super.initState();
    context.read<StaffBloc>().add(LoadStaffList());
    context.read<SchoolBloc>().add(LoadSchoolData());
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final isSchoolMode = settingsState.settings?.businessMode == 'school';
        final tabCount = isSchoolMode ? 3 : 1;

        return DefaultTabController(
          length: tabCount,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('Contact Directory'),
              bottom: tabCount > 1 
                ? TabBar(
                    isScrollable: isSchoolMode,
                    tabs: [
                      Tab(icon: const Icon(Icons.people), text: isSchoolMode ? 'Management Staff' : 'Staff'),
                      if (isSchoolMode) 
                        const Tab(icon: Icon(Icons.school), text: 'Academic Staff'),
                      if (isSchoolMode)
                        const Tab(icon: Icon(Icons.family_restroom), text: 'Parents'),
                    ],
                  )
                : null,
              actions: [
                if (isSchoolMode) 
                BlocBuilder<SchoolBloc, SchoolState>(
                  builder: (context, state) {
                    final selectedClass = state.classes.firstWhereOrNull((c) => c.id == _selectedClassId);
                    return TextButton.icon(
                      onPressed: () => _showClassFilter(context, state),
                      icon: Icon(Icons.filter_list, color: _selectedClassId != null ? Colors.cyanAccent : Colors.white),
                      label: Text(
                        selectedClass?.name ?? 'ALL CLASSES',
                        style: TextStyle(color: _selectedClassId != null ? Colors.cyanAccent : Colors.white, fontSize: 12),
                      ),
                    );
                  },
                ),
              ],
            ),
            body: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search by name or phone...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                setState(() {
                                  _searchController.clear();
                                  _searchQuery = '';
                                });
                              },
                            )
                          : null,
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value.toLowerCase();
                      });
                    },
                  ),
                ),
                Expanded(
                  child: tabCount > 1 
                    ? TabBarView(
                        children: [
                          _buildStaffTab(isSchoolMode),
                          if (isSchoolMode) _buildTeachersTab(isSchoolMode),
                          if (isSchoolMode) _buildParentsTab(),
                        ],
                      )
                    : _buildStaffTab(isSchoolMode),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTeachersTab(bool isSchoolMode) {
    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, state) {
        if (state.isLoading) return const Center(child: CircularProgressIndicator());
        
        final filteredList = state.teachers.where((teacher) {
          final query = _searchQuery;
          // APPLY CLASS FILTER
          if (_selectedClassId != null && teacher.classId != _selectedClassId) return false;

          return teacher.fullName.toLowerCase().contains(query) || 
                 (teacher.phone?.contains(query) ?? false);
        }).toList();

        if (filteredList.isEmpty) {
          return Center(child: Text(isSchoolMode ? 'No academic staff found' : 'No teachers found'));
        }

        return ListView.builder(
          itemCount: filteredList.length,
          itemBuilder: (context, index) {
            final teacher = filteredList[index];
            return _ContactTile(
              name: teacher.fullName,
              phone: teacher.phone,
              subtitle: '${teacher.profession ?? (isSchoolMode ? "Academic Staff" : "Teacher")}',
              icon: Icons.school_outlined,
            );
          },
        );
      },
    );
  }

  Widget _buildStaffTab(bool isSchoolMode) {
    return BlocBuilder<StaffBloc, StaffState>(
      builder: (context, state) {
        if (state.isLoading) return const Center(child: CircularProgressIndicator());
        
        final filteredList = state.staffList.where((staff) {
          final query = _searchQuery;
          return staff.name.toLowerCase().contains(query) || 
                 (staff.phone?.contains(query) ?? false);
        }).toList();

        if (filteredList.isEmpty) {
          return Center(child: Text(isSchoolMode ? 'No management staff found' : 'No staff found'));
        }

        return ListView.builder(
          itemCount: filteredList.length,
          itemBuilder: (context, index) {
            final staff = filteredList[index];
            return _ContactTile(
              name: staff.name,
              phone: staff.phone,
              subtitle: 'Staff ID: ${staff.staffId ?? staff.id}',
              icon: Icons.person_outline,
            );
          },
        );
      },
    );
  }

  Widget _buildParentsTab() {
    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, state) {
        if (state.isLoading) return const Center(child: CircularProgressIndicator());

        // Extract unique parents from students
        final Map<String, ({Student student, SchoolClass? schoolClass})> parentMap = {};
        for (var student in state.students) {
          if (student.parentName != null && student.parentName!.isNotEmpty) {
            // APPLY CLASS FILTER
            if (_selectedClassId != null && student.classId != _selectedClassId) continue;

            final key = '${student.parentName}_${student.parentPhone}';
            if (!parentMap.containsKey(key)) {
              final sClass = state.classes.firstWhereOrNull((c) => c.id == student.classId);
              parentMap[key] = (student: student, schoolClass: sClass);
            }
          }
        }

        final parentList = parentMap.values.toList();
        final filteredList = parentList.where((p) {
          final query = _searchQuery;
          return p.student.parentName!.toLowerCase().contains(query) || 
                 (p.student.parentPhone?.contains(query) ?? false) ||
                 p.student.fullName.toLowerCase().contains(query); // SEARCH BY STUDENT NAME
        }).toList();

        if (filteredList.isEmpty) {
          return Center(child: Text(_selectedClassId != null ? 'No parents found in this class' : 'No parents found'));
        }

        return ListView.builder(
          itemCount: filteredList.length,
          itemBuilder: (context, index) {
            final entry = filteredList[index];
            final parent = entry.student;
            final className = entry.schoolClass?.name ?? 'Unknown Class';
            
            return _ContactTile(
              name: parent.parentName!,
              phone: parent.parentPhone,
              subtitle: 'Parent of: ${parent.fullName} [$className]',
              icon: Icons.family_restroom_outlined,
            );
          },
        );
      },
    );
  }

  void _showClassFilter(BuildContext context, SchoolState state) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Filter by Class'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView(
            shrinkWrap: true,
            children: [
              ListTile(
                title: const Text('ALL CLASSES'),
                leading: Radio<int?>(
                  value: null,
                  groupValue: _selectedClassId,
                  onChanged: (val) {
                    setState(() => _selectedClassId = val);
                    Navigator.pop(ctx);
                  },
                ),
                onTap: () {
                  setState(() => _selectedClassId = null);
                  Navigator.pop(ctx);
                },
              ),
              ...state.classes.map((c) => ListTile(
                title: Text(c.name),
                leading: Radio<int?>(
                  value: c.id,
                  groupValue: _selectedClassId,
                  onChanged: (val) {
                    setState(() => _selectedClassId = val);
                    Navigator.pop(ctx);
                  },
                ),
                onTap: () {
                  setState(() => _selectedClassId = c.id);
                  Navigator.pop(ctx);
                },
              )),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  final String name;
  final String? phone;
  final String subtitle;
  final IconData icon;

  const _ContactTile({
    required this.name,
    this.phone,
    required this.subtitle,
    required this.icon,
  });

  Future<void> _launch(String scheme, String number) async {
    final cleanNumber = number.replaceAll(RegExp(r'[^0-9+]'), '');
    Uri uri;
    if (scheme == 'whatsapp') {
      uri = Uri.parse('https://wa.me/$cleanNumber');
    } else {
      uri = Uri(scheme: scheme, path: cleanNumber);
    }
    
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPhone = phone != null && phone!.isNotEmpty;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          child: Icon(icon),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(subtitle),
            if (hasPhone) Text(phone!, style: const TextStyle(color: Colors.blueGrey)),
          ],
        ),
        trailing: hasPhone
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.call, color: Colors.green),
                    onPressed: () => _launch('tel', phone!),
                    tooltip: 'Call',
                  ),
                  IconButton(
                    icon: const Icon(Icons.message, color: Colors.blue),
                    onPressed: () => _launch('sms', phone!),
                    tooltip: 'SMS',
                  ),
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.chat, color: Colors.white, size: 16),
                    ),
                    onPressed: () => _launch('whatsapp', phone!),
                    tooltip: 'WhatsApp',
                  ),
                ],
              )
            : null,
      ),
    );
  }
}
