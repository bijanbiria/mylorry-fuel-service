// Small, focused crypto helpers for PAN handling (no DB/DI here).
import { createHash } from 'node:crypto';

/** Returns masked last4 from any PAN-like string (digits only are considered). */
export function last4(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

/** Stable SHA-256 hash for card PAN, prefixed for clarity. */
export function hashCardNumber(cardNumber: string): string {
  return 'sha256:' + createHash('sha256').update(cardNumber).digest('hex');
}