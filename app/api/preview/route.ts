import { NextResponse } from "next/server";
import { fetchPendingOaseTasks } from "@/lib/oase-auth";
import { convertMoodleTasksToOaseEvents } from "@/lib/moodle";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit";
import { isCaptchaRequestVerified } from "@/lib/captcha";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(
      `preview:${clientIp}`,
      RATE_LIMIT_RULES.PREVIEW,
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds || 30),
          },
        },
      );
    }

    const body = await request.json().catch(() => ({}));

    // Verifikasi Keamanan Cloudflare Turnstile di awal halaman
    const captchaCheck = await isCaptchaRequestVerified(
      request,
      clientIp,
      body.turnstileToken,
    );
    if (!captchaCheck.valid) {
      return NextResponse.json(
        {
          error:
            captchaCheck.error ||
            "Selesaikan verifikasi keamanan Cloudflare Turnstile di bagian atas halaman terlebih dahulu.",
          success: false,
        },
        { status: 403 },
      );
    }

    const username = (body.username || process.env.OASE_USERNAME || "").trim();
    const password = body.password || process.env.OASE_PASSWORD || "";

    if (!username || !password) {
      return NextResponse.json(
        {
          error:
            "Username (NIM) dan Password SSO Universitas Udayana wajib diisi.",
        },
        { status: 400 },
      );
    }

    // Ambil daftar tugas yang belum dikerjakan dari API internal Moodle OASE
    const rawTasks = await fetchPendingOaseTasks(username, password);
    const events = convertMoodleTasksToOaseEvents(rawTasks);

    return NextResponse.json({
      success: true,
      events,
      rawTasks,
      total: events.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memuat daftar tugas dari OASE.";
    return NextResponse.json(
      { error: message, success: false },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(
      `preview:${clientIp}`,
      RATE_LIMIT_RULES.PREVIEW,
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds || 30),
          },
        },
      );
    }

    // Proteksi Keamanan SEC-NEW-03:
    // Jangan pernah mengekspos daftar tugas pribadi pemilik server kepada pemanggil GET anonim di internet.
    // Tugas hanya boleh dimuat secara eksplisit via POST menggunakan kredensial yang dimasukkan pengguna.
    const hasConfiguredCredentials = Boolean(
      process.env.OASE_USERNAME?.trim() && process.env.OASE_PASSWORD,
    );

    return NextResponse.json({
      events: [],
      rawTasks: [],
      total: 0,
      hasConfiguredCredentials,
      requiresLogin: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memeriksa status preview OASE.";
    return NextResponse.json(
      { error: message, events: [], total: 0 },
      { status: 400 },
    );
  }
}
