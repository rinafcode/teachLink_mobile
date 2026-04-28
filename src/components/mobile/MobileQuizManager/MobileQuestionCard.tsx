import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Question } from '../../../types/course';
import { useHapticFeedback } from '../../../hooks';

interface MobileQuestionCardProps {
  /** The question data to display */
  question: Question;
  /** The current question number (1-indexed) */
  questionNumber: number;
  /** Total number of questions in the quiz */
  totalQuestions: number;
  /** Currently selected answer(s) for this question */
  selectedAnswer?: string | number | (string | number)[];
  /** Callback when an answer is selected */
  onAnswerSelect: (questionId: string, answer: string | number, isMultiSelect?: boolean) => void;
}

export default function MobileQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
}: MobileQuestionCardProps) {
  const [shortAnswerText, setShortAnswerText] = useState<string>(
    typeof selectedAnswer === 'string' ? selectedAnswer : ''
  );

  // Sync with prop changes
  useEffect(() => {
    if (typeof selectedAnswer === 'string') {
      setShortAnswerText(selectedAnswer);
    } else if (selectedAnswer === undefined) {
      setShortAnswerText('');
    }
  }, [selectedAnswer]);

  const handleOptionSelect = (optionIndex: number) => {
    useHapticFeedback('light');
    onAnswerSelect(question.id, optionIndex, question.multiple);
  };

  const handleTrueFalse = (value: number) => {
    useHapticFeedback('light');
    onAnswerSelect(question.id, value, false);
  };

  const handleShortAnswerChange = (text: string) => {
    setShortAnswerText(text);
    onAnswerSelect(question.id, text, false);
  };

  const isOptionSelected = (optionIndex: number): boolean => {
    if (question.multiple) {
      const selectedArray = Array.isArray(selectedAnswer) ? selectedAnswer : [];
      return selectedArray.includes(optionIndex);
    }
    return selectedAnswer === optionIndex;
  };

  const isTrueFalseSelected = (value: number): boolean => {
    return selectedAnswer === value;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Question Header */}
      <View style={styles.header}>
        <View style={styles.questionNumberBadge}>
          <Text style={styles.questionNumberText}>
            Question {questionNumber} of {totalQuestions}
          </Text>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{question.points} pts</Text>
        </View>
      </View>

      {/* Question Text */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
        {question.multiple && (
          <Text style={styles.multiSelectHint}>(Select all that apply)</Text>
        )}
      </View>

      {/* Answer Options */}
      <View style={styles.optionsContainer}>
        {question.type === 'multiple-choice' && question.options && (
          <>
            {question.options.map((option, index) => {
              const isSelected = isOptionSelected(index);
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleOptionSelect(index)}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                >
                  <View style={styles.optionContent}>
                    {/* Radio or Checkbox Indicator */}
                    <View
                      style={[
                        styles.indicator,
                        question.multiple ? styles.checkbox : styles.radio,
                        isSelected && styles.indicatorSelected,
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.indicatorInner,
                            question.multiple && styles.checkboxInner,
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {question.type === 'true-false' && (
          <View style={styles.trueFalseContainer}>
            <TouchableOpacity
              onPress={() => handleTrueFalse(0)}
              style={[
                styles.trueFalseButton,
                styles.trueButton,
                isTrueFalseSelected(0) && styles.trueFalseButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.trueFalseText,
                  isTrueFalseSelected(0) && styles.trueFalseTextSelected,
                ]}
              >
                True
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTrueFalse(1)}
              style={[
                styles.trueFalseButton,
                styles.falseButton,
                isTrueFalseSelected(1) && styles.trueFalseButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.trueFalseText,
                  isTrueFalseSelected(1) && styles.trueFalseTextSelected,
                ]}
              >
                False
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {question.type === 'short-answer' && (
          <View style={styles.shortAnswerContainer}>
            <TextInput
              style={styles.shortAnswerInput}
              value={shortAnswerText}
              onChangeText={handleShortAnswerChange}
              placeholder="Type your answer here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  questionNumberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#19c3e6',
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 8,
  },
  multiSelectHint: {
    fontSize: 14,
    fontWeight: '500',
    color: '#19c3e6',
    fontStyle: 'italic',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  optionButtonSelected: {
    borderColor: '#19c3e6',
    backgroundColor: 'rgba(25, 195, 230, 0.05)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    borderRadius: 12,
  },
  checkbox: {
    borderRadius: 6,
  },
  indicatorSelected: {
    borderColor: '#19c3e6',
    backgroundColor: '#19c3e6',
  },
  indicatorInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  checkboxInner: {
    borderRadius: 2,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  trueFalseContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  trueFalseButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trueButton: {
    borderColor: '#e5e7eb',
  },
  falseButton: {
    borderColor: '#e5e7eb',
  },
  trueFalseButtonSelected: {
    borderColor: '#19c3e6',
    backgroundColor: 'rgba(25, 195, 230, 0.05)',
  },
  trueFalseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
  },
  trueFalseTextSelected: {
    color: '#19c3e6',
    fontWeight: '700',
  },
  shortAnswerContainer: {
    marginTop: 8,
  },
  shortAnswerInput: {
    minHeight: 120,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
  },
});
