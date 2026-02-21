import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  Edit3,
  Save,
  X,
  User,
  Mail,
  MapPin,
  BookOpen,
  Users,
  Trophy,
  Clock,
  Globe,
  UserPlus,
  UserCheck,
} from 'lucide-react-native';
import { AvatarCamera } from './AvatarCamera';
import { MobileFormInput } from './MobileFormInput';
import { AchievementBadges, Achievement } from './AchievementBadges';
import { StatisticsDisplay } from './StatisticsDisplay';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Connection {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  mutualConnections?: number;
  isFollowing: boolean;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  role: 'student' | 'teacher';
  avatar: string | null;
  joinedAt: string;
  stats: {
    coursesCompleted: number;
    coursesEnrolled: number;
    totalHours: number;
    streak: number;
    connections: number;
    achievements: number;
  };
  achievements: Achievement[];
  connections: Connection[];
}

type ProfileTab = 'overview' | 'stats' | 'achievements' | 'connections';

// ─── Mock data (replace with API call in production) ─────────────────────────

const MOCK_PROFILE: ProfileData = {
  id: '1',
  name: 'Alex Johnson',
  email: 'alex.johnson@email.com',
  bio: 'Passionate learner exploring technology. Love building things and sharing knowledge with the community.',
  location: 'San Francisco, CA',
  website: 'alexjohnson.dev',
  role: 'student',
  avatar: null,
  joinedAt: 'January 2024',
  stats: {
    coursesCompleted: 12,
    coursesEnrolled: 3,
    totalHours: 148,
    streak: 7,
    connections: 54,
    achievements: 8,
  },
  achievements: [
    {
      id: '1',
      name: 'First Steps',
      emoji: '👣',
      rarity: 'common',
      description: 'Completed your very first lesson.',
      unlockedAt: 'Jan 2024',
    },
    {
      id: '2',
      name: 'Week Warrior',
      emoji: '🔥',
      rarity: 'rare',
      description: 'Maintained a 7-day learning streak.',
      unlockedAt: 'Feb 2024',
    },
    {
      id: '3',
      name: 'Course Champion',
      emoji: '🏆',
      rarity: 'epic',
      description: 'Successfully completed 10 courses.',
      unlockedAt: 'Mar 2024',
    },
    {
      id: '4',
      name: 'Social Star',
      emoji: '⭐',
      rarity: 'rare',
      description: 'Built a network of 50 connections.',
      unlockedAt: 'Mar 2024',
    },
    {
      id: '5',
      name: 'Deep Diver',
      emoji: '🤿',
      rarity: 'common',
      description: 'Accumulated 100+ hours of learning.',
      unlockedAt: 'Apr 2024',
    },
    {
      id: '6',
      name: 'Legend',
      emoji: '👑',
      rarity: 'legendary',
      description: 'Reach the top 1% of all learners.',
      isLocked: true,
      progress: { current: 3, total: 10 },
    },
    {
      id: '7',
      name: 'Mentor',
      emoji: '🎓',
      rarity: 'epic',
      description: 'Help 20 other learners succeed.',
      isLocked: true,
      progress: { current: 8, total: 20 },
    },
    {
      id: '8',
      name: 'Speed Run',
      emoji: '⚡',
      rarity: 'rare',
      description: 'Complete an entire course in one day.',
      isLocked: true,
    },
  ],
  connections: [
    {
      id: '1',
      name: 'Sarah Chen',
      role: 'teacher',
      mutualConnections: 12,
      isFollowing: true,
    },
    {
      id: '2',
      name: 'Marcus Williams',
      role: 'student',
      mutualConnections: 5,
      isFollowing: true,
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      role: 'teacher',
      mutualConnections: 8,
      isFollowing: false,
    },
    {
      id: '4',
      name: 'James Park',
      role: 'student',
      mutualConnections: 3,
      isFollowing: false,
    },
    {
      id: '5',
      name: 'Aria Patel',
      role: 'student',
      mutualConnections: 15,
      isFollowing: true,
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

interface MobileProfileProps {
  userId: string;
  isDark?: boolean;
}

export const MobileProfile: React.FC<MobileProfileProps> = ({
  userId: _userId,
  isDark = false,
}) => {
  const [profile, setProfile] = useState<ProfileData>(MOCK_PROFILE);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Theme tokens
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleStartEdit = () => {
    setEditName(profile.name);
    setEditBio(profile.bio);
    setEditEmail(profile.email);
    setEditLocation(profile.location);
    setEditWebsite(profile.website);
    setFormErrors({});
    setIsEditing(true);
  };

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!editName.trim()) errors.name = 'Name is required';
    if (!editEmail.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(editEmail))
      errors.email = 'Enter a valid email address';
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setIsSaving(true);
    // Simulate API call — replace with actual service call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setProfile((prev) => ({
      ...prev,
      name: editName.trim(),
      bio: editBio.trim(),
      email: editEmail.trim(),
      location: editLocation.trim(),
      website: editWebsite.trim(),
    }));
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormErrors({});
  };

  const handleAvatarConfirm = (uri: string) => {
    setProfile((prev) => ({ ...prev, avatar: uri }));
  };

  const handleToggleFollow = (connectionId: string) => {
    setProfile((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === connectionId ? { ...c, isFollowing: !c.isFollowing } : c,
      ),
    }));
  };

  // Tab config
  const TABS: { key: ProfileTab; label: string }[] = [
    { key: 'overview', label: 'Profile' },
    { key: 'stats', label: 'Stats' },
    { key: 'achievements', label: 'Badges' },
    { key: 'connections', label: 'Network' },
  ];

  const statsForDisplay = [
    { label: 'Courses Done', value: profile.stats.coursesCompleted },
    { label: 'Enrolled', value: profile.stats.coursesEnrolled },
    { label: 'Hours', value: profile.stats.totalHours },
    { label: 'Day Streak', value: `${profile.stats.streak} 🔥` },
  ];

  // ─── Header strip items ───────────────────────────────────────────────────
  const stripItems = [
    {
      icon: <BookOpen size={16} color="#19c3e6" />,
      value: profile.stats.coursesCompleted,
      label: 'Done',
    },
    {
      icon: <Users size={16} color="#2c8aec" />,
      value: profile.stats.connections,
      label: 'Network',
    },
    {
      icon: <Trophy size={16} color="#586ce9" />,
      value: profile.stats.achievements,
      label: 'Badges',
    },
    {
      icon: <Clock size={16} color="#7c3aed" />,
      value: `${profile.stats.totalHours}h`,
      label: 'Learning',
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* ── Profile Header ─────────────────────────────────────────────── */}
        <View>
          <LinearGradient
            colors={['#20afe7', '#2c8aec', '#586ce9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          />

          {/* Avatar + edit button row */}
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => setIsCameraVisible(true)}
              activeOpacity={0.85}
            >
              {profile.avatar ? (
                <Image
                  source={{ uri: profile.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={['#20afe7', '#586ce9']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarInitials}>
                    {getInitials(profile.name)}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.cameraIconBadge}>
                <Camera size={13} color="#fff" />
              </View>
            </TouchableOpacity>

            {!isEditing ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleStartEdit}
              >
                <Edit3 size={15} color="#19c3e6" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancelEdit}
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={14} color="#fff" />
                      <Text style={styles.saveBtnText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Name, role, bio, meta */}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: textPrimary }]}>
                {profile.name}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor:
                      profile.role === 'teacher' ? '#fef3c7' : '#e0f2fe',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    {
                      color:
                        profile.role === 'teacher' ? '#d97706' : '#0369a1',
                    },
                  ]}
                >
                  {profile.role === 'teacher' ? '🎓 Teacher' : '📚 Student'}
                </Text>
              </View>
            </View>

            <Text style={[styles.profileBio, { color: textSecondary }]}>
              {profile.bio}
            </Text>

            <View style={styles.metaRow}>
              {!!profile.location && (
                <View style={styles.metaItem}>
                  <MapPin size={12} color={textSecondary} />
                  <Text style={[styles.metaText, { color: textSecondary }]}>
                    {profile.location}
                  </Text>
                </View>
              )}
              {!!profile.website && (
                <View style={styles.metaItem}>
                  <Globe size={12} color="#19c3e6" />
                  <Text style={[styles.metaText, { color: '#19c3e6' }]}>
                    {profile.website}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.joinedText, { color: textSecondary }]}>
              Joined {profile.joinedAt}
            </Text>
          </View>

          {/* Quick stats strip */}
          <View
            style={[
              styles.statsStrip,
              { backgroundColor: cardBg, borderColor },
            ]}
          >
            {stripItems.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.statCell,
                  i < stripItems.length - 1 && {
                    borderRightWidth: 1,
                    borderRightColor: borderColor,
                  },
                ]}
              >
                {s.icon}
                <Text style={[styles.statCellValue, { color: textPrimary }]}>
                  {s.value}
                </Text>
                <Text
                  style={[styles.statCellLabel, { color: textSecondary }]}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Tab Navigation ─────────────────────────────────────────────── */}
        <View
          style={[
            styles.tabNav,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color:
                      activeTab === tab.key ? '#19c3e6' : textSecondary,
                    fontWeight: activeTab === tab.key ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.key && (
                <View style={styles.tabIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ────────────────────────────────────────────────── */}
        <View style={styles.tabContent}>
          {/* Overview / Profile */}
          {activeTab === 'overview' && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {isEditing ? (
                <>
                  <Text
                    style={[styles.cardTitle, { color: textPrimary }]}
                  >
                    Edit Profile
                  </Text>
                  <MobileFormInput
                    label="Full Name"
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your full name"
                    required
                    error={formErrors.name}
                    isDark={isDark}
                    leftIcon={<User size={18} color="#94a3b8" />}
                  />
                  <MobileFormInput
                    label="Email"
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    required
                    error={formErrors.email}
                    isDark={isDark}
                    leftIcon={<Mail size={18} color="#94a3b8" />}
                  />
                  <MobileFormInput
                    label="Bio"
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="Tell us about yourself..."
                    multiline
                    isDark={isDark}
                  />
                  <MobileFormInput
                    label="Location"
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="City, Country"
                    isDark={isDark}
                    leftIcon={<MapPin size={18} color="#94a3b8" />}
                  />
                  <MobileFormInput
                    label="Website"
                    value={editWebsite}
                    onChangeText={setEditWebsite}
                    placeholder="yourwebsite.com"
                    keyboardType="url"
                    autoCapitalize="none"
                    isDark={isDark}
                    leftIcon={<Globe size={18} color="#94a3b8" />}
                  />
                </>
              ) : (
                <>
                  <Text
                    style={[styles.cardTitle, { color: textPrimary }]}
                  >
                    About
                  </Text>
                  {[
                    {
                      icon: <User size={17} color="#19c3e6" />,
                      label: 'Name',
                      value: profile.name,
                    },
                    {
                      icon: <Mail size={17} color="#2c8aec" />,
                      label: 'Email',
                      value: profile.email,
                    },
                    {
                      icon: <MapPin size={17} color="#7c3aed" />,
                      label: 'Location',
                      value: profile.location || 'Not set',
                    },
                    {
                      icon: <Globe size={17} color="#586ce9" />,
                      label: 'Website',
                      value: profile.website || 'Not set',
                    },
                  ].map((item, i) => (
                    <View
                      key={i}
                      style={[
                        styles.detailRow,
                        { borderBottomColor: borderColor },
                      ]}
                    >
                      <View style={styles.detailIconLabel}>
                        {item.icon}
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: textSecondary },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.detailValue,
                          { color: textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Stats */}
          {activeTab === 'stats' && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <View style={styles.streakBanner}>
                <LinearGradient
                  colors={['#ff6b35', '#ff8c42']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.streakGradient}
                >
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <View>
                    <Text style={styles.streakValue}>
                      {profile.stats.streak} Day Streak
                    </Text>
                    <Text style={styles.streakSub}>
                      Keep it up! You're on fire.
                    </Text>
                  </View>
                </LinearGradient>
              </View>
              <StatisticsDisplay statistics={statsForDisplay} />
            </View>
          )}

          {/* Achievements */}
          {activeTab === 'achievements' && (
            <View
              style={[
                styles.card,
                { backgroundColor: cardBg, paddingHorizontal: 0 },
              ]}
            >
              <AchievementBadges
                achievements={profile.achievements}
                isDark={isDark}
              />
            </View>
          )}

          {/* Connections */}
          {activeTab === 'connections' && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>
                Your Network ({profile.stats.connections})
              </Text>
              {profile.connections.map((connection, i) => (
                <View
                  key={connection.id}
                  style={[
                    styles.connectionRow,
                    {
                      borderBottomColor: borderColor,
                      borderBottomWidth:
                        i < profile.connections.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={
                      connection.role === 'teacher'
                        ? ['#d97706', '#f59e0b']
                        : ['#2c8aec', '#586ce9']
                    }
                    style={styles.connectionAvatar}
                  >
                    <Text style={styles.connectionInitial}>
                      {connection.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>

                  <View style={styles.connectionInfo}>
                    <Text
                      style={[
                        styles.connectionName,
                        { color: textPrimary },
                      ]}
                    >
                      {connection.name}
                    </Text>
                    <View style={styles.connectionMeta}>
                      <Text
                        style={[
                          styles.connectionRole,
                          {
                            color:
                              connection.role === 'teacher'
                                ? '#d97706'
                                : '#2c8aec',
                          },
                        ]}
                      >
                        {connection.role === 'teacher'
                          ? '🎓 Teacher'
                          : '📚 Student'}
                      </Text>
                      {!!connection.mutualConnections && (
                        <Text
                          style={[
                            styles.mutualText,
                            { color: textSecondary },
                          ]}
                        >
                          · {connection.mutualConnections} mutual
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.followBtn,
                      connection.isFollowing
                        ? {
                            backgroundColor: isDark ? '#334155' : '#f1f5f9',
                            borderColor,
                            borderWidth: 1,
                          }
                        : { backgroundColor: '#19c3e6' },
                    ]}
                    onPress={() => handleToggleFollow(connection.id)}
                  >
                    {connection.isFollowing ? (
                      <>
                        <UserCheck size={13} color={textSecondary} />
                        <Text
                          style={[
                            styles.followBtnText,
                            { color: textSecondary },
                          ]}
                        >
                          Following
                        </Text>
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} color="#fff" />
                        <Text
                          style={[styles.followBtnText, { color: '#fff' }]}
                        >
                          Follow
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Avatar Camera Modal */}
      <AvatarCamera
        visible={isCameraVisible}
        currentAvatar={profile.avatar}
        onConfirm={handleAvatarConfirm}
        onClose={() => setIsCameraVisible(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  banner: {
    height: 120,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -44,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#19c3e6',
    backgroundColor: '#fff',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#19c3e6',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#19c3e6',
    minWidth: 72,
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  joinedText: {
    fontSize: 12,
    marginTop: 2,
  },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  statCellValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  statCellLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 13,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    backgroundColor: '#19c3e6',
    borderRadius: 2,
  },
  tabContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  // Streak
  streakBanner: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  streakEmoji: {
    fontSize: 36,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  streakSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  // Connections
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  connectionAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  connectionInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  connectionInfo: {
    flex: 1,
    gap: 2,
  },
  connectionName: {
    fontSize: 15,
    fontWeight: '700',
  },
  connectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionRole: {
    fontSize: 12,
    fontWeight: '600',
  },
  mutualText: {
    fontSize: 12,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexShrink: 0,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
