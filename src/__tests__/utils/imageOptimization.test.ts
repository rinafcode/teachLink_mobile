import { buildOptimizedImageSources } from '../../utils/imageOptimization';

describe('imageOptimization', () => {
  it('builds webp primary, png fallback, and lqip placeholder for remote images', () => {
    const sources = buildOptimizedImageSources('https://cdn.example.com/photo.png', {
      width: 120,
      height: 80,
      pixelRatio: 2,
    });

    expect(sources.primaryUri).toContain('format=webp');
    expect(sources.primaryUri).toContain('w=240');
    expect(sources.primaryUri).toContain('h=160');
    expect(sources.primaryUri).toContain('dpr=2');

    expect(sources.fallbackUri).toContain('format=png');
    expect(sources.lqipUri).toContain('lqip=1');
    expect(sources.prefetchCandidates.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps local asset URIs untouched', () => {
    const uri = 'file:///tmp/local-image.jpg';
    const sources = buildOptimizedImageSources(uri, { pixelRatio: 3 });

    expect(sources.primaryUri).toBe(uri);
    expect(sources.fallbackUri).toBe(uri);
    expect(sources.lqipUri).toBe(uri);
    expect(sources.prefetchCandidates).toEqual([uri]);
  });

  it('clamps dpr to max 3', () => {
    const sources = buildOptimizedImageSources('https://cdn.example.com/a.jpg', {
      pixelRatio: 5,
    });

    expect(sources.dpr).toBe(3);
    expect(sources.primaryUri).toContain('dpr=3');
  });
});
