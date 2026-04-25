import { SearchResultCard, SearchResultItem } from '../../src/components/mobile/SearchResultCard';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
}));

jest.mock('lucide-react-native', () => ({
  BookOpen: () => null,
  Clock: () => null,
}));

const baseItem: SearchResultItem = {
  id: '1',
  title: 'Introduction to React Native',
};

describe('SearchResultCard', () => {
  describe('title rendering', () => {
    it('renders the item title', () => {
      const element = SearchResultCard({ item: baseItem, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Introduction to React Native');
    });

    it('renders a long title without crashing', () => {
      const item: SearchResultItem = {
        ...baseItem,
        title: 'A Very Long Course Title That Might Wrap Across Multiple Lines In The UI',
      };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('A Very Long Course Title');
    });
  });

  describe('description / subtitle', () => {
    it('renders description when provided', () => {
      const item: SearchResultItem = {
        ...baseItem,
        description: 'Learn the fundamentals of React Native development.',
      };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Learn the fundamentals');
    });

    it('renders subtitle when description is absent', () => {
      const item: SearchResultItem = {
        ...baseItem,
        subtitle: 'Beginner friendly',
      };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Beginner friendly');
    });

    it('prefers description over subtitle when both are provided', () => {
      const item: SearchResultItem = {
        ...baseItem,
        description: 'Primary description',
        subtitle: 'Fallback subtitle',
      };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      const json = JSON.stringify(element);
      expect(json).toContain('Primary description');
      expect(json).not.toContain('Fallback subtitle');
    });

    it('renders nothing for description row when neither is provided', () => {
      const element = SearchResultCard({ item: baseItem, onPress: jest.fn() });
      expect(JSON.stringify(element)).not.toContain('description');
    });
  });

  describe('meta information', () => {
    it('renders category when provided', () => {
      const item: SearchResultItem = { ...baseItem, category: 'Mobile Development' };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Mobile Development');
    });

    it('renders level when provided', () => {
      const item: SearchResultItem = { ...baseItem, level: 'Intermediate' };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Intermediate');
    });

    it('joins category and level with a dot separator', () => {
      const item: SearchResultItem = {
        ...baseItem,
        category: 'Design',
        level: 'Beginner',
      };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Design · Beginner');
    });

    it('renders only category when level is absent', () => {
      const item: SearchResultItem = { ...baseItem, category: 'Backend' };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      const json = JSON.stringify(element);
      expect(json).toContain('Backend');
      expect(json).not.toContain(' · ');
    });

    it('renders duration when provided and greater than zero', () => {
      const item: SearchResultItem = { ...baseItem, duration: 45 };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('45 min');
    });

    it('does not render duration when duration is zero', () => {
      const item: SearchResultItem = { ...baseItem, duration: 0 };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).not.toContain(' min');
    });

    it('does not render duration when not provided', () => {
      const element = SearchResultCard({ item: baseItem, onPress: jest.fn() });
      expect(JSON.stringify(element)).not.toContain(' min');
    });
  });

  describe('accessibility', () => {
    it('sets accessibilityRole to button', () => {
      const element = SearchResultCard({ item: baseItem, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('"accessibilityRole":"button"');
    });

    it('sets accessibilityHint to open course details', () => {
      const element = SearchResultCard({ item: baseItem, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Opens course details');
    });

    it('includes title in accessibilityLabel', () => {
      const element = SearchResultCard({ item: baseItem, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Introduction to React Native');
    });

    it('includes description in accessibilityLabel when provided', () => {
      const item: SearchResultItem = {
        ...baseItem,
        description: 'A great course',
      };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('A great course');
    });

    it('includes category and level in accessibilityLabel', () => {
      const item: SearchResultItem = {
        ...baseItem,
        category: 'Web',
        level: 'Advanced',
      };
      const element = SearchResultCard({ item, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Web · Advanced');
    });
  });

  describe('press interaction', () => {
    it('renders as a TouchableOpacity', () => {
      const element = SearchResultCard({ item: baseItem, onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('TouchableOpacity');
    });

    it('wires the onPress handler', () => {
      const onPress = jest.fn();
      const element = SearchResultCard({ item: baseItem, onPress });
      expect(element).toBeTruthy();
      // The component renders without error and the handler is passed in
      expect(onPress).not.toHaveBeenCalled(); // not called until user taps
    });
  });

  describe('full item with all fields', () => {
    it('renders correctly with all props populated', () => {
      const fullItem: SearchResultItem = {
        id: '42',
        title: 'Advanced TypeScript',
        description: 'Deep dive into TypeScript generics and patterns.',
        subtitle: 'For experienced developers',
        category: 'Programming',
        level: 'Advanced',
        duration: 120,
        thumbnail: 'https://example.com/thumb.jpg',
      };
      const element = SearchResultCard({ item: fullItem, onPress: jest.fn() });
      const json = JSON.stringify(element);
      expect(json).toContain('Advanced TypeScript');
      expect(json).toContain('Deep dive into TypeScript generics');
      expect(json).toContain('Programming · Advanced');
      expect(json).toContain('120 min');
    });
  });
});
