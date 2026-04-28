import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppText as Text } from "../common/AppText";
import { useDynamicFontSize } from "../../hooks/useDynamicFontSize";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCourseProgress } from "../../hooks/useCourseProgress";
import { RootStackParamList } from "../../navigation/types";
import { Course, Lesson, Note } from "../../types/course";
import logger from "../../utils/logger";
import { ErrorBoundary } from "../common/ErrorBoundary";
import PrimaryButton from "../common/PrimaryButton";
import BookmarkButton from "./BookmarkButton";
import LessonCarousel from "./LessonCarousel";
import MobileSyllabus from "./MobileSyllabus";

/**
 * Props for the MobileCourseViewer component
 */
interface MobileCourseViewerProps {
  /** Course data to display */
  course: Course;
  /** ID of the lesson to start with */
  initialLessonId?: string;
  /** Initial view mode to display */
  initialViewMode?: ViewMode;
  /** Optional callback when back button is pressed */
  onBack?: () => void;
  /** Navigation prop for React Navigation */
  navigation?: NativeStackNavigationProp<RootStackParamList>;
}

type ViewMode = "lesson" | "syllabus" | "notes";

export default function MobileCourseViewer({
  course,
  initialLessonId,
  initialViewMode,
  onBack,
  navigation,
}: MobileCourseViewerProps) {
  const { scale } = useDynamicFontSize();
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialViewMode || "lesson",
  );
  const [currentLessonId, setCurrentLessonId] = useState<string>(
    initialLessonId || course.sections[0]?.lessons[0]?.id || "",
  );
  const [currentSectionId, setCurrentSectionId] = useState<string>(
    course.sections[0]?.id || "",
  );
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteTimestamp, setNoteTimestamp] = useState(0);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showQuizPromptModal, setShowQuizPromptModal] = useState(false);

  const {
    progress,
    isLoading,
    updateLessonProgress,
    markLessonComplete,
    setCurrentLesson,
    addBookmark,
    removeBookmark,
    addNote,
    updateNote,
    deleteNote,
    updateLastPosition,
    calculateOverallProgress,
  } = useCourseProgress({
    courseId: course.id,
    course,
    autoSync: true,
  });

  // Get all lessons in order
  const allLessons = course.sections.flatMap((section) =>
    section.lessons.map((lesson) => lesson),
  );

  // Helper to get section ID for a lesson
  const getSectionIdForLesson = useCallback(
    (lessonId: string): string => {
      for (const section of course.sections) {
        if (section.lessons.some((l) => l.id === lessonId)) {
          return section.id;
        }
      }
      return course.sections[0]?.id || "";
    },
    [course],
  );

  const currentLesson = allLessons.find((l) => l.id === currentLessonId);
  const isBookmarked = progress?.bookmarks.includes(currentLessonId) || false;

  // Check if current lesson is last in its section
  const isLastLessonInSection = useMemo(() => {
    const currentSection = course.sections.find(
      (s) => s.id === currentSectionId,
    );
    if (!currentSection || currentSection.lessons.length === 0) return false;

    const lastLessonInSection =
      currentSection.lessons[currentSection.lessons.length - 1];
    return currentLessonId === lastLessonInSection?.id;
  }, [currentLessonId, currentSectionId, course]);

  // Check if current section has a quiz
  const sectionHasQuiz = useMemo(() => {
    const currentSection = course.sections.find(
      (s) => s.id === currentSectionId,
    );
    return currentSection?.quizzes && currentSection.quizzes.length > 0;
  }, [currentSectionId, course]);

  // Get the quiz for current section (if exists)
  const currentSectionQuiz = useMemo(() => {
    const currentSection = course.sections.find(
      (s) => s.id === currentSectionId,
    );
    return currentSection?.quizzes?.[0] || null; // Get first quiz if multiple exist
  }, [currentSectionId, course]);

  // Resume from last position
  useEffect(() => {
    if (progress && currentLessonId) {
      const lessonProgress = progress.lessons[currentLessonId];
      if (lessonProgress?.lastPosition > 0 && !lessonProgress.completed) {
        // Could scroll to position or seek video here
        logger.info("Resuming from position:", lessonProgress.lastPosition);
      }
    }
  }, [currentLessonId, progress]);

  // Error handling
  useEffect(() => {
    try {
      logger.component("MobileCourseViewer", "Mounted", {
        courseId: course.id,
      });
    } catch (error) {
      logger.error("Error in MobileCourseViewer:", error);
    }
  }, [course.id]);

  const handleLessonChange = useCallback(
    async (lessonId: string, index: number) => {
      const sectionId = getSectionIdForLesson(lessonId);
      setCurrentLessonId(lessonId);
      setCurrentSectionId(sectionId);
      await setCurrentLesson(lessonId, sectionId);
    },
    [getSectionIdForLesson, setCurrentLesson],
  );

  const handleLessonSelect = useCallback(
    async (lessonId: string, sectionId: string) => {
      setCurrentLessonId(lessonId);
      setCurrentSectionId(sectionId);
      await setCurrentLesson(lessonId, sectionId);
      setViewMode("lesson");
    },
    [setCurrentLesson],
  );

  const handleBookmarkToggle = useCallback(async () => {
    if (isBookmarked) {
      await removeBookmark(currentLessonId);
    } else {
      await addBookmark(currentLessonId);
    }
  }, [isBookmarked, currentLessonId, addBookmark, removeBookmark]);

  const handleCompleteLesson = useCallback(async () => {
    Alert.alert("Complete Lesson", "Mark this lesson as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          await markLessonComplete(currentLessonId);
        },
      },
    ]);
  }, [currentLessonId, markLessonComplete]);

  const handleAddNote = useCallback(() => {
    setEditingNote(null);
    setNoteContent("");
    setNoteTimestamp(Date.now());
    setShowNoteModal(true);
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!noteContent.trim()) {
      Alert.alert("Error", "Note content cannot be empty");
      return;
    }

    try {
      if (editingNote) {
        await updateNote(currentLessonId, editingNote.id, noteContent);
      } else {
        await addNote(currentLessonId, noteContent, noteTimestamp);
      }
      setShowNoteModal(false);
      setNoteContent("");
      setEditingNote(null);
    } catch (error) {
      logger.error("Failed to save note:", error);
      Alert.alert("Error", "Failed to save note");
    }
  }, [
    noteContent,
    noteTimestamp,
    editingNote,
    currentLessonId,
    addNote,
    updateNote,
  ]);

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setNoteTimestamp(note.timestamp);
    setShowNoteModal(true);
  }, []);

  const handleDeleteNote = useCallback(
    async (note: Note) => {
      Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteNote(currentLessonId, note.id);
          },
        },
      ]);
    },
    [currentLessonId, deleteNote],
  );

  // Handle "Next" button click on last lesson
  const handleLastLessonNext = useCallback(() => {
    if (isLastLessonInSection && sectionHasQuiz) {
      // Show quiz prompt modal
      setShowQuizPromptModal(true);
    } else {
      // No quiz, just go to syllabus
      setViewMode("syllabus");
    }
  }, [isLastLessonInSection, sectionHasQuiz]);

  // Handle "Take Quiz" button - using navigation prop (React Navigation)
  const handleTakeQuiz = useCallback(() => {
    if (!currentSectionQuiz || !navigation) return;

    setShowQuizPromptModal(false);
    navigation.navigate("Quiz", {
      quiz: currentSectionQuiz,
      courseId: course.id,
      course: course, // Pass course for navigation back to syllabus
    });
  }, [currentSectionQuiz, course, navigation]);

  // Handle "Skip" button
  const handleSkipQuiz = useCallback(() => {
    setShowQuizPromptModal(false);
    setViewMode("syllabus");
  }, []);

  const renderLessonContent = useCallback(
    (lesson: Lesson) => {
      const lessonNotes = progress?.notes[lesson.id] || [];

      return (
        <View style={styles.lessonContentWrapper}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Lesson Content */}
            <View style={styles.lessonSection}>
              <Text style={styles.lessonText}>{lesson.content}</Text>
            </View>

            {/* Resources */}
            {lesson.resources && lesson.resources.length > 0 && (
              <View style={styles.resourcesSection}>
                <Text style={styles.sectionTitle}>📚 Resources</Text>
                {lesson.resources.map((resource) => (
                  <TouchableOpacity
                    key={resource.id}
                    style={styles.resourceItem}
                  >
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <Text style={styles.resourceType}>
                      {resource.type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Notes Section */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>📝 Your Notes</Text>

              {lessonNotes.length === 0 ? (
                <View style={styles.emptyNotesContainer}>
                  <Text style={styles.emptyNotesText}>
                    No notes yet. Start taking notes to get started!
                  </Text>
                </View>
              ) : (
                <View>
                  {lessonNotes.map((note) => (
                    <View key={note.id} style={styles.noteCard}>
                      <View style={styles.noteHeader}>
                        <Text style={styles.noteDate}>
                          {new Date(note.createdAt).toLocaleDateString()} •{" "}
                          {new Date(note.createdAt).toLocaleTimeString()}
                        </Text>
                        <View style={styles.noteActions}>
                          <TouchableOpacity
                            onPress={() => handleEditNote(note)}
                          >
                            <Text style={styles.editNoteButton}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteNote(note)}
                          >
                            <Text style={styles.deleteNoteButton}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.noteContent}>{note.content}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    },
    [progress, handleAddNote, handleEditNote, handleDeleteNote],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#19c3e6" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </SafeAreaView>
    );
  }

  const overallProgress = calculateOverallProgress();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {course.title}
            </Text>
            <Text style={styles.subtitle}>{overallProgress}% complete</Text>
          </View>
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={handleBookmarkToggle}
            size="small"
            showLabel={false}
          />
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBarContainer, { height: scale(8) }]}>
          <View
            style={[styles.progressBar, { width: `${overallProgress}%` }]}
          />
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setViewMode("lesson")}
          style={[
            styles.tab,
            {
              borderBottomColor:
                viewMode === "lesson" ? "#20afe7" : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: viewMode === "lesson" ? "#20afe7" : "#6b7280",
                fontWeight: viewMode === "lesson" ? "700" : "600",
              },
            ]}
          >
            Lesson
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode("syllabus")}
          style={[
            styles.tab,
            {
              borderBottomColor:
                viewMode === "syllabus" ? "#20afe7" : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: viewMode === "syllabus" ? "#20afe7" : "#6b7280",
                fontWeight: viewMode === "syllabus" ? "700" : "600",
              },
            ]}
          >
            Syllabus
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === "lesson" && currentLesson && (
        <View style={styles.contentContainer}>
          <LessonCarousel
            lessons={allLessons}
            currentLessonId={currentLessonId}
            progress={progress}
            onLessonChange={handleLessonChange}
            onProgressUpdate={updateLastPosition}
            renderLessonContent={renderLessonContent}
            onLastLessonNext={handleLastLessonNext}
            isLastLessonInSection={isLastLessonInSection}
          />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <PrimaryButton
                onPress={handleAddNote}
                title="📝 Add Note"
                variant="solid"
                size="medium"
              />
            </View>
            <View style={styles.buttonWrapper}>
              <PrimaryButton
                onPress={handleCompleteLesson}
                title="✓ Complete"
                variant="gradient"
                size="medium"
              />
            </View>
          </View>
        </View>
      )}

      {viewMode === "syllabus" && (
        <MobileSyllabus
          sections={course.sections}
          progress={progress}
          currentLessonId={currentLessonId}
          onLessonSelect={handleLessonSelect}
        />
      )}

      {/* Quiz Prompt Modal */}
      <Modal
        visible={showQuizPromptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleSkipQuiz}
      >
        <ErrorBoundary boundaryName="CourseViewer.QuizPromptModal">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Section Complete! 🎉</Text>
                <TouchableOpacity onPress={handleSkipQuiz}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                You have finished all lessons in this section. Ready to test
                your knowledge with a quiz?
              </Text>

              {currentSectionQuiz && (
                <View style={styles.quizInfoContainer}>
                  <Text style={styles.quizInfoTitle}>
                    {currentSectionQuiz.title}
                  </Text>
                  <Text style={styles.quizInfoSubtitle}>
                    {currentSectionQuiz.questions.length} questions
                  </Text>
                </View>
              )}

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  onPress={handleSkipQuiz}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Skip for Now</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <PrimaryButton
                    onPress={handleTakeQuiz}
                    title="Take Quiz"
                    variant="gradient"
                    size="medium"
                  />
                </View>
              </View>
            </View>
          </View>
        </ErrorBoundary>
      </Modal>

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNoteModal(false)}
      >
        <ErrorBoundary boundaryName="CourseViewer.NoteModal">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingNote ? "Edit Note" : "Add Note"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowNoteModal(false);
                    setNoteContent("");
                    setEditingNote(null);
                  }}
                >
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={noteContent}
                onChangeText={setNoteContent}
                placeholder="Write your note here..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                style={styles.textInput}
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setShowNoteModal(false);
                    setNoteContent("");
                    setEditingNote(null);
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <PrimaryButton
                    onPress={handleSaveNote}
                    title={editingNote ? "Update" : "Save"}
                    variant="gradient"
                    size="medium"
                  />
                </View>
              </View>
            </View>
          </View>
        </ErrorBoundary>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f1f5",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 24,
    color: "#6b7280",
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#19c3e6",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  contentContainer: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  closeButton: {
    fontSize: 28,
    color: "#6b7280",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
    backgroundColor: "#ffffff",
    marginBottom: 16,
    textAlignVertical: "top",
    minHeight: 120,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
  cancelButtonText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#111827",
    fontSize: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: "#4b5563",
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: "500",
  },
  quizInfoContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quizInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  quizInfoSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  lessonContentWrapper: {
    flex: 1,
    backgroundColor: "#f0f1f5",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  lessonSection: {
    marginBottom: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  lessonText: {
    fontSize: 16,
    color: "#4b5563",
    lineHeight: 24,
    fontWeight: "500",
  },
  resourcesSection: {
    marginBottom: 24,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resourceTitle: {
    fontSize: 16,
    color: "#19c3e6",
    fontWeight: "600",
    flex: 1,
  },
  resourceType: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  notesSection: {
    marginBottom: 24,
  },
  emptyNotesContainer: {
    backgroundColor: "rgba(25, 195, 230, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(25, 195, 230, 0.2)",
  },
  emptyNotesText: {
    fontSize: 14,
    color: "#4b5563",
    fontStyle: "italic",
    textAlign: "center",
  },
  noteCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#19c3e6",
  },
  noteActions: {
    flexDirection: "row",
    gap: 8,
  },
  editNoteButton: {
    fontSize: 12,
    fontWeight: "600",
    color: "#19c3e6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(25, 195, 230, 0.1)",
    borderRadius: 4,
  },
  deleteNoteButton: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderRadius: 4,
  },
  noteContent: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 20,
  },
});
