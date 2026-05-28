import React from 'react';
import { fireEvent, render, waitFor, act } from '@testing-library/react-native';

import CommentSection, { Comment } from '../../src/components/mobile/CommentSection';
import apiService from '../../src/services/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { errorSync: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const COMMENT_1: Comment = {
  id: 'c1',
  authorId: 'user-1',
  authorName: 'Alice',
  body: 'Great lesson!',
  createdAt: '2024-01-15T10:00:00Z',
  likeCount: 3,
  likedByMe: false,
};

const COMMENT_2: Comment = {
  id: 'c2',
  authorId: 'user-2',
  authorName: 'Bob',
  body: 'Very helpful, thanks.',
  createdAt: '2024-01-16T12:00:00Z',
  likeCount: 1,
  likedByMe: true,
};

const DEFAULT_PROPS = {
  resourceId: 'lesson-42',
  resourceType: 'lesson' as const,
  currentUserId: 'user-1',
  currentUserName: 'Alice',
};

const mockGet = apiService.get as jest.Mock;
const mockPost = apiService.post as jest.Mock;
const mockDelete = apiService.delete as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: [COMMENT_1, COMMENT_2] });
  mockPost.mockResolvedValue({ data: { ...COMMENT_1, id: 'c-new', body: 'New comment' } });
  mockDelete.mockResolvedValue({ data: {} });
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe('Loading state', () => {
  it('shows loading indicator while fetching', () => {
    // Never resolves during this test
    mockGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    expect(getByTestId('comment-loading')).toBeTruthy();
  });

  it('hides loading indicator after fetch completes', async () => {
    const { queryByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => expect(queryByTestId('comment-loading')).toBeNull());
  });
});

// ── Rendering comments ─────────────────────────────────────────────────────────

describe('Rendering comments', () => {
  it('renders all fetched comments', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(getByTestId('comment-item-c1')).toBeTruthy();
      expect(getByTestId('comment-item-c2')).toBeTruthy();
    });
  });

  it('displays comment body text', async () => {
    const { getByText } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(getByText('Great lesson!')).toBeTruthy();
      expect(getByText('Very helpful, thanks.')).toBeTruthy();
    });
  });

  it('displays author names', async () => {
    const { getByText } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(getByText('Alice')).toBeTruthy();
      expect(getByText('Bob')).toBeTruthy();
    });
  });

  it('shows comment count in heading', async () => {
    const { getByText } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => expect(getByText('Comments (2)')).toBeTruthy());
  });

  it('shows empty state when no comments', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => expect(getByTestId('comment-empty')).toBeTruthy());
  });

  it('calls GET /api/lessons/:id/comments on mount', async () => {
    render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/lessons/lesson-42/comments'),
    );
  });

  it('uses correct API path for course resource type', async () => {
    render(
      <CommentSection
        resourceId="course-7"
        resourceType="course"
        currentUserId="user-1"
      />,
    );
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/courses/course-7/comments'),
    );
  });
});

// ── Input visibility ───────────────────────────────────────────────────────────

describe('Comment input', () => {
  it('shows input and submit button when currentUserId is provided', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => {
      expect(getByTestId('comment-input')).toBeTruthy();
      expect(getByTestId('submit-comment')).toBeTruthy();
    });
  });

  it('hides input when currentUserId is not provided', async () => {
    const { queryByTestId } = render(
      <CommentSection resourceId="lesson-42" resourceType="lesson" />,
    );
    await waitFor(() => {
      expect(queryByTestId('comment-input')).toBeNull();
      expect(queryByTestId('submit-comment')).toBeNull();
    });
  });
});

// ── Posting a comment ──────────────────────────────────────────────────────────

