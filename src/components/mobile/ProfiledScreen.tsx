import React, { Profiler, ReactNode } from 'react';
import { useReactProfiler, ProfilerOptions } from '../../hooks/useReactProfiler';

interface ProfiledScreenProps {
  name: string;
  children: ReactNode;
  options?: ProfilerOptions;
}

/**
 * Wraps a screen (or any subtree) with React's built-in Profiler and forwards
 * render-timing data to analytics via `useReactProfiler`.
 *
 * Only active when `__DEV__` is true or when the profiler is explicitly enabled
 * via the options prop, keeping production overhead negligible.
 *
 * Usage:
 *   <ProfiledScreen name="HomeScreen">
 *     <HomeContent />
 *   </ProfiledScreen>
 */
export const ProfiledScreen: React.FC<ProfiledScreenProps> = ({ name, children, options }) => {
  const { onRender } = useReactProfiler(name, options);

  return (
    <Profiler id={name} onRender={onRender}>
      {children}
    </Profiler>
  );
};

export default ProfiledScreen;
