import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';

describe('RNG determinism', () => {
  it('produces same sequence for same seed', () => {
    const a = new RNG(123);
    const b = new RNG(123);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
});

