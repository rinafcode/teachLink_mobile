import { useAchievementStore } from '../../store/achievementStore';
import apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('../../services/inAppReview', () => ({
  inAppReviewService: { requestReview: jest.fn().mockResolvedValue({ shown: false, reason: '' }) },
  ReviewTrigger: { ACHIEVEMENT_UNLOCKED: 'achievement_unlocked' },
}));

jest.mock('../../store/reviewStore', () => ({
  useReviewStore: {
    getState: () => ({
      incrementAchievementsUnlocked: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({}),
      recordReviewRequest: jest.fn(),
    }),
  },
}));

const mockPost = apiService.post as jest.MockedFunction<typeof apiService.post>;

describe('achievementStore — unlockAchievement', () => {
  beforeEach(() => {
    useAchievementStore.setState({
      achievements: useAchievementStore.getState().achievements.map(a => ({ ...a, isLocked: true })),
      unlockedCount: 0,
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('optimistically unlocks and confirms on server success', async () => {
    mockPost.mockResolvedValue({ data: { success: true } } as any);
    const id = 'first_lesson';

    await useAchievementStore.getState().unlockAchievement(id);

    const achievement = useAchievementStore.getState().achievements.find(a => a.id === id);
    expect(achievement?.isLocked).toBe(false);
    expect(useAchievementStore.getState().unlockedCount).toBe(1);
  });

  it('reverts optimistic update on network error', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));
    const id = 'first_lesson';
    const beforeCount = useAchievementStore.getState().unlockedCount;

    await useAchievementStore.getState().unlockAchievement(id);

    const achievement = useAchievementStore.getState().achievements.find(a => a.id === id);
    expect(achievement?.isLocked).toBe(true);
    expect(useAchievementStore.getState().unlockedCount).toBe(beforeCount);
  });

  it('reverts optimistic update on server 409 duplicate', async () => {
    const error = Object.assign(new Error('Conflict'), { response: { status: 409 } });
    mockPost.mockRejectedValue(error);
    const id = 'first_lesson';

    await useAchievementStore.getState().unlockAchievement(id);

    const achievement = useAchievementStore.getState().achievements.find(a => a.id === id);
    expect(achievement?.isLocked).toBe(true);
  });

  it('does nothing if achievement is already unlocked', async () => {
    mockPost.mockResolvedValue({ data: {} } as any);
    const id = 'first_lesson';
    useAchievementStore.setState({
      achievements: useAchievementStore
        .getState()
        .achievements.map(a => (a.id === id ? { ...a, isLocked: false } : a)),
    });

    await useAchievementStore.getState().unlockAchievement(id);

    expect(mockPost).not.toHaveBeenCalled();
  });
});
