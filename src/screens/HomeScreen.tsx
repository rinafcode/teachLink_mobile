import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { sampleCourse } from '../data/sampleCourse';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
    return (
        <ScrollView 
            className="flex-1 bg-gray-50 dark:bg-slate-800"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.headerSection}>
                <Text style={styles.headerIcon}>📚</Text>
                <Text style={styles.title}>Welcome to TeachLink</Text>
                <Text style={styles.subtitle}>Share and consume knowledge on the go</Text>
            </View>

            {/* Course Viewer Button - Primary */}
            <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                    navigation.navigate('CourseViewer', {
                        course: sampleCourse,
                    })
                }
            >
                <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>📚</Text>
                    <View style={styles.buttonTextContainer}>
                        <Text style={styles.buttonTitle}>Start Learning</Text>
                        <Text style={styles.buttonSubtitle}>Open course viewer</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Search Button */}
            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Search')}
            >
                <View style={styles.secondaryButtonContent}>
                    <Text style={styles.secondaryIcon}>🔍</Text>
                    <View style={styles.secondaryTextContainer}>
                        <Text style={styles.secondaryTitle}>Search</Text>
                        <Text style={styles.secondarySubtitle}>Find courses and lessons</Text>
                    </View>
                    <Text style={styles.arrow}>›</Text>
                </View>
            </TouchableOpacity>

            {/* Secondary Buttons */}
            <View style={styles.secondaryButtonsContainer}>
                {/* Profile Button */}
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('Profile', { userId: '123' })}
                >
                    <View style={styles.secondaryButtonContent}>
                        <Text style={styles.secondaryIcon}>👤</Text>
                        <View style={styles.secondaryTextContainer}>
                            <Text style={styles.secondaryTitle}>My Profile</Text>
                            <Text style={styles.secondarySubtitle}>View your progress</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </View>
                </TouchableOpacity>

                {/* Settings Button */}
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <View style={styles.secondaryButtonContent}>
                        <Text style={styles.secondaryIcon}>⚙️</Text>
                        <View style={styles.secondaryTextContainer}>
                            <Text style={styles.secondaryTitle}>Settings</Text>
                            <Text style={styles.secondarySubtitle}>Customize your experience</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </View>
                </TouchableOpacity>
            </View>

          
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    headerSection: {
        paddingHorizontal: 24,
        paddingVertical: 32,
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    primaryButton: {
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: '#19c3e6',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonIcon: {
        fontSize: 28,
        marginRight: 12,
    },
    buttonTextContainer: {
        flex: 1,
    },
    buttonTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 2,
    },
    buttonSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    secondaryButtonsContainer: {
        marginHorizontal: 16,
        marginBottom: 24,
        gap: 12,
    },
    secondaryButton: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    secondaryButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    secondaryIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    secondaryTextContainer: {
        flex: 1,
    },
    secondaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    secondarySubtitle: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    arrow: {
        fontSize: 24,
        color: '#d1d5db',
        marginLeft: 8,
    },
    infoCardsContainer: {
        marginHorizontal: 16,
        gap: 12,
        marginBottom: 20,
    },
    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    infoCardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        fontSize: 24,
        marginRight: 12,
        marginTop: 2,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    infoSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
});