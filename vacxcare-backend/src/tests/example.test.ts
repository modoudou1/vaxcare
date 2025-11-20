import { describe, it, expect } from '@jest/globals';

describe('VaxCare Tests', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should validate environment setup', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

describe('Math utilities', () => {
  it('should add numbers correctly', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });

  it('should handle string concatenation', () => {
    const concat = (a: string, b: string) => a + b;
    expect(concat('Hello', ' World')).toBe('Hello World');
  });
});
