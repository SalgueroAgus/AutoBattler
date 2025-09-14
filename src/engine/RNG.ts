// Seeded PRNG (deterministic per seed). Mulberry32 variant.

export class RNG {
  private state: number;
  constructor(seedString: string) {
    this.state = RNG.hash(seedString);
  }

  static hash(str: string): number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) || 0x9e3779b9;
  }

  next(): number {
    // xorshift32-style step
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  }

  nextFloat(): number {
    return this.next() / 4294967296; // 0..1
  }

  pick<T>(arr: T[]): T {
    const idx = Math.floor(this.nextFloat() * arr.length);
    return arr[Math.max(0, Math.min(arr.length - 1, idx))];
  }

  pickWeighted<T>(items: { item: T; weight: number }[]): T {
    const total = items.reduce((a, b) => a + b.weight, 0);
    let r = this.nextFloat() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it.item;
    }
    return items[items.length - 1].item;
  }
}

