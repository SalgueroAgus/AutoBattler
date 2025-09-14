import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/RNG';

describe('RNG reproducibility', () => {
  it('produces same sequence for same seed', () => {
    const a = new RNG('seed-42');
    const b = new RNG('seed-42');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
});

