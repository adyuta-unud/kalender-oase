import crypto from "node:crypto";
import { normalizeWhatsAppTarget } from "./whatsapp.ts";

/**
 * Validasi otentikasi webhook secret menggunakan timing-safe comparison
 */
export function validateWebhookSecret(
  providedSecret: string,
  configuredSecret?: string,
): { authorized: boolean; error?: string } {
  const secret = (
    configuredSecret !== undefined
      ? configuredSecret
      : process.env.FONNTE_WEBHOOK_SECRET
  )?.trim();

  if (!secret) {
    return {
      authorized: false,
      error:
        "Konfigurasi server belum lengkap: FONNTE_WEBHOOK_SECRET wajib disetel di Environment Variables.",
    };
  }

  if (!providedSecret) {
    return {
      authorized: false,
      error: "Akses ditolak: Kredensial webhook secret tidak disertakan.",
    };
  }

  const bufA = Buffer.from(providedSecret);
  const bufB = Buffer.from(secret);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return {
      authorized: false,
      error:
        "Akses ditolak: Kredensial webhook secret tidak valid atau tidak cocok.",
    };
  }

  return { authorized: true };
}

export interface IncomingWhatsAppPayload {
  sender?: string;
  message?: string;
  name?: string;
  device?: string;
  isgroup?: boolean;
  member?: string;
  inboxid?: number | string;
  [key: string]: unknown;
}

export interface BotReplyDecision {
  type: "greeting" | "closing" | "ai" | "ignored";
  replyText?: string;
  duration?: number;
  reason?: string;
}

// Regex pola sapaan dan penutup sesuai blueprint Make.com
export const GREETING_PATTERN = /^(halo|hai|hi|hello|hey|info|menu)$/i;
export const CLOSING_PATTERN =
  /^(cukup|terima kasih|makasih|thanks|ty|thank you)$/i;

const DEFAULT_GROQ_SYSTEM_PROMPT =
  "Kamu adalah asisten customer service yang ramah, sopan, dan solutif. Jawab pesan dalam bahasa Indonesia yang ringkas, natural, dan mudah dipahami.";

/**
 * Memanggil Groq OpenAI-compatible Chat Completions API
 */
export async function askGroqAi(
  userMessage: string,
  options?: {
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
  },
): Promise<string> {
  const apiKey =
    options?.apiKey ||
    process.env.GROQ_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY belum dikonfigurasi di environment variables.",
    );
  }

  const model = options?.model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const systemPrompt = options?.systemPrompt || DEFAULT_GROQ_SYSTEM_PROMPT;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Groq API merespons dengan HTTP ${res.status}: ${errorBody}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  const replyContent = data?.choices?.[0]?.message?.content;

  if (!replyContent || typeof replyContent !== "string") {
    throw new Error("Respon dari Groq API tidak memuat pesan teks yang valid.");
  }

  return replyContent.trim();
}

export interface BotIdentifierOptions {
  botPhone?: string;
  botLid?: string;
}

/**
 * Memeriksa apakah bot di-mention di dalam pesan grup.
 * HANYA merespons jika pesan secara spesifik me-mention:
 * 1. ID WhatsApp LID milik Bot (dari FONNTE_BOT_LID di env)
 * 2. Nomor telepon WhatsApp milik Bot (@6285187976800, @085187976800, dll.)
 * 3. Tag @bot
 *
 * Mention ke anggota grup lain (misal @235983186452529 atau @628111111111) akan diabaikan (false).
 */
export function isBotMentionedInGroup(
  message: string,
  identifiers?: BotIdentifierOptions | string,
): boolean {
  if (!message) return false;

  const botPhone =
    typeof identifiers === "string" ? identifiers : identifiers?.botPhone;
  const botLid =
    (typeof identifiers === "object"
      ? identifiers?.botLid
      : undefined) || process.env.FONNTE_BOT_LID;

  // 1. Cek kecocokan eksplisit dengan ID Bot (LID WhatsApp dari environment)
  if (botLid?.trim()) {
    const cleanedLid = botLid.trim().replace(/\D/g, "");
    if (cleanedLid) {
      const lidRegex = new RegExp(`@${cleanedLid}\\b`, "i");
      if (lidRegex.test(message)) return true;
    }
  }

  // 2. Cek kecocokan dengan nomor telepon bot jika ada
  if (botPhone?.trim()) {
    const cleanedDigits = botPhone.trim().replace(/\D/g, "");
    if (cleanedDigits) {
      const localFormat = cleanedDigits.startsWith("62")
        ? "0" + cleanedDigits.slice(2)
        : cleanedDigits;
      const noPrefix = cleanedDigits.startsWith("62")
        ? cleanedDigits.slice(2)
        : cleanedDigits.startsWith("0")
          ? cleanedDigits.slice(1)
          : cleanedDigits;

      const pattern = new RegExp(
        `@(?:${cleanedDigits}|${localFormat}|${noPrefix})\\b`,
        "i",
      );
      if (pattern.test(message)) return true;
    }
  }

  // 3. Cek tag @bot
  if (/@bot\b/i.test(message)) {
    return true;
  }

  // Jika tidak me-mention ID bot, nomor bot, atau @bot -> abaikan
  return false;
}

