import 'invoice_template.dart';
import 'concrete_templates.dart';

class TemplateRegistry {
  static final Map<TemplateType, InvoiceTemplate> _templates = {
    TemplateType.compact: CompactInvoiceTemplate(),
    TemplateType.detailed: DetailedInvoiceTemplate(),
    TemplateType.professional: ProfessionalInvoiceTemplate(),
    TemplateType.modern: ModernProfessionalTemplate(),
    TemplateType.classic: ClassicBusinessTemplate(),
    TemplateType.minimalist: MinimalistInvoiceTemplate(),
    TemplateType.schoolTeal: SchoolTealTemplate(),
    TemplateType.schoolColor: SchoolColorTemplate(),
    TemplateType.schoolAcademic: SchoolAcademicTemplate(),
    TemplateType.schoolTraditional: SchoolTraditionalTemplate(),
  };

  static List<InvoiceTemplate> get availableTemplates => _templates.values.toList();

  static InvoiceTemplate getTemplate(TemplateType type) {
    return _templates[type] ?? CompactInvoiceTemplate();
  }
}
