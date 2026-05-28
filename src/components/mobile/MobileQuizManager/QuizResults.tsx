import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Quiz } from '../../../types/course';
import PrimaryButton from '../../common/PrimaryButton';

interface QuizResultsProps {
  /** The quiz data that was completed */
  quiz: Quiz;
  /** The final score percentage (0-100) */
  score: number;
  /** Whether the quiz was passed */
  passed: boolean;
  /** Callback to navigate back to the course */
  onBack: () => void;
  /** Optional callback to retake the quiz */
  onRetake?: () => void;
}

export default function QuizResults({ quiz, score, passed, onBack, onRetake }: QuizResultsProps) {
  const passingScore = quiz.passingScore || 70;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Result Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{passed ? '🎉' : '📝'}</Text>
      </View>

      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Your Score</Text>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{score}%</Text>
        </View>
      </View>

      {/* Pass/Fail Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageTitle}>{passed ? 'Congratulations!' : 'Keep Learning!'}</Text>
        <Text style={styles.messageText}>
          {passed
            ? `You passed with ${score}%! You've mastered this section.`
            : `You scored ${score}%. The passing score is ${passingScore}%. Review the material and try again!`}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Course</Text>
        </TouchableOpacity>
        {!passed && onRetake && (
          <View style={styles.retakeButtonContainer}>
            <PrimaryButton
              onPress={onRetake}
              title="Retake Quiz"
              variant="gradient"
              size="medium"
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f1f5',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 50,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#19c3e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#19c3e6',
  },
  messageContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  backButton: {
    padding: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  retakeButtonContainer: {
    width: '100%',
  },
});
