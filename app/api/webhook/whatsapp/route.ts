import { NextResponse } from "next/server";
import {
  handleIncomingWhatsAppWebhook,
  validateWebhookSecret,
  type IncomingWhatsAppPayload,
} from "@/lib/whatsapp-bot";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Validasi otentikasi webhook secret dari URL query atau headers
 */
function validateRequestSecret(request: Request): {
  authorized: boolean;
  status: number;
  error?: string;
} {
  const { searchParams } = new URL(request.url);
  const secretFromQuery = searchParams.get("secret") || "";
  const secretFromHeader =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  const providedSecret = secretFromQuery || secretFromHeader;
  const result = validateWebhookSecret(providedSecret);

  if (!result.authorized) {
    const isUnconfigured = result.error?.includes("belum lengkap");
    return {
      authorized: false,
      status: isUnconfigured ? 500 : 401,
      error: result.error,
    };
  }

  return { authorized: true, status: 200 };
}

/**
 * Ekstraksi payload dari berbagai format Content-Type Fonnte (JSON atau Form URL Encoded)
 */
async function parseIncomingPayload(
  request: Request,
): Promise<IncomingWhatsAppPayload> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as IncomingWhatsAppPayload;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData().catch(() => null);
    if (!formData) return {};

    const payload: IncomingWhatsAppPayload = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") {
        if (key === "isgroup") {
          payload.isgroup = value === "true" || value === "1";
        } else if (key === "inboxid") {
          const parsed = Number.parseInt(value, 10);
          payload.inboxid = Number.isNaN(parsed) ? value : parsed;
        } else {
          payload[key] = value;
        }
      }
    });
    return payload;
  }

  // Fallback json jika content-type kosong atau teks
  return (await request.json().catch(() => ({}))) as IncomingWhatsAppPayload;
}

export async function POST(request: Request) {
  try {
    // 1. Verifikasi Keamanan Secret Webhook
    const authCheck = validateRequestSecret(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error, status: false },
        { status: authCheck.status },
      );
    }

    // 2. Rate Limiting per IP Klien (maks 60 request/menit untuk webhook)
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`webhook_wa:${clientIp}`, {
      maxRequests: 60,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Terlalu banyak permintaan webhook dari IP ini.",
          status: false,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds || 30),
          },
        },
      );
    }

    // 3. Parse data payload pesan masuk
    const payload = await parseIncomingPayload(request);

    // 4. Proses pesan sesuai alur Make.com Blueprint
    const result = await handleIncomingWhatsAppWebhook(payload);

    return NextResponse.json({
      status: true,
      message: "Webhook diterima dan diproses.",
      result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal webhook.";
    console.error("[WhatsApp Webhook Error]:", message);
    return NextResponse.json(
      { error: message, status: false },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const authCheck = validateRequestSecret(request);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error, status: false },
      { status: authCheck.status },
    );
  }

  return NextResponse.json({
    status: true,
    message: "Endpoint Webhook WhatsApp aktif dan siap menerima pesan.",
  });
}
