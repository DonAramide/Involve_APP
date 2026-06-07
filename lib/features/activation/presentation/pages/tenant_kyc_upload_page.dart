import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:involve_app/core/utils/progress_dialog_utils.dart';
import '../../data/services/tenant_kyc_service.dart';

class TenantKycUploadPage extends StatefulWidget {
  const TenantKycUploadPage({super.key});

  @override
  State<TenantKycUploadPage> createState() => _TenantKycUploadPageState();
}

class _TenantKycUploadPageState extends State<TenantKycUploadPage> {
  final TenantKycService _kycService = TenantKycService();
  
  Map<String, File?> _selectedFiles = {
    'GOVT_ID': null,
    'UTILITY_BILL': null,
    'CAC_CERT': null,
  };

  Map<String, bool> _uploadStatus = {
    'GOVT_ID': false,
    'UTILITY_BILL': false,
    'CAC_CERT': false,
  };

  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCurrentKyc();
  }

  Future<void> _fetchCurrentKyc() async {
    try {
      final docs = await _kycService.fetchKycDocuments();
      if (mounted) {
        setState(() {
          for (var doc in docs) {
            final type = doc['document_type'];
            if (_uploadStatus.containsKey(type)) {
              _uploadStatus[type] = true;
            }
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickFile(String documentType) async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.blueAccent),
              title: const Text('Take a Photo'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(documentType, ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.purpleAccent),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(documentType, ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.insert_drive_file, color: Colors.green),
              title: const Text('Select PDF Document'),
              onTap: () {
                Navigator.pop(ctx);
                _pickPdf(documentType);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(String documentType, ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source, imageQuality: 80);
    
    if (pickedFile != null) {
      setState(() {
        _selectedFiles[documentType] = File(pickedFile.path);
      });
      _uploadFile(documentType, File(pickedFile.path));
    }
  }

  Future<void> _pickPdf(String documentType) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );

    if (result != null && result.files.single.path != null) {
      setState(() {
        _selectedFiles[documentType] = File(result.files.single.path!);
      });
      _uploadFile(documentType, File(result.files.single.path!));
    }
  }

  Future<void> _uploadFile(String documentType, File file) async {
    bool success = false;
    await ProgressDialogUtils.showDancingProgress(
      context,
      () async {
        success = await _kycService.uploadKycDocument(file: file, documentType: documentType);
      },
      message: 'Uploading document...',
    );

    if (mounted) {
      if (success) {
        setState(() {
          _uploadStatus[documentType] = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$documentType uploaded successfully!'), backgroundColor: Colors.green),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to upload $documentType.'), backgroundColor: Colors.red),
        );
      }
    }
  }

  bool _isAllRequiredUploaded() {
    // Make ID and Utility Bill mandatory, CAC optional depending on business type (for simplicity all 3 or just 2)
    return _uploadStatus['GOVT_ID'] == true && _uploadStatus['UTILITY_BILL'] == true;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('KYC Compliance', style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
        backgroundColor: theme.scaffoldBackgroundColor,
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: colorScheme.primary.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.verified_user, color: colorScheme.primary, size: 40),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mandatory for Pro Tier',
                            style: TextStyle(fontWeight: FontWeight.bold, color: colorScheme.primary, fontSize: 16),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Please upload the following documents to verify your business identity and activate your cloud linkage.',
                            style: TextStyle(color: colorScheme.onSurface.withOpacity(0.7), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              
              _buildDocumentCard(
                title: 'Government Issued ID',
                subtitle: 'Passport, Driver\\'s License, or National ID',
                documentType: 'GOVT_ID',
                icon: Icons.badge,
                isRequired: true,
              ),
              
              _buildDocumentCard(
                title: 'Utility Bill',
                subtitle: 'Recent electricity, water, or internet bill containing your address',
                documentType: 'UTILITY_BILL',
                icon: Icons.receipt_long,
                isRequired: true,
              ),

              _buildDocumentCard(
                title: 'CAC Certificate (Optional)',
                subtitle: 'Certificate of Incorporation for registered businesses',
                documentType: 'CAC_CERT',
                icon: Icons.business,
                isRequired: false,
              ),

              const SizedBox(height: 40),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: _isAllRequiredUploaded() ? colorScheme.primary : Colors.grey,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _isAllRequiredUploaded() ? () {
                    Navigator.pop(context, true); // Return success
                  } : null,
                  child: const Text('Complete Verification', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16)),
                ),
              )
            ],
          ),
    );
  }

  Widget _buildDocumentCard({
    required String title,
    required String subtitle,
    required String documentType,
    required IconData icon,
    required bool isRequired,
  }) {
    final theme = Theme.of(context);
    final isUploaded = _uploadStatus[documentType] ?? false;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isUploaded ? Colors.green.withOpacity(0.5) : theme.colorScheme.onSurface.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isUploaded ? Colors.green.withOpacity(0.1) : theme.colorScheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(isUploaded ? Icons.check_circle : icon, color: isUploaded ? Colors.green : theme.colorScheme.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      if (isRequired) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: Colors.red.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                          child: const Text('REQUIRED', style: TextStyle(color: Colors.red, fontSize: 8, fontWeight: FontWeight.bold)),
                        )
                      ]
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(subtitle, style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurface.withOpacity(0.6))),
                ],
              ),
            ),
            const SizedBox(width: 12),
            if (isUploaded)
              OutlinedButton.icon(
                onPressed: () => _pickFile(documentType),
                icon: const Icon(Icons.refresh, size: 14),
                label: const Text('Replace', style: TextStyle(fontSize: 12)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              )
            else
              ElevatedButton.icon(
                onPressed: () => _pickFile(documentType),
                icon: const Icon(Icons.upload_file, size: 14),
                label: const Text('Upload', style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              )
          ],
        ),
      ),
    );
  }
}