describe('Posting a comment', () => {
  it('calls POST with comment body and prepends new comment to list', async () => {
    const newComment: Comment = {
      id: 'c-new',
      authorId: 'user-1',
      authorName: 'Alice',
      body: 'New comment',
      createdAt: new Date().toISOString(),
      likeCount: 0,
      likedByMe: false,
    };
    mockPost.mockResolvedValue({ data: newComment });

    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('comment-input'));

    fireEvent.changeText(getByTestId('comment-input'), 'New comment');
    fireEvent.press(getByTestId('submit-comment'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/lessons/lesson-42/comments', {
        body: 'New comment',
      });
      expect(getByTestId('comment-item-c-new')).toBeTruthy();
    });
  });

  it('clears the input after successful submission', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('comment-input'));

    fireEvent.changeText(getByTestId('comment-input'), 'Hello');
    fireEvent.press(getByTestId('submit-comment'));

    await waitFor(() => {
      const input = getByTestId('comment-input');
      expect(input.props.value).toBe('');
    });
  });

  it('does not submit when draft is empty', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('submit-comment'));

    fireEvent.press(getByTestId('submit-comment'));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('does not submit when draft is only whitespace', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('comment-input'));

    fireEvent.changeText(getByTestId('comment-input'), '   ');
    fireEvent.press(getByTestId('submit-comment'));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows error banner when POST fails', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('comment-input'));

    fireEvent.changeText(getByTestId('comment-input'), 'Hello');
    fireEvent.press(getByTestId('submit-comment'));

    await waitFor(() => expect(getByTestId('comment-error')).toBeTruthy());
  });
});

// ── Liking a comment ───────────────────────────────────────────────────────────

describe('Liking a comment', () => {
  it('optimistically increments like count and calls POST like endpoint', async () => {
    const { getByTestId, getByText } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('like-comment-c1'));

    // c1 starts with likeCount=3, likedByMe=false
    fireEvent.press(getByTestId('like-comment-c1'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/lessons/lesson-42/comments/c1/like',
        {},
      );
      expect(getByText('4')).toBeTruthy();
    });
  });

  it('optimistically decrements like count and calls DELETE like endpoint', async () => {
    const { getByTestId, getByText } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('like-comment-c2'));

    // c2 starts with likeCount=1, likedByMe=true
    fireEvent.press(getByTestId('like-comment-c2'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/lessons/lesson-42/comments/c2/like',
      );
      expect(getByText('0')).toBeTruthy();
    });
  });

  it('reverts optimistic like update when API call fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));
    const { getByTestId, getByText } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('like-comment-c1'));

    fireEvent.press(getByTestId('like-comment-c1'));

    await waitFor(() => {
      // Should revert back to original likeCount=3
      expect(getByText('3')).toBeTruthy();
    });
  });
});

// ── Deleting a comment ─────────────────────────────────────────────────────────

describe('Deleting a comment', () => {
  it('shows delete button only for comments owned by currentUser', async () => {
    const { getByTestId, queryByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => {
      // c1 is owned by user-1 (currentUserId)
      expect(getByTestId('delete-comment-c1')).toBeTruthy();
      // c2 is owned by user-2
      expect(queryByTestId('delete-comment-c2')).toBeNull();
    });
  });

  it('removes comment from list and calls DELETE endpoint', async () => {
    const { getByTestId, queryByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('delete-comment-c1'));

    fireEvent.press(getByTestId('delete-comment-c1'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/api/lessons/lesson-42/comments/c1');
      expect(queryByTestId('comment-item-c1')).toBeNull();
    });
  });
});

// ── Error handling ─────────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('shows error banner when initial fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => expect(getByTestId('comment-error')).toBeTruthy());
  });

  it('retry button re-fetches comments', async () => {
    mockGet.mockRejectedValueOnce(new Error('Server error'));
    mockGet.mockResolvedValueOnce({ data: [COMMENT_1] });

    const { getByTestId, getByText } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('comment-error'));

    fireEvent.press(getByText('Retry'));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(getByTestId('comment-item-c1')).toBeTruthy();
    });
  });
});

// ── Accessibility ──────────────────────────────────────────────────────────────

describe('Accessibility', () => {
  it('like button has correct accessibilityLabel when not liked', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('like-comment-c1'));
    const likeBtn = getByTestId('like-comment-c1');
    expect(likeBtn.props.accessibilityLabel).toBe('Like comment');
  });

  it('like button has correct accessibilityLabel when already liked', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('like-comment-c2'));
    const likeBtn = getByTestId('like-comment-c2');
    expect(likeBtn.props.accessibilityLabel).toBe('Unlike comment');
  });

  it('delete button has correct accessibilityLabel', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('delete-comment-c1'));
    expect(getByTestId('delete-comment-c1').props.accessibilityLabel).toBe('Delete comment');
  });

  it('submit button has correct accessibilityLabel', async () => {
    const { getByTestId } = render(<CommentSection {...DEFAULT_PROPS} />);
    await waitFor(() => getByTestId('submit-comment'));
    expect(getByTestId('submit-comment').props.accessibilityLabel).toBe('Post comment');
  });
});
