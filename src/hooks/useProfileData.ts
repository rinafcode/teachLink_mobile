import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRequireReauth } from './';
import { cacheFormValues } from '../../services/formCache';
import { configureNext } from '../../utils/layoutAnimation';
// Assuming types are defined here or imported from a central types file
import { ProfileData, ProfileTab } from '../../types/profile';

export const useProfileData = (initialData: ProfileData) => {
  const [profile, setProfile] = useState<ProfileData>(initialData);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  
  const { performReauthCheck } = useRequireReauth();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm({
    defaultValues: { name: '', email: '', bio: '', location: '', website: '' },
  });

  const handleStartEdit = useCallback(() => {
    reset({
      name: profile.name,
      email: profile.email,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
    });
    setShowAdvancedFields(false);
    setIsEditing(true);
  }, [profile, reset]);

  const handleSave = useCallback(
    () => handleSubmit(async (data) => {
      // ... same logic as original ...
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setProfile(prev => ({
        ...prev,
        name: data.name.trim(),
        bio: data.bio.trim(),
        email: data.email.trim(),
        location: data.location.trim(),
        website: data.website.trim(),
      }));
      await cacheFormValues({
        fullName: data.name.trim(),
        email: data.email.trim(),
        bio: data.bio.trim(),
        location: data.location.trim(),
        website: data.website.trim(),
      });
      setIsSaving(false);
      setIsEditing(false);
    })(),
    [handleSubmit, profile.email, performReauthCheck]
  );

  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleAvatarConfirm = useCallback((uri: string) => setProfile(prev => ({ ...prev, avatar: uri })), []);
  const handleToggleFollow = useCallback((connectionId: string) => {
    setProfile(prev => ({
      ...prev,
      connections: prev.connections.map(c =>
        c.id === connectionId ? { ...c, isFollowing: !c.isFollowing } : c
      ),
    }));
  }, []);
  const handleOpenCamera = useCallback(() => setIsCameraVisible(true), []);
  const handleCloseCamera = useCallback(() => setIsCameraVisible(false), []);
  const handleSelectTab = useCallback((tab: ProfileTab) => setActiveTab(tab), []);
  const handleToggleAdvancedFields = useCallback(() => {
    configureNext();
    setShowAdvancedFields(prev => !prev);
  }, []);

  return {
    profile,
    activeTab,
    isEditing,
    isCameraVisible,
    isSaving,
    showAdvancedFields,
    control,
    formErrors,
    handleStartEdit,
    handleSave,
    handleCancelEdit,
    handleAvatarConfirm,
    handleToggleFollow,
    handleOpenCamera,
    handleCloseCamera,
    handleSelectTab,
    handleToggleAdvancedFields,
  };
};
