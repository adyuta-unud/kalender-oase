import test from "node:test";
import assert from "node:assert/strict";
import {
  GREETING_PATTERN,
  CLOSING_PATTERN,
  determineBotReply,
  askGroqAi,
  sendFonnteReply,
  handleIncomingWhatsAppWebhook,
  validateWebhookSecret,
  isBotMentionedInGroup,
  removeBotMention,
} from "../lib/whatsapp-bot.ts";



test("WhatsApp Bot: GREETING_PATTERN matches standard greeting words", () => {
  const greetings = ["halo", "HAI", "Hi", "Hello", "hey", "info", "menu"];
  for (const word of greetings) {
    assert.ok(GREETING_PATTERN.test(word), `Harus mencocokkan: ${word}`);
  }

  assert.ok(!GREETING_PATTERN.test("halo apa kabar hari ini"), "Pola regex harus full match");
  assert.ok(!GREETING_PATTERN.test("terima kasih"));
});

test("WhatsApp Bot: CLOSING_PATTERN matches closing phrases", () => {
  const closings = ["cukup", "terima kasih", "Makasih", "THANKS", "ty", "thank you"];
  for (const word of closings) {
    assert.ok(CLOSING_PATTERN.test(word), `Harus mencocokkan: ${word}`);
  }

  assert.ok(!CLOSING_PATTERN.test("terima kasih banyak atas bantuannya"));
  assert.ok(!CLOSING_PATTERN.test("halo"));
});

test("WhatsApp Bot: determineBotReply handles Route 1 Greeting", async () => {
  const decision = await determineBotReply({
    sender: "6281234567890",
    message: "Halo",
    name: "Budi",
  });

  assert.equal(decision.type, "greeting");
  assert.equal(decision.replyText, "Hi kak Budi, ada yg bisa dibantu?");
  assert.equal(decision.duration, 3);
});

test("WhatsApp Bot: determineBotReply handles Route 2 Closing", async () => {
  const decision = await determineBotReply({
    sender: "6281234567890",
    message: "Terima Kasih",
    name: "Siti",
  });

  assert.equal(decision.type, "closing");
  assert.equal(decision.replyText, "Ok, kak Siti");
  assert.equal(decision.duration, 3);
});

test("WhatsApp Bot: determineBotReply handles Route 3 Fallback to AI", async () => {
  let askedPrompt = "";
  const mockAskAi = async (msg: string) => {
    askedPrompt = msg;
    return "Tugas praktikum dapat diakses di menu OASE.";
  };

  const decision = await determineBotReply(
    {
      sender: "6281234567890",
      message: "Bagaimana cara melihat tugas saya?",
      name: "Budi",
    },
    { askAiFn: mockAskAi }
  );

  assert.equal(decision.type, "ai");
  assert.equal(decision.replyText, "Tugas praktikum dapat diakses di menu OASE.");
  assert.equal(decision.duration, 5);
  assert.equal(askedPrompt, "Bagaimana cara melihat tugas saya?");
});

test("WhatsApp Bot: determineBotReply ignores empty messages or anti-loop", async () => {
  // Pesan kosong
  const resEmpty = await determineBotReply({
    sender: "6281234567890",
    message: "",
  });
  assert.equal(resEmpty.type, "ignored");

  // Anti-loop (sender sama dengan device nomor bot)
  const resSelf = await determineBotReply({
    sender: "6289999999999",
    device: "6289999999999",
    message: "Halo",
  });
  assert.equal(resSelf.type, "ignored");
});

test("WhatsApp Bot: askGroqAi throws error when GROQ_API_KEY is missing", async () => {
  const originalKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    await assert.rejects(
      async () => {
        await askGroqAi("Halo AI");
      },
      (err: Error) => err.message.includes("GROQ_API_KEY belum dikonfigurasi")
    );
  } finally {
    if (originalKey) process.env.GROQ_API_KEY = originalKey;
  }
});

