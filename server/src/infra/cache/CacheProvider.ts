export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
  /** Deletes every key starting with `prefix` — for entries whose exact key isn't known ahead of time (e.g. paginated lists keyed by page/limit/search). */
  delPrefix(prefix: string): Promise<void>;
  wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T>;
}
