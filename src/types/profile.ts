export interface Connection {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  mutualConnections?: number;
  isFollowing: boolean;
}

export interface ProfileData {
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
  achievements: any[]; // Or import from AchievementBadges
  connections: Connection[];
}

export type ProfileTab = 'overview' | 'stats' | 'achievements' | 'connections';
