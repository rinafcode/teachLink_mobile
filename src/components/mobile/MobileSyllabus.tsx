import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CourseProgress, Lesson, Section } from '../../types/course';

import type { SectionListData, SectionListRenderItemInfo } from 'react-native';

/**
 * Props for the MobileSyllabus component
 */
interface MobileSyllabusProps {
  /** Array of course sections to display */
  sections: Section[];
  /** Course progress data */
  progress?: CourseProgress | null;
  /** ID of the currently active lesson */
  currentLessonId?: string;
  /** Callback when a lesson is selected */
  onLessonSelect: (lessonId: string, sectionId: string) => void;
  /** Optional callback when a section is toggled */
  onSectionToggle?: (sectionId: string, isExpanded: boolean) => void;
}

/** Extra fields attached to each SectionList section. */
type SyllabusSectionExtra = { courseSection: Section };
type SyllabusSection = SectionListData<Lesson, SyllabusSectionExtra>;

/**
 * PERFORMANCE NOTES (issue #219)
 * --------------------------------------------------------------------------
 * Before: every section and every lesson was rendered inside a single
 * <ScrollView> via `.map()`. For large courses (1000+ lessons) that mounts
 * thousands of views up-front -> high memory and 15-20fps scrolling.
 *
 * After: a <SectionList> (built on VirtualizedList) renders only the rows near
 * the viewport and recycles them while scrolling, keeping memory flat and
 * scrolling at ~60fps no matter how many lessons a course has.
 *
 * Tuning props (verify with the React Profiler):
 *   - keyExtractor              -> stable keys avoid needless re-renders
 *   - initialNumToRender        -> small first screenful = fast time-to-interactive
 *   - maxToRenderPerBatch       -> rows rendered per batch (kept in the 10-15 range)
 *   - updateCellsBatchingPeriod -> ms between render batches (smooths frame pacing)
 *   - windowSize                -> screens worth of rows kept mounted
 *   - removeClippedSubviews     -> unmounts off-screen rows to free memory
 *
 * getItemLayout is intentionally omitted here: lesson rows have variable height
 * (wrapping titles + optional Resume/Bookmarked badges), so a fixed height would
 * break scroll positioning. Only use getItemLayout when row height is constant.
 */
const MobileSyllabus = ({
  sections,
  progress,
  currentLessonId,
  onLessonSelect,
  onSectionToggle,
}: MobileSyllabusProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(sections.map(s => s.id)) // All expanded by default
  );

  const toggleSection = useCallback(
    (sectionId: string) => {
      const isCurrentlyExpanded = expandedSections.has(sectionId);
      const newExpanded = new Set(expandedSections);

      if (isCurrentlyExpanded) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }

      setExpandedSections(newExpanded);
      onSectionToggle?.(sectionId, !isCurrentlyExpanded);
    },
    [expandedSections, onSectionToggle]
  );

  const getSectionProgress = useCallback(
    (section: Section): number => {
      if (!progress || section.lessons.length === 0) return 0;

      const completedCount = section.lessons.filter(
        lesson => progress.lessons[lesson.id]?.completed
      ).length;

      return Math.round((completedCount / section.lessons.length) * 100);
    },
    [progress]
  );

  const getLessonStatus = useCallback(
    (lesson: Lesson): 'completed' | 'in-progress' | 'not-started' => {
      if (!progress) return 'not-started';

      const lessonProgress = progress.lessons[lesson.id];
      if (lessonProgress?.completed) return 'completed';
      if (lesson.id === currentLessonId || lessonProgress?.lastPosition > 0) {
        return 'in-progress';
      }
      return 'not-started';
    },
    [progress, currentLessonId]
  );

  // Map course sections into SectionList sections. Collapsed -> empty data array
  // so those lesson rows are unmounted while the section header stays visible.
  const listSections = useMemo<SyllabusSection[]>(
    () =>
      sections.map(section => ({
        courseSection: section,
        data: expandedSections.has(section.id) ? section.lessons : [],
      })),
    [sections, expandedSections]
  );

  const keyExtractor = useCallback(
    (lesson: Lesson, index: number) => lesson.id ?? `lesson-${index}`,
    []
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SyllabusSection }) => {
      const courseSection = section.courseSection;
      const isExpanded = expandedSections.has(courseSection.id);
      const sectionProgress = getSectionProgress(courseSection);

      return (
        <TouchableOpacity
          onPress={() => toggleSection(courseSection.id)}
          style={styles.sectionHeader}
          testID={`section-header-${courseSection.id}`}
        >
          <View style={styles.sectionHeaderContent}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>{courseSection.title}</Text>
              <View style={styles.lessonCountBadge}>
                <Text style={styles.lessonCountText}>{courseSection.lessons.length}</Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${sectionProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{sectionProgress}% complete</Text>
            </View>
          </View>

          <Text
            style={[styles.expandIcon, { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }]}
          >
            ▼
          </Text>
        </TouchableOpacity>
      );
    },
    [expandedSections, getSectionProgress, toggleSection]
  );

  const renderLesson = useCallback(
    ({
      item: lesson,
      index: lessonIndex,
      section,
    }: SectionListRenderItemInfo<Lesson, SyllabusSectionExtra>) => {
      const status = getLessonStatus(lesson);
      const isCurrent = lesson.id === currentLessonId;
      const lessonProgress = progress?.lessons[lesson.id];

      return (
        <TouchableOpacity
          onPress={() => onLessonSelect(lesson.id, section.courseSection.id)}
          style={[styles.lessonItem, isCurrent && styles.lessonItemCurrent]}
          testID={`lesson-item-${lesson.id}`}
        >
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

          <View style={styles.lessonContent}>
            <Text style={[styles.lessonTitle, isCurrent && styles.lessonTitleCurrent]}>
              {lesson.title}
            </Text>

            <View style={styles.lessonMetadata}>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>⏱️ {lesson.duration} min</Text>
              </View>

              {lessonProgress?.lastPosition &&
                lessonProgress.lastPosition > 0 &&
                status !== 'completed' && (
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

          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [currentLessonId, getLessonStatus, onLessonSelect, progress]
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📚 Course Syllabus</Text>
        <Text style={styles.headerSubtitle}>
          {sections.length} sections • {sections.reduce((acc, s) => acc + s.lessons.length, 0)}{' '}
          lessons
        </Text>
      </View>
    ),
    [sections]
  );

  return (
    <SectionList
      sections={listSections}
      keyExtractor={keyExtractor}
      renderItem={renderLesson}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={() => <View style={styles.sectionFooter} />}
      ListHeaderComponent={ListHeader}
      stickySectionHeadersEnabled={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      // ---- Virtualization tuning (see PERFORMANCE NOTES above) ----
      removeClippedSubviews={true}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      updateCellsBatchingPeriod={50}
      windowSize={7}
      testID="syllabus-list"
    />
  );
};

export default MobileSyllabus;

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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  sectionFooter: {
    height: 12,
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
