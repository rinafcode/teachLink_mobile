import React, { useCallback, useRef, useEffect } from 'react';
import { Animated, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useProfileData } from '../../hooks/useProfileData';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileStats } from './profile/ProfileStats';
import { ProfileCourseList } from './profile/ProfileCourseList';
import { ProfileSettings } from './profile/ProfileSettings';

// Re-using original types
import { ProfileData } from '../../types/profile';

const MOCK_PROFILE: ProfileData = { /* ... from original ... */ } as any;

export const MobileProfile: React.FC<{userId: string; isDark?: boolean; isLoading?: boolean;}> = ({ userId, isDark = false, isLoading = false }) => {
    const { 
        profile, 
        activeTab, 
        isEditing, 
        control,
        formErrors,
        showAdvancedFields,
        handleOpenCamera,
        handleSelectTab,
        handleToggleAdvancedFields
    } = useProfileData(MOCK_PROFILE);

    const getInitials = useCallback((name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2), []);

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView>
                <ProfileHeader profile={profile} onOpenCamera={handleOpenCamera} getInitials={getInitials} />
                <ProfileStats stats={profile.stats} unlockedCount={profile.achievements.length} isDark={isDark} />
                
                {activeTab === 'overview' && isEditing ? (
                    <ProfileSettings 
                        control={control} 
                        formErrors={formErrors} 
                        showAdvancedFields={showAdvancedFields} 
                        onToggleAdvancedFields={handleToggleAdvancedFields} 
                        isDark={isDark} 
                    />
                ) : (
                    <ProfileCourseList />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({ safe: { flex: 1 } });
