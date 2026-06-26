import { shallowDiff } from '../../src/utils/stateDiff';

describe('shallowDiff', () => {
  it('returns null if the objects are strictly equal', () => {
    const obj = { a: 1, b: 2 };
    expect(shallowDiff(obj, obj)).toBeNull();
  });

  it('returns the new object if old object is null', () => {
    const newObj = { a: 1 };
    expect(shallowDiff(null as any, newObj)).toEqual(newObj);
  });

  it('returns null if no fields have changed', () => {
    const oldObj = { a: 1, b: 'test', c: true };
    const newObj = { a: 1, b: 'test' }; // partial identical
    expect(shallowDiff(oldObj, newObj)).toBeNull();
  });

  it('returns only the changed primitive fields', () => {
    const oldObj = { a: 1, b: 'test', c: true };
    const newObj = { a: 2, b: 'test', c: false };
    expect(shallowDiff(oldObj, newObj)).toEqual({ a: 2, c: false });
  });

  it('returns null for identical nested objects', () => {
    const oldObj = { a: 1, config: { x: 10, y: 20 } };
    const newObj = { config: { x: 10, y: 20 } };
    expect(shallowDiff(oldObj, newObj)).toBeNull();
  });

  it('returns patched nested objects for changed nested fields', () => {
    const oldObj = { a: 1, config: { x: 10, y: 20 } };
    const newObj = { config: { x: 10, y: 25 } }; // y changed
    
    // It should keep unchanged `x` while applying new `y` to the returned diff payload
    expect(shallowDiff(oldObj, newObj)).toEqual({
      config: { x: 10, y: 25 },
    });
  });

  it('returns arrays as-is without deep diffing them', () => {
    const oldObj = { items: [1, 2] };
    const newObj = { items: [1, 2] }; // different reference
    
    // Arrays are skipped from deep diffing, so it should just return the new array reference
    expect(shallowDiff(oldObj, newObj)).toEqual({ items: [1, 2] });
  });

  it('adds entirely new fields', () => {
    const oldObj = { a: 1 } as any;
    const newObj = { b: 2 };
    expect(shallowDiff(oldObj, newObj)).toEqual({ b: 2 });
  });
});
