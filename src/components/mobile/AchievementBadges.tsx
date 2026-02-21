import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Lock, X } from 'lucide-react-native';

type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  emoji?: string;
  rarity?: BadgeRarity;
  unlockedAt?: string;
  isLocked?: boolean;
  progress?: { current: number; total: number };
}

interface AchievementBadgesProps {
  achievements: Achievement[];
  isDark?: boolean;
}

const RARITY_COLORS: Record<BadgeRarity, [string, string]> = {
  common: ['#64748b', '#94a3b8'],
  rare: ['#2563eb', '#3b82f6'],
  epic: ['#7c3aed', '#a855f7'],
  legendary: ['#d97706', '#fbbf24'],
};

const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({
  achievements,
  isDark = false,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null);

  const unlockedCount = achievements.filter((a) => !a.isLocked).length;
  const totalCount = achievements.length;

  const renderBadge = (achievement: Achievement) => {
    const rarity = achievement.rarity ?? 'common';
    const gradColors = RARITY_COLORS[rarity];
    const isLocked = achievement.isLocked;

    return (
      <TouchableOpacity
        key={achievement.id}
        onPress={() => setSelectedBadge(achievement)}
        style={styles.badgeWrapper}
        activeOpacity={0.8}
      >
        <View style={[styles.badgeOuter, isLocked && styles.badgeOuterLocked]}>
          {isLocked ? (
            <View style={[styles.badgeInner, styles.lockedInner]}>
              <Lock size={22} color="#94a3b8" />
            </View>
          ) : (
            <LinearGradient
              colors={gradColors}
              style={styles.badgeInner}
            >
              {achievement.iconUrl ? (
                <Image
                  source={{ uri: achievement.iconUrl }}
                  style={styles.badgeImage}
                />
              ) : (
                <Text style={styles.badgeEmoji}>
                  {achievement.emoji ?? '🏆'}
                </Text>
              )}
            </LinearGradient>
          )}
          {!isLocked && rarity !== 'common' && (
            <View
              style={[styles.rarityDot, { backgroundColor: gradColors[0] }]}
            />
          )}
        </View>

        <Text
          style={[
            styles.badgeName,
            {
              color: isLocked
                ? '#94a3b8'
                : isDark
                ? '#e2e8f0'
                : '#334155',
            },
          ]}
          numberOfLines={2}
        >
          {achievement.name}
        </Text>

        {achievement.progress && !achievement.unlockedAt && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (achievement.progress.current /
                      achievement.progress.total) *
                    100
                  }%`,
                  backgroundColor: gradColors[0],
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#fff' }]}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Award size={20} color="#19c3e6" />
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? '#f1f5f9' : '#1e293b' },
            ]}
          >
            Achievements
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {unlockedCount}/{totalCount}
          </Text>
        </View>
      </View>

      {achievements.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {achievements.map(renderBadge)}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Award size={40} color="#e2e8f0" />
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? '#475569' : '#94a3b8' },
            ]}
          >
            Complete courses to earn badges
          </Text>
        </View>
      )}

      {/* Badge detail modal */}
      <Modal visible={!!selectedBadge} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedBadge(null)}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: isDark ? '#1e293b' : '#fff' },
            ]}
          >
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedBadge(null)}
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>

            {selectedBadge && (() => {
              const rarity = selectedBadge.rarity ?? 'common';
              const gradColors = RARITY_COLORS[rarity];
              return (
                <>
                  <View style={styles.modalBadgeContainer}>
                    {selectedBadge.isLocked ? (
                      <View
                        style={[
                          styles.modalBadgeInner,
                          styles.lockedInner,
                        ]}
                      >
                        <Lock size={32} color="#94a3b8" />
                      </View>
                    ) : (
                      <LinearGradient
                        colors={gradColors}
                        style={styles.modalBadgeInner}
                      >
                        <Text style={styles.modalEmoji}>
                          {selectedBadge.emoji ?? '🏆'}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.modalName,
                      { color: isDark ? '#f1f5f9' : '#1e293b' },
                    ]}
                  >
                    {selectedBadge.name}
                  </Text>

                  <View style={styles.rarityTag}>
                    <Text
                      style={[
                        styles.rarityText,
                        { color: gradColors[0] },
                      ]}
                    >
                      {RARITY_LABELS[rarity]}
                    </Text>
                  </View>

                  {selectedBadge.description && (
                    <Text
                      style={[
                        styles.modalDescription,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      {selectedBadge.description}
                    </Text>
                  )}

                  {selectedBadge.unlockedAt && (
                    <Text
                      style={[
                        styles.unlockedDate,
                        { color: isDark ? '#475569' : '#94a3b8' },
                      ]}
                    >
                      Unlocked {selectedBadge.unlockedAt}
                    </Text>
                  )}

                  {selectedBadge.progress && !selectedBadge.unlockedAt && (
                    <View style={styles.modalProgress}>
                      <Text
                        style={[
                          styles.progressLabel,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        Progress: {selectedBadge.progress.current}/
                        {selectedBadge.progress.total}
                      </Text>
                      <View style={styles.modalProgressBar}>
                        <View
                          style={[
                            styles.modalProgressFill,
                            {
                              width: `${
                                (selectedBadge.progress.current /
                                  selectedBadge.progress.total) *
                                100
                              }%`,
                              backgroundColor: gradColors[0],
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#e0f7fa',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0097a7',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  badgeWrapper: {
    alignItems: 'center',
    width: 72,
  },
  badgeOuter: {
    position: 'relative',
    marginBottom: 6,
  },
  badgeOuterLocked: {
    opacity: 0.5,
  },
  badgeInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedInner: {
    backgroundColor: '#e2e8f0',
  },
  badgeImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  rarityDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  progressBar: {
    width: 48,
    height: 3,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBadgeContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  modalBadgeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 36,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  rarityTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  unlockedDate: {
    fontSize: 12,
    marginTop: 4,
  },
  modalProgress: {
    width: '100%',
    marginTop: 8,
    gap: 6,
  },
  progressLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalProgressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
