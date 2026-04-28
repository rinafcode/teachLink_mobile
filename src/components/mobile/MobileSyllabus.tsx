import React, { useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { CourseProgress, Lesson, Section } from '../../types/course';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Props for the MobileSyllabus component
 */
interface MobileSyllabusProps {
  /** Array of course sections to display */
  sections: Section[];
  /** Optional course progress data for showing completion status */
  /** Course progress data */
  progress?: CourseProgress | null;
  /** ID of the currently active lesson */
  currentLessonId?: string;
  /** Callback when a lesson is selected */
  onLessonSelect: (lessonId: string, sectionId: string) => void;
  /** Optional callback when a section is expanded/collapsed */
  /** Optional callback when a section is toggled */
  onSectionToggle?: (sectionId: string, isExpanded: boolean) => void;
}

export default function MobileSyllabus({
  sections,
  progress,
  currentLessonId,
  onLessonSelect,
  onSectionToggle,
}: MobileSyllabusProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id)) // All expanded by default
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    const isCurrentlyExpanded = newExpanded.has(sectionId);

    if (isCurrentlyExpanded) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }

    setExpandedSections(newExpanded);
    onSectionToggle?.(sectionId, !isCurrentlyExpanded);
  };

  const getSectionProgress = (section: Section): number => {
    if (!progress || section.lessons.length === 0) return 0;

    const completedCount = section.lessons.filter(
      (lesson) => progress.lessons[lesson.id]?.completed
    ).length;

    return Math.round((completedCount / section.lessons.length) * 100);
  };

  const getLessonStatus = (lesson: Lesson): 'completed' | 'in-progress' | 'not-started' => {
    if (!progress) return 'not-started';
    
    const lessonProgress = progress.lessons[lesson.id];
    if (lessonProgress?.completed) return 'completed';
    if (lesson.id === currentLessonId || lessonProgress?.lastPosition > 0) {
      return 'in-progress';
    }
    return 'not-started';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Course Syllabus</Text>
        <Text style={styles.headerSubtitle}>
          {sections.length} sections • {sections.reduce((acc, s) => acc + s.lessons.length, 0)} lessons
        </Text>
      </View>

      {/* Sections */}
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const sectionProgress = getSectionProgress(section);

        return (
          <View key={section.id} style={styles.sectionCard}>
            {/* Section Header */}
            <TouchableOpacity
              onPress={() => toggleSection(section.id)}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionHeaderContent}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.lessonCountBadge}>
                    <Text style={styles.lessonCountText}>{section.lessons.length}</Text>
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${sectionProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{sectionProgress}% complete</Text>
                </View>
              </View>

              {/* Expand/Collapse Icon */}
              <Text
                style={[
                  styles.expandIcon,
                  {
                    transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                  },
                ]}
              >
                ▼
              </Text>
            </TouchableOpacity>

            {/* Section Lessons */}
            {isExpanded && (
              <View style={styles.lessonsContainer}>
                {section.lessons.map((lesson, lessonIndex) => {
                  const status = getLessonStatus(lesson);
                  const isCurrent = lesson.id === currentLessonId;
                  const lessonProgress = progress?.lessons[lesson.id];

                  return (
                    <TouchableOpacity
                      key={lesson.id}
                      onPress={() => onLessonSelect(lesson.id, section.id)}
                      style={[
                        styles.lessonItem,
                        isCurrent && styles.lessonItemCurrent,
                      ]}
                    >
                      {/* Lesson Status Icon */}
                      <View style={styles.lessonStatusIcon}>
                        {status === 'completed' ? (
                          <View style={styles.statusIconCompleted}>
                            <Text style={styles.statusIconText}>✓</Text>
                          </View>
                        ) : status === 'in-progress' ? (
                          <View style={styles.statusIconInProgress}>
                            <View style={styles.statusIconDot} />
                          </View>
                        ) : (
                          <View style={styles.statusIconNotStarted}>
                            <Text style={styles.statusIconNumber}>{lessonIndex + 1}</Text>
                          </View>
                        )}
                      </View>

                      {/* Lesson Info */}
                      <View style={styles.lessonContent}>
                        <Text
                          style={[
                            styles.lessonTitle,
                            isCurrent && styles.lessonTitleCurrent,
                          ]}
                        >
                          {lesson.title}
                        </Text>
                        
                        <View style={styles.lessonMetadata}>
                          <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>⏱️ {lesson.duration} min</Text>
                          </View>
                          
                          {lessonProgress?.lastPosition && lessonProgress.lastPosition > 0 && status !== 'completed' && (
                            <View style={styles.resumeBadge}>
                              <Text style={styles.resumeText}>📌 Resume</Text>
                            </View>
                          )}
                          
                          {progress?.bookmarks.includes(lesson.id) && (
                            <View style={styles.bookmarkBadge}>
                              <Text style={styles.bookmarkText}>⭐ Bookmarked</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Current Lesson Badge */}
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f1f5',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderContent: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  lessonCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#19c3e6',
    borderRadius: 12,
    marginLeft: 8,
  },
  lessonCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarContainer: {
    gap: 6,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#19c3e6',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#19c3e6',
  },
  expandIcon: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '600',
  },
  lessonsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  lessonItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    backgroundColor: '#ffffff',
  },
  lessonItemCurrent: {
    backgroundColor: 'rgba(25, 195, 230, 0.05)',
    borderLeftColor: '#19c3e6',
  },
  lessonStatusIcon: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconCompleted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIconInProgress: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#19c3e6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  statusIconNotStarted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusIconNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  lessonTitleCurrent: {
    color: '#19c3e6',
    fontWeight: '700',
  },
  lessonMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  resumeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(25, 195, 230, 0.15)',
    borderRadius: 4,
  },
  resumeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#19c3e6',
  },
  bookmarkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  bookmarkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#19c3e6',
    borderRadius: 12,
    marginLeft: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});
