import { SearchIndexService } from '../../src/services/searchIndex';
import { Course } from '../../src/types/course';

describe('SearchIndexService diacritics normalization', () => {
  let service: SearchIndexService;

  beforeEach(() => {
    service = new SearchIndexService();
  });

  it('finds course titled "Café" when searching "cafe"', async () => {
    const courses: Course[] = [
      {
        id: 'course-1',
        title: 'Café Communication',
        description: 'Learn communication skills.',
        instructor: { id: 'inst-1', name: 'John Doe' },
        sections: [],
        totalLessons: 5,
        totalDuration: 60,
        level: 'beginner',
        category: 'Language',
      },
    ];

    await service.buildFromCourses(courses);

    // Test 'Cafe' / 'cafe' search finding 'Café'
    const results = service.search('Cafe');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('course-1');
    expect(results[0].title).toBe('Café Communication'); // Original display text preserved
  });

  it('finds course titled "Résumé" when searching "Resume"', async () => {
    const courses: Course[] = [
      {
        id: 'course-2',
        title: 'Résumé Writing',
        description: 'Professional CV preparation.',
        instructor: { id: 'inst-2', name: 'Jane Doe' },
        sections: [],
        totalLessons: 5,
        totalDuration: 60,
        level: 'beginner',
        category: 'Careers',
      },
    ];

    await service.buildFromCourses(courses);

    const results = service.search('Resume');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('course-2');
    expect(results[0].title).toBe('Résumé Writing'); // Original display text preserved
  });

  it('finds course titled "München" when searching "munchen"', async () => {
    const courses: Course[] = [
      {
        id: 'course-3',
        title: 'München History',
        description: 'History of Munich (München).',
        instructor: { id: 'inst-3', name: 'Karl' },
        sections: [],
        totalLessons: 5,
        totalDuration: 60,
        level: 'beginner',
        category: 'History',
      },
    ];

    await service.buildFromCourses(courses);

    // Test 'munchen' finding 'München' (diacritics normalization)
    const resultsMunchen = service.search('munchen');
    expect(resultsMunchen).toHaveLength(1);
    expect(resultsMunchen[0].id).toBe('course-3');

    // Test 'Munich' finding 'München' (since 'Munich' is in description/indexed fields)
    const resultsMunich = service.search('Munich');
    expect(resultsMunich).toHaveLength(1);
    expect(resultsMunich[0].id).toBe('course-3');
  });

  it('finds course titled "Ñoño" when searching "nono"', async () => {
    const courses: Course[] = [
      {
        id: 'course-4',
        title: 'El curso de Ñoño',
        description: 'Un curso divertido.',
        instructor: { id: 'inst-4', name: 'Nico' },
        sections: [],
        totalLessons: 5,
        totalDuration: 60,
        level: 'beginner',
        category: 'Culture',
      },
    ];

    await service.buildFromCourses(courses);

    const results = service.search('nono');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('course-4');
  });
});
