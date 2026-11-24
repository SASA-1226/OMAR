// Security, Privacy Masking, URL Sanitization, Arabic Search Normalization & Rate Limiting

const rateLimitBuckets = new Map<string, number[]>();

/**
 * Sliding-window client rate limiter for sensitive flows (login, transfer attempts, reports).
 * Server-side rate limiting should also be enforced via Supabase Edge Functions / PostgreSQL policies.
 */
export function checkClientRateLimit(actionKey: string, maxAttempts = 5, windowMs = 60_000): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const timestamps = (rateLimitBuckets.get(actionKey) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxAttempts) {
    const oldest = timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateLimitBuckets.set(actionKey, timestamps);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  rateLimitBuckets.set(actionKey, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Mask IMEI / Serial Number so full private identifiers are never exposed publicly.
 */
export function maskSensitiveCode(code?: string | null): string {
  if (!code) return 'غير مُضاف';
  const clean = code.trim();
  if (clean.length <= 4) return '••••';
  return '••••••••' + clean.slice(-4);
}

/**
 * Validate dynamic URLs to block javascript:, data:text/html, or unsafe schemes.
 */
export function sanitizeSafeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (trimmed.startsWith('data:image/png;base64,') || trimmed.startsWith('data:image/jpeg;base64,') || trimmed.startsWith('data:image/webp;base64,')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Arabic text normalizer for smart search with typo/hamza tolerance.
 */
export function normalizeArabicSearch(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/\s+/g, ' ');
}

export function fuzzyArabicMatch(haystack: string, query: string): boolean {
  const normHaystack = normalizeArabicSearch(haystack);
  const normQuery = normalizeArabicSearch(query);
  if (!normQuery) return true;
  if (normHaystack.includes(normQuery)) return true;

  // Token-level match + 1-char edit tolerance for tokens >= 4 chars
  const queryTokens = normQuery.split(' ').filter(Boolean);
  const words = normHaystack.split(/[\s\-_/·]+/).filter(Boolean);

  return queryTokens.every((qt) => {
    if (normHaystack.includes(qt)) return true;
    if (qt.length < 4) return false;
    return words.some((w) => levenshtein(qt, w.slice(0, qt.length + 1)) <= 1);
  });
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function generateSafeId(prefix: string): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${prefix}-${hex}`;
}

export function generateTransferCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return `TR-${(num % 900000 + 100000).toString()}`;
}

/**
 * Standard GSM Luhn checksum check for 15-digit IMEI numbers.
 * Runs locally at zero cost to detect typos and malformed IMEIs before saving or buying.
 */
export function validateImeiLuhn(raw: string): {
  isNumeric15: boolean;
  valid: boolean;
  reason: string;
} {
  const clean = raw.replace(/[\s-]/g, '').trim();
  if (!/^\d{15}$/.test(clean)) {
    return {
      isNumeric15: false,
      valid: false,
      reason: 'يجب أن يتكون رقم IMEI من 15 رقمًا إنجليزية متصلة.',
    };
  }
  let sum = 0;
  for (let i = 0; i < 15; i += 1) {
    let digit = Number(clean[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const valid = sum % 10 === 0;
  return {
    isNumeric15: true,
    valid,
    reason: valid
      ? 'صيغة IMEI سليمة رياضيًا وفق معيار التحقق القياسي (Luhn).'
      : 'خانة التحقق غير مطابقة لمعيار Luhn — تأكد من عدم وجود خطأ في كتابة الأرقام.',
  };
}
