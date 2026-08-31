import { describe, expect, it } from 'vitest';
import { MemoryCacheProvider } from './MemoryCacheProvider';

describe('MemoryCacheProvider.delPrefix', () => {
  it('deletes every key starting with the given prefix, leaving others untouched', async () => {
    const cache = new MemoryCacheProvider();
    await cache.set('posts:list:published:p1:l9:q', ['a']);
    await cache.set('posts:list:published:p2:l9:q', ['b']);
    await cache.set('posts:list:published:p1:l9:qcafe', ['c']);
    await cache.set('posts:list:featured', ['d']);

    await cache.delPrefix('posts:list:published:');

    expect(await cache.get('posts:list:published:p1:l9:q')).toBeNull();
    expect(await cache.get('posts:list:published:p2:l9:q')).toBeNull();
    expect(await cache.get('posts:list:published:p1:l9:qcafe')).toBeNull();
    expect(await cache.get('posts:list:featured')).toEqual(['d']);
  });

  it('reproduces the original bug scenario: deleting the bare aggregate key alone does not clear paginated entries', async () => {
    const cache = new MemoryCacheProvider();
    const key = `posts:list:published:p1:l9:q`;
    await cache.set(key, ['stale']);

    // This is what the old (buggy) invalidation did — delete the exact base
    // key, which is never itself a real cache entry.
    await cache.del('posts:list:published');
    expect(await cache.get(key)).toEqual(['stale']);

    // The fix: delete by prefix actually reaches the dynamic key.
    await cache.delPrefix('posts:list:published:');
    expect(await cache.get(key)).toBeNull();
  });
});
