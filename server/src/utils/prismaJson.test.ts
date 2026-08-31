import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { toNullableJsonInput } from './prismaJson';

describe('toNullableJsonInput', () => {
  it('maps nullish values to Prisma JsonNull for nullable JSON writes', () => {
    expect(toNullableJsonInput(null)).toBe(Prisma.JsonNull);
    expect(toNullableJsonInput(undefined)).toBe(Prisma.JsonNull);
  });

  it('keeps JSON objects and arrays unchanged', () => {
    const address = { city: 'Curitiba', state: 'PR' };
    const officeHours = [{ label: 'Segunda', hours: '08:00 - 17:00' }];

    expect(toNullableJsonInput(address)).toBe(address);
    expect(toNullableJsonInput(officeHours)).toBe(officeHours);
  });
});
