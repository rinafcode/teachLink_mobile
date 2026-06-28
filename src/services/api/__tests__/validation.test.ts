import { z } from 'zod';
import { validateResponse, ValidationError } from '../validation';

const TestSchema = z.object({
  id: z.string(),
  value: z.number(),
});

describe('validateResponse', () => {
  it('should return data if validation passes', () => {
    const data = { id: '1', value: 123 };
    const result = validateResponse(TestSchema, data);
    expect(result).toEqual(data);
  });

  it('should throw ValidationError if validation fails', () => {
    const data = { id: '1', value: 'wrong-type' };
    expect(() => validateResponse(TestSchema, data)).toThrow(ValidationError);
  });

  it('should throw ValidationError for missing fields', () => {
    const data = { id: '1' };
    expect(() => validateResponse(TestSchema, data)).toThrow(ValidationError);
  });
});