/**
 * Suspense Fallback Components
 *
 * Skeleton loaders and fallback UI for lazy-loaded components
 * during code splitting and loading.
 */

import React from 'react';

/**
 * Generic loading skeleton
 */
export const LoadingSkeleton = ({
  height = 100,
  width = '100%',
  count = 1,
}: {
  height?: number;
  width?: string | number;
  count?: number;
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            width,
            backgroundColor: '#f0f0f0',
            borderRadius: 4,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/**
 * Video player loading skeleton
 */
export const VideoPlayerSkeleton = () => {
  return (
    <div style={{ width: '100%', backgroundColor: '#000' }}>
      <div style={{ aspectRatio: '16/9', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * Data grid loading skeleton
 */
export const DataGridSkeleton = () => {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <LoadingSkeleton height={40} count={1} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <LoadingSkeleton height={20} count={1} />
        </div>
      ))}
    </div>
  );
}

/**
 * Profile card loading skeleton
 */
export const ProfileSkeleton = () => {
  return (
    <div style={{ padding: 16 }}>
      {/* Avatar */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: '#f0f0f0',
          margin: '0 auto 16px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      {/* Name */}
      <div style={{ marginBottom: 12 }}>
        <LoadingSkeleton height={20} count={1} />
      </div>
      {/* Bio */}
      <div style={{ marginBottom: 16 }}>
        <LoadingSkeleton height={16} count={2} />
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <LoadingSkeleton height={30} count={1} />
            <div style={{ marginTop: 8 }}>
              <LoadingSkeleton height={12} count={1} />
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/**
 * Settings page loading skeleton
 */
export const SettingsSkeleton = () => {
  return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <LoadingSkeleton height={16} count={1} width="40%" />
          </div>
          <LoadingSkeleton height={44} count={1} />
        </div>
      ))}
    </div>
  );
}

/**
 * Quiz card loading skeleton
 */
export const QuizSkeleton = () => {
  return (
    <div style={{ padding: 16 }}>
      {/* Question */}
      <div style={{ marginBottom: 24 }}>
        <LoadingSkeleton height={24} count={2} />
      </div>
      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} height={48} count={1} />
        ))}
      </div>
      {/* Progress */}
      <div style={{ marginTop: 24 }}>
        <LoadingSkeleton height={4} count={1} />
      </div>
    </div>
  );
}

/**
 * Search results loading skeleton
 */
export const SearchResultsSkeleton = () => {
  return (
    <div style={{ padding: 16 }}>
      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <LoadingSkeleton height={40} count={1} />
      </div>
      {/* Results */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: '#f0f0f0',
              borderRadius: 4,
              animation: 'pulse 1.5s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <LoadingSkeleton height={16} count={2} />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/**
 * Download queue loading skeleton
 */
export const DownloadQueueSkeleton = () => {
  return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <LoadingSkeleton height={14} count={1} width="60%" />
          </div>
          <LoadingSkeleton height={4} count={1} />
          <div style={{ marginTop: 8 }}>
            <LoadingSkeleton height={12} count={1} width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Generic card loading skeleton
 */
export const CardSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}>
          <LoadingSkeleton height={20} count={2} />
          <div style={{ marginTop: 12 }}>
            <LoadingSkeleton height={12} count={1} width="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Course content loading skeleton
 */
export const CourseContentSkeleton = () => {
  return (
    <div style={{ padding: 16 }}>
      {/* Syllabus/Tabs */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} height={32} width="100px" count={1} />
        ))}
      </div>
      {/* Content */}
      <div style={{ marginBottom: 16 }}>
        <LoadingSkeleton height={24} count={3} />
      </div>
      {/* Lesson items */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0' }}>
          <LoadingSkeleton height={18} count={1} />
        </div>
      ))}
    </div>
  );
}