test("WhatsApp Bot: sendFonnteReply submits valid multipart payload to Fonnte", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = "";
  let interceptedFormData: FormData | null = null;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    interceptedUrl = String(input);
    interceptedFormData = (init?.body as FormData) || null;
    return new Response(JSON.stringify({ status: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const res = await sendFonnteReply("081234567890", "Pesan uji coba", {
      token: "test-fonnte-token",
      duration: 5,
    });

    assert.equal(res.success, true);
    assert.equal(interceptedUrl, "https://api.fonnte.com/send");
    assert.ok(interceptedFormData);
    const fd = interceptedFormData as FormData;
    assert.equal(fd.get("target"), "6281234567890");
    assert.equal(fd.get("message"), "Pesan uji coba");
    assert.equal(fd.get("typing"), "true");
    assert.equal(fd.get("duration"), "5");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("WhatsApp Bot: handleIncomingWhatsAppWebhook handles complete execution flow", async () => {
  let sentTarget = "";
  let sentMessage = "";

  const mockSendReply: typeof sendFonnteReply = async (target: string, msg: string) => {
    sentTarget = target;
    sentMessage = msg;
    return { success: true };
  };

  const result = await handleIncomingWhatsAppWebhook(
    {
      sender: "6281234567890",
      message: "hi",
      name: "Andi",
    },
    { sendReplyFn: mockSendReply }
  );


  assert.equal(result.processed, true);
  assert.equal(result.decision.type, "greeting");
  assert.equal(sentTarget, "6281234567890");
  assert.equal(sentMessage, "Hi kak Andi, ada yg bisa dibantu?");
});

test("WhatsApp Bot: askGroqAi parses valid Groq OpenAI response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Halo, saya asisten AI Anda." } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const res = await askGroqAi("Halo AI", { apiKey: "dummy-key" });
    assert.equal(res, "Halo, saya asisten AI Anda.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("WhatsApp Webhook Secret: enforces secret authentication securely", () => {
  const configured = "super-secret-123";

  // 1. Kredensial kosong
  const resEmpty = validateWebhookSecret("", configured);
  assert.equal(resEmpty.authorized, false);
  assert.ok(resEmpty.error?.includes("tidak disertakan"));

  // 2. Kredensial salah
  const resWrong = validateWebhookSecret("kunci-palsu", configured);
  assert.equal(resWrong.authorized, false);
  assert.ok(resWrong.error?.includes("tidak valid"));

  // 3. Kredensial benar
  const resValid = validateWebhookSecret("super-secret-123", configured);
  assert.equal(resValid.authorized, true);

  // 4. Server belum dikonfigurasi
  const resUnconfigured = validateWebhookSecret("super-secret-123", "");
  assert.equal(resUnconfigured.authorized, false);
  assert.ok(resUnconfigured.error?.includes("belum lengkap"));
});

test("WhatsApp Group Mention: isBotMentionedInGroup detects mentions properly", () => {
  const botNumber = "6285123456789";

  // Mention dengan format 62...
  assert.equal(isBotMentionedInGroup("@6285123456789 halo", botNumber), true);
  // Mention dengan format 08...
  assert.equal(isBotMentionedInGroup("@085123456789 apa kabar?", botNumber), true);
  // Mention dengan tag @bot
  assert.equal(isBotMentionedInGroup("@bot tolong infokan jadwal", botNumber), true);
  // Pesan tanpa mention bot
  assert.equal(isBotMentionedInGroup("halo semua teman-teman", botNumber), false);
  // Mention nomor lain
  assert.equal(isBotMentionedInGroup("@628111111111 halo", botNumber), false);
});

test("WhatsApp Group Mention: removeBotMention cleans mention tags", () => {
  const botNumber = "6285123456789";
  assert.equal(removeBotMention("@6285123456789 Halo kak", botNumber), "Halo kak");
  assert.equal(removeBotMention("@bot kapan deadline tugas?", botNumber), "kapan deadline tugas?");
  assert.equal(removeBotMention("@085123456789", botNumber), "");
});

test("WhatsApp Group Reply: responds only when bot is mentioned in group", async () => {
  const groupJid = "120363429059412433@g.us";
  const botDevice = "6285123456789";

  // 1. Pesan grup TANPA mention bot -> HARUS DIABAIKAN (ignored)
  const resNoMention = await determineBotReply({
    sender: groupJid,
    isgroup: true,
    device: botDevice,
    member: "6281234567890",
    message: "Halo semuanya selamat pagi",
    name: "Rudi",
  });
  assert.equal(resNoMention.type, "ignored");
  assert.ok(resNoMention.reason?.includes("bot tidak dimention"));

  // 2. Pesan grup DENGAN mention bot untuk Sapaan -> HARUS DIBALAS (greeting)
  const resWithMention = await determineBotReply({
    sender: groupJid,
    isgroup: true,
    device: botDevice,
    member: "6281234567890",
    message: "@6285123456789 Halo",
    name: "Rudi",
  });
  assert.equal(resWithMention.type, "greeting");
  assert.equal(resWithMention.replyText, "Hi kak Rudi, ada yg bisa dibantu?");

  // 3. Pesan grup DENGAN mention bot untuk AI
  let aiCalled = false;
  const mockAi = async (msg: string) => {
    aiCalled = true;
    assert.equal(msg, "kapan deadline praktikum?");
    return "Deadline praktikum adalah hari Jumat pukul 23:59 WITA.";
  };

  const resAi = await determineBotReply(
    {
      sender: groupJid,
      isgroup: true,
      device: botDevice,
      member: "6281234567890",
      message: "@6285123456789 kapan deadline praktikum?",
      name: "Rudi",
    },
    { askAiFn: mockAi }
  );
  assert.equal(resAi.type, "ai");
  assert.equal(aiCalled, true);
  assert.equal(resAi.replyText, "Deadline praktikum adalah hari Jumat pukul 23:59 WITA.");

  // 4. Anti-loop di grup: Pesan yang dikirim oleh nomor bot sendiri di dalam grup harus diabaikan
  const resSelfInGroup = await determineBotReply({
    sender: groupJid,
    isgroup: true,
    device: botDevice,
    member: botDevice,
    message: "@6285123456789 halo",
  });
  assert.equal(resSelfInGroup.type, "ignored");
  assert.ok(resSelfInGroup.reason?.includes("anti-loop"));
});