/**
 * Menghapus tag mention bot (@LID, @nomor, atau @bot) dari pesan teks
 * agar router sapaan/penutup dan prompt AI memproses isi pesan murni.
 */
export function removeBotMention(
  message: string,
  identifiers?: BotIdentifierOptions | string,
): string {
  if (!message) return "";

  const botPhone =
    typeof identifiers === "string" ? identifiers : identifiers?.botPhone;
  const botLid =
    (typeof identifiers === "object"
      ? identifiers?.botLid
      : undefined) || process.env.FONNTE_BOT_LID;

  let cleaned = message;

  // 1. Hapus mention LID bot
  if (botLid?.trim()) {
    const cleanedLid = botLid.trim().replace(/\D/g, "");
    if (cleanedLid) {
      cleaned = cleaned.replace(new RegExp(`@${cleanedLid}\\b`, "gi"), "");
    }
  }

  // 2. Hapus mention nomor telepon bot
  if (botPhone?.trim()) {
    const cleanedDigits = botPhone.trim().replace(/\D/g, "");
    if (cleanedDigits) {
      const localFormat = cleanedDigits.startsWith("62")
        ? "0" + cleanedDigits.slice(2)
        : cleanedDigits;
      const noPrefix = cleanedDigits.startsWith("62")
        ? cleanedDigits.slice(2)
        : cleanedDigits.startsWith("0")
          ? cleanedDigits.slice(1)
          : cleanedDigits;

      const pattern = new RegExp(
        `@(?:${cleanedDigits}|${localFormat}|${noPrefix})\\b`,
        "gi",
      );
      cleaned = cleaned.replace(pattern, "");
    }
  }

  // 3. Hapus tag @bot
  cleaned = cleaned.replace(/@bot\b/gi, "");

  return cleaned.trim();
}

/**
 * Menentukan isi pesan balasan bot berdasarkan aturan router blueprint
 */
