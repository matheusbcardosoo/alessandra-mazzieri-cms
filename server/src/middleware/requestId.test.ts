import { describe, expect, it, vi } from 'vitest';
import { requestId } from './requestId';

function makeRes() {
  const headers: Record<string, string> = {};
  return {
    set: vi.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    _headers: headers
  } as unknown as { set: (k: string, v: string) => void; _headers: Record<string, string> };
}

describe('requestId', () => {
  it('assigns a uuid to req.id, sets X-Request-Id, attaches req.log, and calls next', () => {
    const req = {} as { id: string; log: unknown };
    const res = makeRes();
    const next = vi.fn();

    requestId(req as never, res as never, next);

    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(req.log).toBeDefined();
    expect(res.set).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalledWith();
  });

  it('assigns a different id on each call', () => {
    const req1 = {} as { id: string };
    const req2 = {} as { id: string };
    requestId(req1 as never, makeRes() as never, vi.fn());
    requestId(req2 as never, makeRes() as never, vi.fn());
    expect(req1.id).not.toBe(req2.id);
  });
});
