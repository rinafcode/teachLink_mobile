import { SearchIndexService } from '../../src/services/searchIndex';
import { Course } from '../../src/types/course';

function makeCourse(index: number): Course {
  const category = index % 2 === 0 ? 'Mobile Development' : 'Web Development';
  const level = index % 3 === 0 ? 'advanced' : index % 3 === 1 ? 'intermediate' : 'beginner';

  return {
    id: `course-${index}`,
    title: `React Native Performance Patterns ${index}`,
    description:
      'React Native search indexing, course discovery, offline mobile learning, and performance optimization techniques.',
    instructor: {
      id: `instructor-${index}`,
      name: `Instructor ${index}`,
    },
    sections: [],
    totalLessons: 10,
    totalDuration: 90,
    level,
    category,
  };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

describe('SearchIndexService performance', () => {
  it('searches a 500-course pre-built index within the 50ms budget', async () => {
    const service = new SearchIndexService();
    const courses = Array.from({ length: 500 }, (_, index) => makeCourse(index));

    await service.buildFromCourses(courses);

    const start = now();
    const results = service.search('react native', {}, 50);
    const duration = now() - start;

    expect(service.indexedCount).toBe(500);
    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50);
  });
});
