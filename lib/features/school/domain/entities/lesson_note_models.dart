import 'package:equatable/equatable.dart';

enum SyncStatus { pending, syncing, synced, failed }

class LessonNote extends Equatable {
  final int? id;
  final int? curriculumId;
  final String className;
  final String subjectName;
  final String term;
  final int week;
  final String topic;
  final StructuredNoteContent content;
  final String contentHash;
  final bool isAiGenerated;
  final int version;
  final SyncStatus syncStatus;
  final String? syncId;
  final int retryCount;
  final bool isDeleted;
  final String? deviceId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const LessonNote({
    this.id,
    this.curriculumId,
    required this.className,
    required this.subjectName,
    required this.term,
    required this.week,
    required this.topic,
    required this.content,
    required this.contentHash,
    this.isAiGenerated = true,
    this.version = 1,
    this.syncStatus = SyncStatus.pending,
    this.syncId,
    this.retryCount = 0,
    this.isDeleted = false,
    this.deviceId,
    this.createdAt,
    this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        curriculumId,
        className,
        subjectName,
        term,
        week,
        topic,
        content,
        contentHash,
        isAiGenerated,
        version,
        syncStatus,
        syncId,
        retryCount,
        isDeleted,
        deviceId,
        createdAt,
        updatedAt,
      ];

  LessonNote copyWith({
    int? id,
    int? curriculumId,
    String? className,
    String? subjectName,
    String? term,
    int? week,
    String? topic,
    StructuredNoteContent? content,
    String? contentHash,
    bool? isAiGenerated,
    int? version,
    SyncStatus? syncStatus,
    String? syncId,
    int? retryCount,
    bool? isDeleted,
    String? deviceId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LessonNote(
      id: id ?? this.id,
      curriculumId: curriculumId ?? this.curriculumId,
      className: className ?? this.className,
      subjectName: subjectName ?? this.subjectName,
      term: term ?? this.term,
      week: week ?? this.week,
      topic: topic ?? this.topic,
      content: content ?? this.content,
      contentHash: contentHash ?? this.contentHash,
      isAiGenerated: isAiGenerated ?? this.isAiGenerated,
      version: version ?? this.version,
      syncStatus: syncStatus ?? this.syncStatus,
      syncId: syncId ?? this.syncId,
      retryCount: retryCount ?? this.retryCount,
      isDeleted: isDeleted ?? this.isDeleted,
      deviceId: deviceId ?? this.deviceId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class StructuredNoteContent extends Equatable {
  final String topic;
  final List<String> learningObjectives;
  final String introduction;
  final List<LessonContentSection> mainContent;
  final List<String> examples;
  final List<String> classActivity;
  final List<String> assessment;
  final String summary;

  const StructuredNoteContent({
    required this.topic,
    required this.learningObjectives,
    required this.introduction,
    required this.mainContent,
    required this.examples,
    required this.classActivity,
    required this.assessment,
    required this.summary,
  });

  factory StructuredNoteContent.fromJson(Map<String, dynamic> json) {
    return StructuredNoteContent(
      topic: json['topic'] ?? '',
      learningObjectives: List<String>.from(json['learning_objectives'] ?? []),
      introduction: json['introduction'] ?? '',
      mainContent: (json['main_content'] as List? ?? [])
          .map((e) => LessonContentSection.fromJson(e))
          .toList(),
      examples: List<String>.from(json['examples'] ?? []),
      classActivity: List<String>.from(json['class_activity'] ?? []),
      assessment: List<String>.from(json['assessment'] ?? []),
      summary: json['summary'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'topic': topic,
      'learning_objectives': learningObjectives,
      'introduction': introduction,
      'main_content': mainContent.map((e) => e.toJson()).toList(),
      'examples': examples,
      'class_activity': classActivity,
      'assessment': assessment,
      'summary': summary,
    };
  }

  @override
  List<Object?> get props => [
        topic,
        learningObjectives,
        introduction,
        mainContent,
        examples,
        classActivity,
        assessment,
        summary,
      ];
}

class LessonContentSection extends Equatable {
  final String heading;
  final String explanation;

  const LessonContentSection({
    required this.heading,
    required this.explanation,
  });

  factory LessonContentSection.fromJson(Map<String, dynamic> json) {
    return LessonContentSection(
      heading: json['heading'] ?? '',
      explanation: json['explanation'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'heading': heading,
      'explanation': explanation,
    };
  }

  @override
  List<Object?> get props => [heading, explanation];
}

class CurriculumEntry extends Equatable {
  final int? id;
  final int classId;
  final int subjectId;
  final int termId;
  final int week;
  final String topic;

  const CurriculumEntry({
    this.id,
    required this.classId,
    required this.subjectId,
    required this.termId,
    required this.week,
    required this.topic,
  });

  @override
  List<Object?> get props => [id, classId, subjectId, termId, week, topic];
}
