import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, getClientIp } from "../lib/rate-limit.ts";
import { verifyTurnstileToken } from "../lib/captcha.ts";
import { validateAndNormalizeIcalUrl } from "../lib/ical.ts";
import { getBaseUrl } from "../lib/site.ts";

test("Rate Limiter: enforces sliding window and blocks excessive requests", () => {
  const rule = { windowMs: 1000, maxRequests: 3 };
  const key = `test-ip-${Date.now()}`;

  // 3 request pertama harus berhasil
  const r1 = checkRateLimit(key, rule);
  assert.equal(r1.success, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkRateLimit(key, rule);
  assert.equal(r2.success, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkRateLimit(key, rule);
  assert.equal(r3.success, true);
  assert.equal(r3.remaining, 0);

  // Request ke-4 harus diblokir (429)
  const r4 = checkRateLimit(key, rule);
  assert.equal(r4.success, false);
  assert.ok((r4.retryAfterSeconds ?? 0) >= 1);
});

test("Rate Limiter: extracts IP correctly from various proxy headers", () => {
  const req1 = new Request("http://localhost", {
    headers: { "cf-connecting-ip": "203.0.113.195" },
  });
  assert.equal(getClientIp(req1), "203.0.113.195");

  const req2 = new Request("http://localhost", {
    headers: { "x-real-ip": "198.51.100.44" },
  });
  assert.equal(getClientIp(req2), "198.51.100.44");

  const req3 = new Request("http://localhost", {
    headers: { "x-forwarded-for": "192.0.2.1, 10.0.0.1" },
  });
  assert.equal(getClientIp(req3), "192.0.2.1");
});

test("Cloudflare Turnstile: rejects empty or invalid token inputs", async () => {
  const resEmpty = await verifyTurnstileToken("");
  assert.equal(resEmpty.valid, false);
  assert.ok(resEmpty.error?.includes("tidak ditemukan"));

  const resWhitespace = await verifyTurnstileToken("   ");
  assert.equal(resWhitespace.valid, false);
});

test("Cloudflare Turnstile: handles missing server secret key gracefully", async () => {
  const originalKey = process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;

  try {
    const res = await verifyTurnstileToken("dummy-token-sample");
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes("TURNSTILE_SECRET_KEY"));
  } finally {
    if (originalKey) {
      process.env.TURNSTILE_SECRET_KEY = originalKey;
    }
  }
});

test("Cloudflare Turnstile Cookie: signs and validates HMAC cookie securely", async () => {
  const {
    generateCaptchaCookieValue,
    validateCaptchaCookieValue,
    isCaptchaRequestVerified,
    CAPTCHA_COOKIE_NAME,
  } = await import("../lib/captcha.ts");

  const ip = "192.0.2.88";
  const validCookie = generateCaptchaCookieValue(ip);

  // 1. Cookie valid harus lolos
  assert.equal(validateCaptchaCookieValue(validCookie, ip), true);

  // 2. Cookie dengan IP berbeda harus ditolak jika IP diperiksa
  assert.equal(validateCaptchaCookieValue(validCookie, "203.0.113.1"), false);

  // 3. Cookie dengan tanda tangan dipalsukan harus ditolak
  const tamperedCookie = validCookie.slice(0, -4) + "abcd";
  assert.equal(validateCaptchaCookieValue(tamperedCookie, ip), false);

  // 4. Cookie kadaluarsa (misal dibuat 3 jam yang lalu) harus ditolak
  const pastTimestamp = Date.now() - 3 * 60 * 60 * 1000;
  const expiredCookie = `${pastTimestamp}.invalidhmac`;
  assert.equal(validateCaptchaCookieValue(expiredCookie, ip), false);

  // 5. isCaptchaRequestVerified dengan cookie valid di request
  const reqWithCookie = new Request("http://localhost/api/preview", {
    headers: {
      cookie: `${CAPTCHA_COOKIE_NAME}=${encodeURIComponent(validCookie)}`,
    },
  });
  const checkResult = await isCaptchaRequestVerified(reqWithCookie, ip);
  assert.equal(checkResult.valid, true);

  // 6. Request tanpa cookie pada NODE_ENV production harus ditolak
  const origEnv = process.env.NODE_ENV;
  try {
    (process.env as Record<string, string | undefined>)["NODE_ENV"] =
      "production";
    const reqWithoutCookie = new Request("http://localhost/api/preview");
    const rejectedCheck = await isCaptchaRequestVerified(reqWithoutCookie, ip);
    assert.equal(rejectedCheck.valid, false);
    assert.ok(rejectedCheck.error?.includes("Turnstile"));
  } finally {
    (process.env as Record<string, string | undefined>)["NODE_ENV"] = origEnv;
  }
});

test("SSRF Protection: validateAndNormalizeIcalUrl rejects disallowed hostnames and protocols", () => {
  // Hanya https://oase.unud.ac.id yang diizinkan
  assert.doesNotThrow(() => {
    validateAndNormalizeIcalUrl(
      "https://oase.unud.ac.id/calendar/export_execute.php?userid=123",
    );
  });

  // SSRF attempts ke internal network & non-https
  assert.throws(() =>
    validateAndNormalizeIcalUrl("http://169.254.169.254/latest/meta-data/"),
  );
  assert.throws(() => validateAndNormalizeIcalUrl("file:///etc/passwd"));
  assert.throws(() => validateAndNormalizeIcalUrl("javascript:alert(1)"));
  assert.throws(() =>
    validateAndNormalizeIcalUrl("https://evil-attacker.com/malicious.ics"),
  );
});

test("SEO & Site URL: getBaseUrl resolves valid domain and ignores localhost in production", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalVercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  try {
    // 1. Abaikan localhost
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    assert.equal(getBaseUrl(), "https://oasee.vercel.app");

    // 2. Gunakan custom valid domain
    process.env.NEXT_PUBLIC_APP_URL = "https://oase-calendar.my.id/";
    assert.equal(getBaseUrl(), "https://oase-calendar.my.id");

    // 3. Gunakan Vercel production url otomatis
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL =
      "kalender-oase-production.vercel.app";
    assert.equal(getBaseUrl(), "https://kalender-oase-production.vercel.app");
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    if (originalVercelProd) {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = originalVercelProd;
    } else {
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    }
  }
});

test("Security Headers: next.config.ts configures defense-in-depth HTTP headers", async () => {
  const nextConfigModule = await import("../next.config.ts");
  const config = nextConfigModule.default;

  assert.ok(
    typeof config.headers === "function",
    "next.config.ts should define async headers()",
  );
  const headerRules = await config.headers();
  assert.ok(
    Array.isArray(headerRules),
    "headers() should return an array of route rules",
  );

  const globalRule = headerRules.find(
    (r: { source: string }) => r.source === "/:path*",
  );
  assert.ok(globalRule, "Global route rule /:path* should exist");

  const headers = globalRule.headers as { key: string; value: string }[];
  const headerMap = new Map(headers.map((h) => [h.key.toLowerCase(), h.value]));

  assert.equal(headerMap.get("x-frame-options"), "DENY");
  assert.equal(headerMap.get("x-content-type-options"), "nosniff");
  assert.equal(
    headerMap.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assert.ok(headerMap.has("permissions-policy"));
  assert.ok(
    headerMap.has("strict-transport-security"),
    "HSTS header should be present",
  );
  assert.ok(
    headerMap.has("content-security-policy"),
    "CSP header should be present",
  );
});
