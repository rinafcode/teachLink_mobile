import { warmCriticalCaches } from '../../services/cacheWarming';
import { courseApi } from '../../services/api/courseApi';
import { userApi } from '../../services/api/userApi';
import { useAppStore } from '../../store';

jest.mock('../../services/api/courseApi', () => ({
  courseApi: { getCourses: jest.fn() },
}));
jest.mock('../../services/api/userApi', () => ({
  userApi: { getUser: jest.fn() },
}));
jest.mock('../../store', () => ({
  useAppStore: { getState: jest.fn() },
}));

const getCourses = courseApi.getCourses as jest.Mock;
const getUser = userApi.getUser as jest.Mock;
const getState = useAppStore.getState as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getCourses.mockResolvedValue([]);
  getUser.mockResolvedValue({ id: 'u1' });
});

describe('warmCriticalCaches', () => {
  it('always fetches the course list', async () => {
    getState.mockReturnValue({ user: null });
    await warmCriticalCaches();
    expect(getCourses).toHaveBeenCalledTimes(1);
  });

  it('fetches user profile when userId is available', async () => {
    getState.mockReturnValue({ user: { id: 'u1' } });
    await warmCriticalCaches();
    expect(getUser).toHaveBeenCalledWith('u1');
  });

  it('skips user profile fetch when not authenticated', async () => {
    getState.mockReturnValue({ user: null });
    await warmCriticalCaches();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('resolves even if course fetch fails', async () => {
    getState.mockReturnValue({ user: null });
    getCourses.mockRejectedValue(new Error('network'));
    await expect(warmCriticalCaches()).resolves.toBeUndefined();
  });

  it('resolves even if user fetch fails', async () => {
    getState.mockReturnValue({ user: { id: 'u1' } });
    getUser.mockRejectedValue(new Error('network'));
    await expect(warmCriticalCaches()).resolves.toBeUndefined();
  });

  it('fetches courses and user profile in parallel', async () => {
    getState.mockReturnValue({ user: { id: 'u1' } });
    await warmCriticalCaches();
    expect(getCourses).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledTimes(1);
  });
});
