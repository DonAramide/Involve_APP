import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../data/support_service.dart';

class ComplaintPage extends StatefulWidget {
  const ComplaintPage({Key? key}) : super(key: key);

  @override
  State<ComplaintPage> createState() => _ComplaintPageState();
}

class _ComplaintPageState extends State<ComplaintPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _supportService = SupportService();
  
  String _category = 'technical';
  String _urgency = 'normal';
  bool _isSubmitting = false;
  
  DateTime? _incidentDate;
  TimeOfDay? _incidentTime;
  String? _attachmentPath;
  String? _attachmentName;

  bool _isLoadingIssues = false;
  List<dynamic> _myIssues = [];

  @override
  void initState() {
    super.initState();
    _fetchIssues();
  }

  Future<void> _fetchIssues() async {
    setState(() => _isLoadingIssues = true);
    final issues = await _supportService.getComplaints();
    setState(() {
      _myIssues = issues;
      _isLoadingIssues = false;
    });
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    
    final success = await _supportService.submitComplaint(
      title: _titleController.text,
      description: _descController.text,
      category: _category,
      urgency: _urgency,
      incidentDate: _incidentDate != null ? "${_incidentDate!.year}-${_incidentDate!.month.toString().padLeft(2, '0')}-${_incidentDate!.day.toString().padLeft(2, '0')}" : null,
      incidentTime: _incidentTime != null ? "${_incidentTime!.hour.toString().padLeft(2, '0')}:${_incidentTime!.minute.toString().padLeft(2, '0')}" : null,
      attachmentPath: _attachmentPath,
    );
    
    setState(() => _isSubmitting = false);

    if (success) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complaint submitted successfully. Our team will review it shortly.'), backgroundColor: Colors.green),
      );
      
      // Reset form
      _titleController.clear();
      _descController.clear();
      setState(() {
        _incidentDate = null;
        _incidentTime = null;
        _attachmentPath = null;
        _attachmentName = null;
      });
      _fetchIssues(); // Refresh list
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to submit complaint. Please check your network and try again.'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _incidentDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() => _incidentTime = picked);
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles();
    if (result != null) {
      setState(() {
        _attachmentPath = result.files.single.path;
        _attachmentName = result.files.single.name;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Support & Complaints'),
          backgroundColor: const Color(0xFF1E293B),
          bottom: const TabBar(
            indicatorColor: Colors.amber,
            tabs: [
              Tab(text: 'New Issue'),
              Tab(text: 'My Tracking'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildNewComplaintForm(),
            _buildTrackingList(),
          ],
        ),
      ),
    );
  }

  Widget _buildNewComplaintForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('How can we help you?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _category,
              decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'technical', child: Text('Technical Issue')),
                DropdownMenuItem(value: 'finance', child: Text('Finance / Settlement')),
                DropdownMenuItem(value: 'account', child: Text('Account Management')),
                DropdownMenuItem(value: 'general', child: Text('General Inquiry')),
              ],
              onChanged: (val) => setState(() => _category = val!),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _urgency,
              decoration: const InputDecoration(labelText: 'Urgency', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'low', child: Text('Low')),
                DropdownMenuItem(value: 'normal', child: Text('Normal')),
                DropdownMenuItem(value: 'high', child: Text('High')),
                DropdownMenuItem(value: 'critical', child: Text('Critical')),
              ],
              onChanged: (val) => setState(() => _urgency = val!),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: const Icon(Icons.calendar_today, size: 18),
                    label: Text(_incidentDate == null ? 'Select Date' : "${_incidentDate!.year}-${_incidentDate!.month.toString().padLeft(2,'0')}-${_incidentDate!.day.toString().padLeft(2,'0')}"),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickTime,
                    icon: const Icon(Icons.access_time, size: 18),
                    label: Text(_incidentTime == null ? 'Select Time' : _incidentTime!.format(context)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Brief Title', border: OutlineInputBorder()),
              validator: (val) => val == null || val.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descController,
              decoration: const InputDecoration(labelText: 'Detailed Description', border: OutlineInputBorder()),
              maxLines: 5,
              validator: (val) => val == null || val.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _pickFile,
              icon: const Icon(Icons.attach_file),
              label: Text(_attachmentName == null ? 'Upload Document / Screenshot' : _attachmentName!),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber[800],
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isSubmitting 
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                : const Text('Submit Complaint', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildTrackingList() {
    if (_isLoadingIssues) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_myIssues.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            const Text('No issues reported yet.', style: TextStyle(fontSize: 16, color: Colors.grey)),
            TextButton(
              onPressed: _fetchIssues,
              child: const Text('Refresh'),
            )
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchIssues,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _myIssues.length,
        separatorBuilder: (_, __) => const Divider(),
        itemBuilder: (context, index) {
          final issue = _myIssues[index];
          final statusColor = issue['status'] == 'resolved' ? Colors.green 
              : (issue['status'] == 'in_progress' ? Colors.blue : Colors.orange);
              
          return Card(
            elevation: 1,
            child: ListTile(
              title: Text(issue['title'] ?? 'Untitled', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text(issue['description'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 8),
                  Text(
                    'Submitted: ${issue['created_at'] != null ? issue['created_at'].substring(0, 10) : 'N/A'}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
              trailing: Chip(
                label: Text(
                  (issue['status'] ?? 'pending').toUpperCase(),
                  style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                ),
                backgroundColor: statusColor,
              ),
              isThreeLine: true,
            ),
          );
        },
      ),
    );
  }
}
