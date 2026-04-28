import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface QuizProgressProps {
  /** Current question number (1-indexed) */
  currentQuestion: number;
  /** Total number of questions in the quiz */
  totalQuestions: number;
}

export default function QuizProgress({
  currentQuestion,
  totalQuestions,
}: QuizProgressProps) {
  const progress = (currentQuestion / totalQuestions) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>
      <Text style={styles.progressText}>
        {currentQuestion} / {totalQuestions}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressBarContainer: {
    marginBottom: 8,
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
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
});
