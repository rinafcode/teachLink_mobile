import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Controller } from 'react-hook-form';
import { ChevronDown, ChevronUp, User, Mail, MapPin, Globe } from 'lucide-react-native';
import { MobileFormInput } from '../MobileFormInput';

interface Props {
  control: any;
  formErrors: any;
  showAdvancedFields: boolean;
  onToggleAdvancedFields: () => void;
  isDark?: boolean;
}

export const ProfileSettings = React.memo(({ control, formErrors, showAdvancedFields, onToggleAdvancedFields, isDark }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      <Controller
        control={control}
        name="name"
        rules={{ required: 'Name is required' }}
        render={({ field: { onChange, value } }) => (
          <MobileFormInput
            label="Full Name"
            value={value}
            onChangeText={onChange}
            placeholder="Your full name"
            required
            error={formErrors.name?.message}
            isDark={isDark}
            cacheKey="fullName"
            leftIcon={<User size={18} color="#94a3b8" />}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <MobileFormInput
            label="Email"
            value={value}
            onChangeText={onChange}
            placeholder="your@email.com"
            keyboardType="email-address"
            required
            error={formErrors.email?.message}
            isDark={isDark}
            cacheKey="email"
            leftIcon={<Mail size={18} color="#94a3b8" />}
          />
        )}
      />
      
      <TouchableOpacity style={styles.disclosureToggle} onPress={onToggleAdvancedFields}>
        <Text style={styles.disclosureToggleText}>
          {showAdvancedFields ? 'Hide Advanced Details' : 'Advanced Details'}
        </Text>
        {showAdvancedFields ? <ChevronUp size={16} color="#19c3e6" /> : <ChevronDown size={16} color="#19c3e6" />}
      </TouchableOpacity>

      {showAdvancedFields && (
        <View style={styles.disclosureContent}>
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <MobileFormInput
                label="Location"
                value={value}
                onChangeText={onChange}
                placeholder="City, Country"
                isDark={isDark}
                cacheKey="location"
                leftIcon={<MapPin size={18} color="#94a3b8" />}
              />
            )}
          />
        </View>
      )}
    </View>
  );
});

ProfileSettings.displayName = 'ProfileSettings';
