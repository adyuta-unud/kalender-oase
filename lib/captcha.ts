import crypto from 'node:crypto';

/**
 * Modul Verifikasi Keamanan Anti-Bot & Anti-DDoS menggunakan Cloudflare Turnstile
 */

export const CAPTCHA_COOKIE_NAME = 'oase_cf_verified';
const CAPTCHA_COOKIE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 Jam

export interface TurnstileVerifyResult {
  valid: boolean;
  error?: string;
  hostname?: string;
  challengeTs?: string;
}

let ephemeralCaptchaSecretKey: string | null = null;

function getCaptchaSecretKey(): string {
  if (process.env.TURNSTILE_SECRET_KEY) return process.env.TURNSTILE_SECRET_KEY;
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;

  if (!ephemeralCaptchaSecretKey) {
    ephemeralCaptchaSecretKey = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralCaptchaSecretKey;
}


/**
 * Buat nilai signed cookie untuk menandai bahwa IP/klien telah lolos verifikasi Turnstile
 */
export function generateCaptchaCookieValue(clientIp?: string): string {
  const timestamp = Date.now().toString();
  const secret = getCaptchaSecretKey();
  const payload = `${timestamp}:${clientIp || 'unknown'}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${timestamp}.${hmac}`;
}

/**
 * Validasi apakah signed cookie verifikasi CAPTCHA masih valid dan belum kedaluwarsa
 */
export function validateCaptchaCookieValue(
  cookieValue?: string,
  clientIp?: string
): boolean {
  if (!cookieValue || typeof cookieValue !== 'string') return false;

  const parts = cookieValue.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, providedHmac] = parts;
  const timestamp = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return false;

  // Cek masa berlaku (2 jam)
  const now = Date.now();
  if (now - timestamp > CAPTCHA_COOKIE_MAX_AGE_MS || timestamp > now + 60000) {
    return false;
  }

  const secret = getCaptchaSecretKey();
  const payload = `${timestampStr}:${clientIp || 'unknown'}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');
    const providedBuffer = Buffer.from(providedHmac, 'hex');
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

/**
 * Validasi token Cloudflare Turnstile ke endpoint siteverify resmi Cloudflare
 */
export async function verifyTurnstileToken(
  token?: string,
  remoteip?: string
): Promise<TurnstileVerifyResult> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return {
      valid: false,
      error: 'Token verifikasi Cloudflare Turnstile tidak ditemukan.',
    };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // Jika secret key belum diatur sama sekali di environment
    return {
      valid: false,
      error: 'Konfigurasi TURNSTILE_SECRET_KEY belum diatur pada server.',
    };
  }

  try {
    const formData = new URLSearchParams({
      secret: secretKey,
      response: token.trim(),
    });

    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      signal: AbortSignal.timeout(8000), // Timeout 8 detik demi mencegah blocking
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Server Cloudflare merespons dengan status HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      success: boolean;
      'error-codes'?: string[];
      challenge_ts?: string;
      hostname?: string;
    };

    if (data.success) {
      return {
        valid: true,
        hostname: data.hostname,
        challengeTs: data.challenge_ts,
      };
    }

    const errorCodes = data['error-codes']?.join(', ') || 'invalid-input-response';
    return {
      valid: false,
      error: `Verifikasi Cloudflare Turnstile gagal (${errorCodes}). Silakan coba lagi.`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Koneksi ke verifikasi Cloudflare gagal.';
    return {
      valid: false,
      error: `Gagal memverifikasi ke server Cloudflare: ${msg}`,
    };
  }
}

/**
 * Helper komprehensif untuk memeriksa apakah suatu request telah melewati verifikasi CAPTCHA
 * (memeriksa HTTP-only signed cookie oase_cf_verified atau token turnstile langsung)
 */
export async function isCaptchaRequestVerified(
  request: Request,
  clientIp?: string,
  directToken?: string
): Promise<{ valid: boolean; error?: string }> {
  // Lewatkan jika dalam environment testing otomatis
  if (process.env.NODE_ENV === 'test') {
    return { valid: true };
  }

  // 1. Periksa cookie oase_cf_verified dari header Request
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => Boolean(k))
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );

  const cfCookie = cookies[CAPTCHA_COOKIE_NAME];
  if (cfCookie && validateCaptchaCookieValue(cfCookie, clientIp)) {
    return { valid: true };
  }

  // 2. Jika cookie tidak ada atau expired, cek jika ada token langsung di request body
  if (directToken) {
    const result = await verifyTurnstileToken(directToken, clientIp);
    if (result.valid) {
      return { valid: true };
    }
    return {
      valid: false,
      error: result.error || 'Verifikasi keamanan bot gagal.',
    };
  }

  return {
    valid: false,
    error: 'Verifikasi keamanan Cloudflare Turnstile diperlukan di awal halaman.',
  };
}
