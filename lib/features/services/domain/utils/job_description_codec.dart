import 'dart:convert';

class JobDescriptionSection {
  final int? categoryId;
  final String category;
  final List<JobDescriptionItem> items;

  const JobDescriptionSection({
    this.categoryId,
    required this.category,
    this.items = const [],
  });
}

class JobDescriptionItem {
  final int? fieldId;
  final String label;
  final String type;
  final dynamic value;

  const JobDescriptionItem({
    this.fieldId,
    required this.label,
    required this.type,
    this.value,
  });

  String get displayValue {
    if (type == 'checkbox') {
      return value == true || value == 'true' || value == 1 ? 'Yes' : 'No';
    }
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? '—' : text;
  }

  bool get hasContent {
    if (type == 'checkbox') return value == true || value == 'true' || value == 1;
    return (value?.toString().trim() ?? '').isNotEmpty;
  }
}

class JobDescriptionView {
  final bool structured;
  final List<JobDescriptionSection> sections;
  final String notes;
  final String? plainText;

  const JobDescriptionView({
    required this.structured,
    this.sections = const [],
    this.notes = '',
    this.plainText,
  });

  bool get isEmpty {
    if (!structured) return (plainText ?? '').trim().isEmpty;
    final hasItems = sections.any((s) => s.items.any((i) => i.hasContent));
    return !hasItems && notes.trim().isEmpty;
  }
}

class JobDescriptionCodec {
  static const formatKey = 'invify_desc_v1';

  static String encode({
    required List<JobDescriptionSection> sections,
    String notes = '',
  }) {
    return jsonEncode({
      'format': formatKey,
      'notes': notes,
      'sections': sections
          .map((s) => {
                'categoryId': s.categoryId,
                'category': s.category,
                'items': s.items
                    .map((i) => {
                          'fieldId': i.fieldId,
                          'label': i.label,
                          'type': i.type,
                          'value': i.value,
                        })
                    .toList(),
              })
          .toList(),
    });
  }

  static JobDescriptionView decode(String? raw) {
    final text = raw?.trim() ?? '';
    if (text.isEmpty) {
      return const JobDescriptionView(structured: false, plainText: '');
    }
    try {
      final decoded = jsonDecode(text);
      if (decoded is Map && decoded['format'] == formatKey) {
        final notes = decoded['notes']?.toString() ?? '';
        final rawSections = decoded['sections'];
        final sections = <JobDescriptionSection>[];
        if (rawSections is List) {
          for (final s in rawSections) {
            if (s is! Map) continue;
            final items = <JobDescriptionItem>[];
            final rawItems = s['items'];
            if (rawItems is List) {
              for (final i in rawItems) {
                if (i is! Map) continue;
                items.add(JobDescriptionItem(
                  fieldId: (i['fieldId'] as num?)?.toInt(),
                  label: i['label']?.toString() ?? '',
                  type: i['type']?.toString() ?? 'text',
                  value: i['value'],
                ));
              }
            }
            sections.add(JobDescriptionSection(
              categoryId: (s['categoryId'] as num?)?.toInt(),
              category: s['category']?.toString() ?? '',
              items: items,
            ));
          }
        }
        return JobDescriptionView(
          structured: true,
          sections: sections,
          notes: notes,
        );
      }
    } catch (_) {}
    return JobDescriptionView(structured: false, plainText: text);
  }

  static String toPlainText(String? raw) {
    final view = decode(raw);
    if (!view.structured) return (view.plainText ?? '').trim();
    final lines = <String>[];
    for (final section in view.sections) {
      final filled = section.items.where((i) => i.hasContent).toList();
      if (filled.isEmpty && section.items.isEmpty) continue;
      if (section.category.trim().isNotEmpty) {
        lines.add(section.category.trim());
      }
      for (final item in section.items) {
        if (!item.hasContent && item.type == 'checkbox') continue;
        if (!item.hasContent) continue;
        lines.add('• ${item.label}: ${item.displayValue}');
      }
    }
    if (view.notes.trim().isNotEmpty) {
      if (lines.isNotEmpty) lines.add('');
      lines.add(view.notes.trim());
    }
    return lines.join('\n');
  }
}
