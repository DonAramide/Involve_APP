import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/school_entities.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/utils/currency_formatter.dart';
import 'student_list_page.dart';

class TeacherProfilePage extends StatelessWidget {
  final Teacher teacher;
  const TeacherProfilePage({super.key, required this.teacher});

  Future<void> _callTeacher(String phone) async {
    final Uri url = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, state) {
        // Find the fresh teacher model and their assigned class
        final currentTeacher = state.teachers.where((t) => t.id == teacher.id).firstOrNull ?? teacher;
        final assignedClass = state.classes.where((c) => c.id == currentTeacher.classId).firstOrNull;

        return Scaffold(
          appBar: AppBar(
            title: Text(currentTeacher.fullName),
            actions: [
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.red),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (c) => AlertDialog(
                      title: const Text('Delete Teacher'),
                      content: const Text('Are you sure you want to delete this teacher?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(c), child: const Text('Cancel')),
                        ElevatedButton(
                          onPressed: () {
                            context.read<SchoolBloc>().add(DeleteTeacherEvent(currentTeacher.id!));
                            Navigator.pop(c);
                            Navigator.pop(context);
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                          child: const Text('Delete'),
                        ),
                      ],
                    ),
                  );
                },
              )
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Hero(
                    tag: 'teacher-${currentTeacher.id}',
                    child: CircleAvatar(
                      radius: 60,
                      backgroundImage: currentTeacher.image != null ? MemoryImage(currentTeacher.image!) : null,
                      child: currentTeacher.image == null ? const Icon(Icons.person, size: 60) : null,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(currentTeacher.fullName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                ),
                Center(
                  child: Text(currentTeacher.profession ?? 'Staff', style: const TextStyle(fontSize: 18, color: Colors.grey)),
                ),
                const SizedBox(height: 24),
                
                // Quick Actions
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    if (currentTeacher.phone != null && currentTeacher.phone!.isNotEmpty)
                      ElevatedButton.icon(
                        onPressed: () => _callTeacher(currentTeacher.phone!),
                        icon: const Icon(Icons.phone),
                        label: const Text('Call'),
                      ),
                    ElevatedButton.icon(
                      onPressed: () {
                        if (currentTeacher.classId != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => StudentListPage(initialClassFilter: currentTeacher.classId),
                            ),
                          );
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No class assigned to this teacher.')));
                        }
                      },
                      icon: const Icon(Icons.people),
                      label: const Text('View Class Students'),
                    ),
                  ],
                ),

                const SizedBox(height: 32),
                
                // Details Card
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Divider(),
                        _buildDetailRow('Assigned Class:', assignedClass?.name ?? 'None'),
                        _buildDetailRow('Phone:', currentTeacher.phone ?? 'N/A'),
                        _buildDetailRow('Salary:', CurrencyFormatter.format(currentTeacher.salary)),
                        _buildDetailRow('Years in School:', currentTeacher.yearsInSchool.toString()),
                        const SizedBox(height: 8),
                        const Text('Certificates:', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text(currentTeacher.certificates?.isNotEmpty == true ? currentTeacher.certificates! : 'No certificates recorded.'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          Text(value),
        ],
      ),
    );
  }
}
