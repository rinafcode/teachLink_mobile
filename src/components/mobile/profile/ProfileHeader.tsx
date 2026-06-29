import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, MapPin, Globe } from 'lucide-react-native';
import { CachedImage } from '../../ui/CachedImage';

interface Props {
  profile: any;
  onOpenCamera: () => void;
  getInitials: (name: string) => string;
}

export const ProfileHeader = React.memo(({ profile, onOpenCamera, getInitials }: Props) => {
  return (
    <View>
      <LinearGradient
        colors={['#20afe7', '#2c8aec', '#586ce9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      />
      <View style={styles.avatarRow}>
        <TouchableOpacity style={styles.avatarContainer} onPress={onOpenCamera}>
          {profile.avatar ? (
            <CachedImage uri={profile.avatar} style={styles.avatar} alt={`${profile.name}'s profile photo`} />
          ) : (
            <LinearGradient colors={['#20afe7', '#586ce9']} style={styles.avatarGradient}>
              <Text style={styles.avatarInitials}>{getInitials(profile.name)}</Text>
            </LinearGradient>
          )}
          <View style={styles.cameraIconBadge}>
            <Camera size={13} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileBio}>{profile.bio}</Text>
        <View style={styles.metaRow}>
          {!!profile.location && (
            <View style={styles.metaItem}>
              <MapPin size={12} color="#64748b" />
              <Text style={styles.metaText}>{profile.location}</Text>
            </View>
          )}
          {!!profile.website && (
            <View style={styles.metaItem}>
              <Globe size={12} color="#19c3e6" />
              <Text style={styles.metaText}>{profile.website}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

ProfileHeader.displayName = 'ProfileHeader';

const styles = StyleSheet.create({
    banner: { height: 120 },
    avatarRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -44, marginBottom: 12 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#fff' },
    avatarGradient: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    avatarInitials: { fontSize: 28, fontWeight: '800', color: '#fff' },
    cameraIconBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    profileInfo: { paddingHorizontal: 16, gap: 4, marginBottom: 16 },
    profileName: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
    profileBio: { fontSize: 14, lineHeight: 20, marginTop: 4, color: '#64748b' },
    metaRow: { flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 13, color: '#64748b' },
});
