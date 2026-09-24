import { normalizeAndValidatePhone } from '@/lib/ssh';

describe('normalizeAndValidatePhone - E.164 International Normalization Tests', () => {
  it('should preserve valid Indian numbers with +91', () => {
    const res = normalizeAndValidatePhone('+919876543210');
    expect(res.cleaned).toBe('919876543210');
  });

  it('should preserve valid UAE numbers with +971 and not prepend 91', () => {
    const res = normalizeAndValidatePhone('+971501234567');
    expect(res.cleaned).toBe('971501234567');
  });

  it('should preserve valid UK numbers with +44 and not prepend 91', () => {
    const res = normalizeAndValidatePhone('+447911123456');
    expect(res.cleaned).toBe('447911123456');
  });

  it('should preserve valid US numbers with +1 and not prepend 91', () => {
    const res = normalizeAndValidatePhone('+14155551234');
    expect(res.cleaned).toBe('14155551234');
  });

  it('should correctly strip formatting spaces, dashes, and parentheses', () => {
    const res = normalizeAndValidatePhone('+971 (50) 123-4567');
    expect(res.cleaned).toBe('971501234567');
  });

  it('should clean already-normalized 12-digit digits string', () => {
    const res = normalizeAndValidatePhone('971501234567');
    expect(res.cleaned).toBe('971501234567');
  });
});
