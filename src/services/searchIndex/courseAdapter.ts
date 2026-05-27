import { IndexableDoc } from './types';
import { Course } from '../../types/course';

export function courseToIndexable(course: Course): IndexableDoc {
  return {
    id: course.id,
    type: 'course',
    fields: {
      title: course.title,
      body: course.description,
      category: course.category,
      level: course.level,
      extra: course.instructor?.name,
    },
    payload: {
      thumbnail: course.thumbnail,
      totalDuration: course.totalDuration,
      totalLessons: course.totalLessons,
      instructorName: course.instructor?.name,
    },
  };
}
