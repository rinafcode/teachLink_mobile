import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppText as Text } from '../common/AppText';
import apiService from '../../services/api';
import logger from '../../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
}

export interface CommentSectionProps {
  /** The resource this comment thread belongs to (e.g. lesson or course id) */
  resourceId: string;
  /** Resource type used to build the API path */
  resourceType: 'lesson' | 'course';
  /** Current authenticated user id – required to post / like */
  currentUserId?: string;
  /** Current authenticated user display name */
  currentUserName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}

function CommentItem({ comment, onLike, onDelete, currentUserId }: CommentItemProps) {
  const isOwner = currentUserId === comment.authorId;

  return (
    <View testID={`comment-item-${comment.id}`} style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{comment.authorName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.commentMeta}>
          <Text style={styles.authorName}>{comment.authorName}</Text>
          <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity
            testID={`delete-comment-${comment.id}`}
            onPress={() => onDelete(comment.id)}
            accessibilityRole="button"
            accessibilityLabel="Delete comment"
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.commentBody}>{comment.body}</Text>

      <TouchableOpacity
        testID={`like-comment-${comment.id}`}
        onPress={() => onLike(comment.id)}
        accessibilityRole="button"
        accessibilityLabel={comment.likedByMe ? 'Unlike comment' : 'Like comment'}
        accessibilityState={{ selected: comment.likedByMe }}
        style={styles.likeButton}
      >
        <Text style={[styles.likeIcon, comment.likedByMe && styles.likedIcon]}>
          {comment.likedByMe ? '♥' : '♡'}
        </Text>
        <Text style={styles.likeCount}>{comment.likeCount}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommentSection({
  resourceId,
  resourceType,
  currentUserId,
  currentUserName = 'Anonymous',
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const apiBase = `/api/${resourceType}s/${resourceId}/comments`;

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.get(apiBase);
      setComments(res.data as Comment[]);
    } catch (err: any) {
      logger.errorSync('CommentSection: fetch failed', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const body = draft.trim();
    if (!body || !currentUserId) return;

    setSubmitting(true);
    try {
      const res = await apiService.post(apiBase, { body });
      setComments((prev) => [res.data as Comment, ...prev]);
      setDraft('');
    } catch (err: any) {
      logger.errorSync('CommentSection: submit failed', err);
      setError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Like ───────────────────────────────────────────────────────────────────

  const handleLike = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likeCount + (c.likedByMe ? -1 : 1) }
          : c,
      ),
    );

    try {
      if (target.likedByMe) {
        await apiService.delete(`${apiBase}/${commentId}/like`);
      } else {
        await apiService.post(`${apiBase}/${commentId}/like`, {});
      }
    } catch (err: any) {
      logger.errorSync('CommentSection: like failed', err);
      // Revert optimistic update
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likedByMe: target.likedByMe, likeCount: target.likeCount }
            : c,
        ),
      );
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await apiService.delete(`${apiBase}/${commentId}`);
    } catch (err: any) {
      logger.errorSync('CommentSection: delete failed', err);
      setError('Failed to delete comment.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View testID="comment-section" style={styles.container}>
      <Text style={styles.heading}>Comments ({comments.length})</Text>

      {error && (
        <View testID="comment-error" style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchComments} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentUserId && (
        <View style={styles.inputRow}>
          <TextInput
            testID="comment-input"
            style={styles.textInput}
            placeholder="Add a comment…"
            placeholderTextColor="#94a3b8"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={1000}
            accessibilityLabel="Comment input"
          />
          <TouchableOpacity
            testID="submit-comment"
            onPress={handleSubmit}
            disabled={submitting || !draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            accessibilityState={{ disabled: submitting || !draft.trim() }}
            style={[styles.submitButton, (!draft.trim() || submitting) && styles.submitDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator testID="comment-loading" color="#19c3e6" style={styles.loader} />
      ) : (
        <FlatList
          testID="comment-list"
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              onLike={handleLike}
              onDelete={handleDelete}
              currentUserId={currentUserId}
            />
          )}
          ListEmptyComponent={
            <Text testID="comment-empty" style={styles.emptyText}>
              No comments yet. Be the first to comment!
            </Text>
          }
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

export default CommentSection;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorText: { color: '#dc2626', fontSize: 13, flex: 1 },
  retryText: { color: '#dc2626', fontWeight: '700', marginLeft: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 44,
    maxHeight: 120,
  },
  submitButton: {
    backgroundColor: '#19c3e6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loader: { marginTop: 24 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 24, fontSize: 14 },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#19c3e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  commentMeta: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  commentDate: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  deleteButton: { padding: 4 },
  deleteText: { color: '#94a3b8', fontSize: 14 },
  commentBody: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 8 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: { fontSize: 16, color: '#94a3b8' },
  likedIcon: { color: '#ef4444' },
  likeCount: { fontSize: 13, color: '#64748b' },
});
