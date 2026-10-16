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
  const botNumber = "6285187976800";
  const botLid = "127020117803175";
  const identifiers = { botPhone: botNumber, botLid };

  // 1. Mention dengan WhatsApp LID bot @127020117803175 -> HARUS TRUE
  assert.equal(
    isBotMentionedInGroup("@127020117803175 apa nama model AI anda?", identifiers),
    true
  );

  // 2. Mention LID orang lain (misal Oka @235983186452529) -> HARUS FALSE (tidak membalas)
  assert.equal(
    isBotMentionedInGroup("@235983186452529 halo Oka", identifiers),
    false
  );

  // 3. Mention nomor bot (@6285187976800 atau @085187976800) -> HARUS TRUE
  assert.equal(isBotMentionedInGroup("@6285187976800 halo", identifiers), true);
  assert.equal(isBotMentionedInGroup("@085187976800 apa kabar?", identifiers), true);

  // 4. Mention tag @bot -> HARUS TRUE
  assert.equal(isBotMentionedInGroup("@bot tolong infokan jadwal", identifiers), true);

  // 5. Mention nomor orang lain (@628111111111) -> HARUS FALSE
  assert.equal(isBotMentionedInGroup("@628111111111 halo", identifiers), false);

  // 6. Pesan biasa tanpa mention -> HARUS FALSE
  assert.equal(isBotMentionedInGroup("halo semua teman-teman", identifiers), false);
});

test("WhatsApp Group Mention: removeBotMention cleans mention tags", () => {
  const identifiers = { botPhone: "6285187976800", botLid: "127020117803175" };
  assert.equal(
    removeBotMention("@127020117803175 apa nama model AI anda?", identifiers),
    "apa nama model AI anda?"
  );
  assert.equal(removeBotMention("@6285187976800 Halo kak", identifiers), "Halo kak");
  assert.equal(removeBotMention("@bot kapan deadline tugas?", identifiers), "kapan deadline tugas?");
  assert.equal(removeBotMention("@085187976800", identifiers), "");

  // Jangan menghapus mention orang lain
  assert.equal(
    removeBotMention("halo @235983186452529 apa kabar?", identifiers),
    "halo @235983186452529 apa kabar?"
  );
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

test("WhatsApp Group Real Webhook: handles user exact LID mention and non-mention payloads", async () => {
  const originalBotLid = process.env.FONNTE_BOT_LID;
  process.env.FONNTE_BOT_LID = "127020117803175";

  try {
    // Contoh 1: Payload DIMENTION dari webhook nyata Fonnte
    const mentionPayload = {
      choices: [],
      device: "6285187976800",
      extension: "",
      filename: "",
      inboxid: 0,
      isforwarded: false,
      isgroup: true,
      location: "",
      member: "6285805945279",
      memberlid: "235983186452529@lid",
      message: "@127020117803175 apa nama model AI anda?",
      mode: "lid",
      name: "Oka",
      pengirim: "120363410925013058@g.us",
      pesan: "@127020117803175 apa nama model AI anda?",
      pollname: "",
      pushname: "Oka",
      quick: false,
      sender: "120363410925013058@g.us",
      senderlid: "120363410925013058@g.us",
      text: "non-button message",
      timestamp: 1792133166,
      type: "text",
      url: "",
      username: "6285805945279",
    };

    let cleanedAiPrompt = "";
    let targetSent = "";
    let messageSent = "";

    const mockAi = async (msg: string) => {
      cleanedAiPrompt = msg;
      return "Saya ditenagai oleh model AI Qwen.";
    };

    const mockSendReply = async (target: string, msg: string) => {
      targetSent = target;
      messageSent = msg;
      return { success: true };
    };

    const resMentioned = await handleIncomingWhatsAppWebhook(mentionPayload, {
      askAiFn: mockAi,
      sendReplyFn: mockSendReply as typeof sendFonnteReply,
    });

    assert.equal(resMentioned.processed, true, "Pesan grup dengan mention harus diproses");
    assert.equal(resMentioned.decision.type, "ai");
    assert.equal(
      cleanedAiPrompt,
      "apa nama model AI anda?",
      "Tag LID @127020117803175 harus dibersihkan dari prompt AI"
    );
    assert.equal(targetSent, "120363410925013058@g.us", "Balasan harus dikirim ke grup target");
    assert.equal(messageSent, "Saya ditenagai oleh model AI Qwen.");

    // Contoh 2: Payload TIDAK DIMENTION dari webhook nyata Fonnte
    const noMentionPayload = {
      choices: [],
      device: "6285187976800",
      extension: "",
      filename: "",
      inboxid: 0,
      isforwarded: false,
      isgroup: true,
      location: "",
      member: "6285805945279",
      memberlid: "235983186452529@lid",
      message: "halo guys",
      mode: "lid",
      name: "Oka",
      pengirim: "120363410925013058@g.us",
      pesan: "halo guys",
      pollname: "",
      pushname: "Oka",
      quick: false,
      sender: "120363410925013058@g.us",
      senderlid: "120363410925013058@g.us",
      text: "non-button message",
      timestamp: 1792132799,
      type: "text",
      url: "",
      username: "6285805945279",
    };

    const resNotMentioned = await handleIncomingWhatsAppWebhook(noMentionPayload);
    assert.equal(
      resNotMentioned.processed,
      false,
      "Pesan grup tanpa mention harus diabaikan dan tidak dibalas"
    );
    assert.equal(resNotMentioned.decision.type, "ignored");
  } finally {
    process.env.FONNTE_BOT_LID = originalBotLid;
  }
});



