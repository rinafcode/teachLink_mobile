import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Quiz, Course } from '../../../types/course';
import { QuizNavigationProp } from '../../../navigation/types';
import { useQuizStore } from '../../../store/quizStore';
import PrimaryButton from '../../common/PrimaryButton';
import QuizCarousel from './QuizCarousel';
import QuizProgress from './QuizProgress';
import QuizResults from './QuizResults';
import logger from '../../../utils/logger';

interface MobileQuizManagerProps {
  quiz: Quiz;
  courseId: string;
  onBack?: () => void;
  /** Optional React Navigation prop used to navigate back to CourseViewer after a passed quiz. */
  navigation?: QuizNavigationProp;
  /** Course data forwarded to the CourseViewer when navigating after quiz completion. */
  course?: Course;
}

type QuizView = 'intro' | 'questions' | 'results';

export default function MobileQuizManager({
  quiz,
  courseId,
  onBack,
  navigation,
  course,
}: MobileQuizManagerProps) {
  const { 
    startQuiz, 
    loadQuizProgress, 
    session, 
    selectAnswer, 
    goToQuestion,
    completeQuiz,
    resetSession,
  } = useQuizStore();

  const [currentView, setCurrentView] = useState<QuizView>('intro');
  const [quizResults, setQuizResults] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    loadQuizProgress(courseId);
    // Always start with intro screen
    setCurrentView('intro');
  }, [courseId, loadQuizProgress]);

  const handleStartQuiz = async () => {
    try {
      await startQuiz(quiz.id, quiz.sectionId, courseId);
      setCurrentView('questions');
    } catch (error) {
      logger.error('Error starting quiz:', error);
    }
  };

  const handleQuestionChange = useCallback((index: number) => {
    // Use requestAnimationFrame to ensure smooth updates
    requestAnimationFrame(() => {
      goToQuestion(index);
    });
  }, [goToQuestion]);

  const handleAnswerSelect = useCallback((questionId: string, answer: string | number, isMultiSelect?: boolean) => {
    selectAnswer(questionId, answer, isMultiSelect);
  }, [selectAnswer]);

  const handleSubmitQuiz = useCallback(async () => {
    try {
      const results = await completeQuiz(quiz);
      setQuizResults(results);
      setCurrentView('results');
      
      // If passed, navigate back to course with syllabus view
      if (results.passed && navigation && course) {
        // Small delay to show results briefly before navigating
        setTimeout(() => {
          navigation.navigate('CourseViewer', {
            course: course,
            initialViewMode: 'syllabus',
          });
        }, 2000);
      } else if (results.passed && onBack) {
        // Fallback to simple back navigation
        setTimeout(() => {
          onBack();
        }, 2000);
      }
    } catch (error) {
      logger.error('Error completing quiz:', error);
    }
  }, [quiz, completeQuiz, navigation, course, onBack]);

  const handleRetakeQuiz = useCallback(async () => {
    await resetSession();
    await startQuiz(quiz.id, quiz.sectionId, courseId);
    setQuizResults(null);
    setCurrentView('questions');
  }, [quiz, courseId, startQuiz, resetSession]);

  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
  const estimatedTime = Math.ceil(quiz.questions.length * 1.5);
  const currentQuestionIndex = session.currentQuestionIndex || 0;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  // Render intro screen
  if (currentView === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📝</Text>
          </View>
          <Text style={styles.title}>{quiz.title}</Text>
          <Text style={styles.subtitle}>
            Test your knowledge and see how well you've mastered this section
          </Text>
        </View>

        {/* Quiz Info Cards */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>❓</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Questions</Text>
              <Text style={styles.infoValue}>{quiz.questions.length}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>⏱️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Est. Time</Text>
              <Text style={styles.infoValue}>{estimatedTime} min</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🎯</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Passing Score</Text>
              <Text style={styles.infoValue}>
                {quiz.passingScore || 70}%
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>⭐</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Total Points</Text>
              <Text style={styles.infoValue}>{totalPoints}</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>•</Text>
              <Text style={styles.instructionText}>
                Read each question carefully before answering
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>•</Text>
              <Text style={styles.instructionText}>
                Some questions may have multiple correct answers
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>•</Text>
              <Text style={styles.instructionText}>
                You can review your answers before submitting
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>•</Text>
              <Text style={styles.instructionText}>
                Your progress is saved automatically
              </Text>
            </View>
          </View>
        </View>

        {/* Start Button */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            onPress={handleStartQuiz}
            title="Start Quiz"
            variant="gradient"
            size="large"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
    );
  }

  // Render questions screen
  if (currentView === 'questions') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.questionsHeader}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{quiz.title}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <QuizProgress
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={quiz.questions.length}
        />

        {/* Question Carousel */}
        <View style={styles.carouselContainer}>
          <QuizCarousel
            questions={quiz.questions}
            currentQuestionIndex={currentQuestionIndex}
            selectedAnswers={session.selectedAnswers}
            onQuestionChange={handleQuestionChange}
            onAnswerSelect={handleAnswerSelect}
          />
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            onPress={() => {
              const prevIndex = Math.max(0, currentQuestionIndex - 1);
              handleQuestionChange(prevIndex);
            }}
            disabled={currentQuestionIndex === 0}
            style={[
              styles.navButton,
              styles.previousButton,
              currentQuestionIndex === 0 && styles.navButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navButtonText,
                currentQuestionIndex === 0 && styles.navButtonTextDisabled,
              ]}
            >
              ← Previous
            </Text>
          </TouchableOpacity>

          {isLastQuestion ? (
            <TouchableOpacity
              onPress={handleSubmitQuiz}
              style={styles.navButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#20afe7', '#2c8aec', '#586ce9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>Submit Quiz</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                const nextIndex = currentQuestionIndex + 1;
                handleQuestionChange(nextIndex);
              }}
              style={styles.navButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#20afe7', '#2c8aec', '#586ce9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Next →</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Render results screen
  if (currentView === 'results' && quizResults) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultsHeader}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
        </View>
        <QuizResults
          quiz={quiz}
          score={quizResults.score}
          passed={quizResults.passed}
          onBack={onBack || (() => {})}
          onRetake={handleRetakeQuiz}
        />
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f1f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  instructionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionBullet: {
    fontSize: 18,
    color: '#19c3e6',
    marginRight: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 16,
  },
  questionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  carouselContainer: {
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previousButton: {
    backgroundColor: '#e5e7eb',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  nextButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