export async function determineBotReply(
  payload: IncomingWhatsAppPayload,
  deps?: {
    askAiFn?: (msg: string) => Promise<string>;
  },
): Promise<BotReplyDecision> {
  const rawSender = payload.sender?.trim() || "";
  const rawMessage = payload.message?.trim() || "";
  const contactName = payload.name?.trim() || "";
  const isGroup = Boolean(payload.isgroup || rawSender.endsWith("@g.us"));

  // 1. Abaikan jika pesan kosong atau pengirim tidak tertera
  if (!rawSender || !rawMessage) {
    return {
      type: "ignored",
      reason: "Pesan atau pengirim kosong.",
    };
  }

  const botPhone = (
    payload.device ||
    process.env.FONNTE_BOT_PHONE ||
    process.env.FONNTE_TARGET_PHONE ||
    ""
  ).trim();
  const botLid = (process.env.FONNTE_BOT_LID || "").trim();
  const botIdentifiers: BotIdentifierOptions = { botPhone, botLid };



  // 2. Proteksi Anti-Looping: Abaikan jika pesan dikirim dari nomor bot itu sendiri
  if (botPhone) {
    const cleanedBot = botPhone.replace(/\D/g, "");
    // Kasus chat personal: rawSender adalah nomor bot
    if (!isGroup && rawSender.replace(/\D/g, "") === cleanedBot) {
      return {
        type: "ignored",
        reason: "Pesan berasal dari nomor bot sendiri (anti-loop).",
      };
    }
    // Kasus grup: payload.member adalah nomor pengirim di grup
    if (
      isGroup &&
      payload.member &&
      payload.member.replace(/\D/g, "") === cleanedBot
    ) {
      return {
        type: "ignored",
        reason: "Pesan grup berasal dari nomor bot sendiri (anti-loop).",
      };
    }
  }

  // 3. Khusus Pesan Grup: Hanya respon jika bot di-mention di dalam grup
  if (isGroup) {
    if (!isBotMentionedInGroup(rawMessage, botIdentifiers)) {
      return {
        type: "ignored",
        reason: "Pesan grup diabaikan karena bot tidak dimention.",
      };
    }
  }

  // Bersihkan mention bot dari pesan jika di grup
  const effectiveMessage = isGroup
    ? removeBotMention(rawMessage, botIdentifiers)
    : rawMessage;


  // Jika setelah mention dihapus tidak ada teks lagi (misal hanya tag @bot), beri balasan sapaan ramah
  if (!effectiveMessage) {
    const greetingName = contactName ? ` ${contactName}` : "";
    return {
      type: "greeting",
      replyText: `Hi kak${greetingName}, ada yg bisa dibantu?`,
      duration: 3,
    };
  }

  // 4. Route 1: Keyword Sapaan
  if (GREETING_PATTERN.test(effectiveMessage)) {
    const greetingName = contactName ? ` ${contactName}` : "";
    return {
      type: "greeting",
      replyText: `Hi kak${greetingName}, ada yg bisa dibantu?`,
      duration: 3,
    };
  }

  // 5. Route 2: Keyword Penutup
  if (CLOSING_PATTERN.test(effectiveMessage)) {
    const closingName = contactName ? ` ${contactName}` : "";
    return {
      type: "closing",
      replyText: `Ok, kak${closingName}`,
      duration: 3,
    };
  }

  // 6. Route 3: Tanya AI (Fallback)
  try {
    const askAi = deps?.askAiFn || askGroqAi;
    const aiResponse = await askAi(effectiveMessage);
    return {
      type: "ai",
      replyText: aiResponse,
      duration: 5,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("[Groq AI Error]:", errorMsg);
    return {
      type: "ignored",
      reason: `Gagal memproses AI: ${errorMsg}`,
    };
  }
}


/**
 * Mengirim pesan balasan WhatsApp via Fonnte API
 */
export async function sendFonnteReply(
  target: string,
  message: string,
  options?: {
    token?: string;
    duration?: number;
    inboxid?: number | string;
  },
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const token = (options?.token || process.env.FONNTE_TOKEN)
    ?.trim()
    .replace(/^["']|["']$/g, "");

  if (!token) {
    return {
      success: false,
      error: "FONNTE_TOKEN belum dikonfigurasi.",
    };
  }

  const normalizedTarget = normalizeWhatsAppTarget(target);
  const duration = options?.duration ?? 3;

  const formData = new FormData();
  formData.append("target", normalizedTarget);
  formData.append("message", message);
  formData.append("countryCode", "62");
  formData.append("typing", "true");
  formData.append("duration", String(duration));

  const rawInboxId = options?.inboxid;
  const parsedInboxId =
    typeof rawInboxId === "number"
      ? rawInboxId
      : typeof rawInboxId === "string"
        ? Number.parseInt(rawInboxId, 10)
        : undefined;

  if (parsedInboxId && !Number.isNaN(parsedInboxId) && parsedInboxId > 0) {
    formData.append("inboxid", String(parsedInboxId));
  }

  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
      signal: AbortSignal.timeout(10000),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok || (data && data.status === false)) {
      const errorMsg =
        data?.reason || `HTTP ${res.status}: Gagal mengirim balasan Fonnte.`;
      return { success: false, error: errorMsg, data };
    }

    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Menangani pemrosesan alur pesan webhook secara menyeluruh
 */
export async function handleIncomingWhatsAppWebhook(
  payload: IncomingWhatsAppPayload,
  deps?: {
    askAiFn?: (msg: string) => Promise<string>;
    sendReplyFn?: typeof sendFonnteReply;
  },
): Promise<{
  processed: boolean;
  decision: BotReplyDecision;
  sendResult?: { success: boolean; error?: string };
}> {
  const decision = await determineBotReply(payload, {
    askAiFn: deps?.askAiFn,
  });

  if (decision.type === "ignored" || !decision.replyText) {
    return {
      processed: false,
      decision,
    };
  }

  const sender = payload.sender?.trim() || "";
  const sendFn = deps?.sendReplyFn || sendFonnteReply;
  const sendResult = await sendFn(sender, decision.replyText, {
    duration: decision.duration,
    inboxid: payload.inboxid,
  });

  return {
    processed: true,
    decision,
    sendResult,
  };
}
