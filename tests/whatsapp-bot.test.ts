import test from "node:test";
import assert from "node:assert/strict";
import {
  GREETING_PATTERN,
  CLOSING_PATTERN,
  OASE_SCHEDULE_PATTERN,
  determineBotReply,
  buildUpcomingTasksMessage,
  askGroqAi,
  getGroqApiKeys,
  getNextGroqApiKey,
  resetGroqKeyIndex,
  sendFonnteReply,
  handleIncomingWhatsAppWebhook,
  validateWebhookSecret,
  isBotMentionedInGroup,
  removeBotMention,
} from "../lib/whatsapp-bot.ts";

test("WhatsApp Bot: GREETING_PATTERN matches standard and extended greeting words", () => {
  const greetings = [
    "halo",
    "HAI",
    "Hi",
    "Hello",
    "hey",
    "hei",
    "p",
    "ping",
    "tes",
    "test",
    "assalamualaikum",
    "assalamu'alaikum",
    "selamat pagi",
    "pagi",
    "selamat siang",
    "selamat sore",
    "selamat malam",
    "menu",
    "help",
    "bantuan",
    "info",
  ];
  for (const word of greetings) {
    assert.ok(GREETING_PATTERN.test(word), `Harus mencocokkan: ${word}`);
  }

  assert.ok(!GREETING_PATTERN.test("halo apa kabar hari ini"), "Pola regex sapaan harus exact");
  assert.ok(!GREETING_PATTERN.test("kapan deadline tugas?"));
});

test("WhatsApp Bot: CLOSING_PATTERN matches extended closing phrases", () => {
  const closings = [
    "cukup",
    "terima kasih",
    "Makasih",
    "THANKS",
    "ty",
    "thank you",
    "ok",
    "oke",
    "sip",
    "siap",
    "mantap",
    "mantul",
    "bye",
    "dadah",
  ];
  for (const word of closings) {
    assert.ok(CLOSING_PATTERN.test(word), `Harus mencocokkan: ${word}`);
  }

  assert.ok(!CLOSING_PATTERN.test("terima kasih banyak atas bantuannya"));
  assert.ok(!CLOSING_PATTERN.test("tugas oase"));
});

test("WhatsApp Bot: OASE_SCHEDULE_PATTERN matches schedule and task check keywords", () => {
  const queries = [
    "cek tugas",
    "ada tugas apa?",
    "deadline",
    "tugas oase",
    "info deadline minggu ini",
    "jadwal oase",
    "jadwal kuliah",
    "apa ada pr?",
    "kuis oase",
    "jadwal praktikum",
  ];
  for (const q of queries) {
    assert.ok(OASE_SCHEDULE_PATTERN.test(q), `Harus mencocokkan query: ${q}`);
  }

  assert.ok(!OASE_SCHEDULE_PATTERN.test("siapa nama penciptamu?"));
  assert.ok(!OASE_SCHEDULE_PATTERN.test("ceritakan lelucon"));
});

test("WhatsApp Bot: buildUpcomingTasksMessage formats task lists and empty states cleanly", () => {
  // 1. Kasus daftar tugas terisi
  const sampleTasks = [
    {
      summary: "Tugas 1: Analisis Sistem",
      courseName: "Rekayasa Perangkat Lunak",
      deadline: new Date("2026-10-25T15:00:00+08:00"),
    },
  ];
  const msgFilled = buildUpcomingTasksMessage(sampleTasks, "Oka");
  assert.ok(msgFilled.includes("Daftar Tugas & Deadline OASE Mendatang"));
  assert.ok(msgFilled.includes("Tugas 1: Analisis Sistem"));
  assert.ok(msgFilled.includes("Rekayasa Perangkat Lunak"));
  assert.ok(msgFilled.includes("kak Oka"));

  // 2. Kasus daftar tugas kosong
  const msgEmpty = buildUpcomingTasksMessage([], "Oka");
  assert.ok(msgEmpty.includes("Tidak ada tugas atau deadline OASE aktif"));
  assert.ok(msgEmpty.includes("kak Oka"));
});

test("WhatsApp Bot: determineBotReply handles Route 1 Greeting with helpful menu", async () => {
  const decision = await determineBotReply({
    sender: "6281234567890",
    message: "Halo",
    name: "Budi",
  });

  assert.equal(decision.type, "greeting");
  assert.ok(decision.replyText?.includes("Halo kak Budi!"));
  assert.ok(decision.replyText?.includes("cek tugas"));
  assert.equal(decision.duration, 3);
});

test("WhatsApp Bot: determineBotReply handles Route 2 Closing warmly", async () => {
  const decision = await determineBotReply({
    sender: "6281234567890",
    message: "Terima Kasih",
    name: "Siti",
  });

  assert.equal(decision.type, "closing");
  assert.ok(decision.replyText?.includes("Sama-sama kak Siti!"));
  assert.equal(decision.duration, 3);
});

test("WhatsApp Bot: determineBotReply handles Route 3 OASE tasks from Google Calendar", async () => {
  // 1. Kasus ada tugas aktif
  const mockTasks = [
    {
      id: "task-1",
      summary: "Tugas 4: Integrasi Webhook",
      courseName: "Pemrograman Web",
      deadline: new Date("2026-10-20T23:59:00+08:00"),
    },
    {
      id: "task-2",
      summary: "Kuis 2: Normalisasi",
      courseName: "Basis Data",
      deadline: new Date("2026-10-22T12:00:00+08:00"),
    },
  ];

  const mockGetTasks = async () => ({
    calendarFound: true,
    tasks: mockTasks,
  });

  const decisionWithTasks = await determineBotReply(
    {
      sender: "6281234567890",
      message: "cek tugas",
      name: "Oka",
    },
    { getUpcomingTasksFn: mockGetTasks }
  );

  assert.equal(decisionWithTasks.type, "tasks");
  assert.ok(decisionWithTasks.replyText?.includes("Daftar Tugas & Deadline OASE Mendatang"));
  assert.ok(decisionWithTasks.replyText?.includes("Tugas 4: Integrasi Webhook"));
  assert.ok(decisionWithTasks.replyText?.includes("Pemrograman Web"));

  // 2. Kasus tidak ada tugas / tugas sudah selesai
  const mockGetEmptyTasks = async () => ({
    calendarFound: true,
    tasks: [],
  });

  const decisionEmpty = await determineBotReply(
    {
      sender: "6281234567890",
      message: "apakah ada deadline?",
      name: "Oka",
    },
    { getUpcomingTasksFn: mockGetEmptyTasks }
  );

  assert.equal(decisionEmpty.type, "tasks");
  assert.ok(decisionEmpty.replyText?.includes("Tidak ada tugas atau deadline OASE aktif"));

  // 3. Kasus error Google Calendar (misal token belum diset)
  const mockGetErrorTasks = async () => {
    throw new Error("GOOGLE_REFRESH_TOKEN belum disetel.");
  };

  const decisionError = await determineBotReply(
    {
      sender: "6281234567890",
      message: "jadwal oase",
      name: "Oka",
    },
    { getUpcomingTasksFn: mockGetErrorTasks }
  );

  assert.equal(decisionError.type, "tasks");
  assert.ok(decisionError.replyText?.includes("Tidak dapat memuat jadwal tugas"));
  assert.ok(decisionError.replyText?.includes("GOOGLE_REFRESH_TOKEN belum disetel"));
});

test("WhatsApp Bot: determineBotReply handles Route 4 Fallback to AI", async () => {
  let askedPrompt = "";
  const mockAskAi = async (msg: string) => {
    askedPrompt = msg;
    return "Universitas Udayana berlokasi di Bali, Indonesia.";
  };

  const decision = await determineBotReply(
    {
      sender: "6281234567890",
      message: "Di mana lokasi kampus Universitas Udayana?",
      name: "Budi",
    },
    { askAiFn: mockAskAi }
  );

  assert.equal(decision.type, "ai");
  assert.equal(decision.replyText, "Universitas Udayana berlokasi di Bali, Indonesia.");
  assert.equal(decision.duration, 5);
  assert.equal(askedPrompt, "Di mana lokasi kampus Universitas Udayana?");
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
    delete process.env.GROQ_API_KEYS;
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

test("WhatsApp Bot: getGroqApiKeys parses single, multiple, and cleans whitespace", () => {
  const originalKeys = process.env.GROQ_API_KEYS;
  const originalKey = process.env.GROQ_API_KEY;

  try {
    delete process.env.GROQ_API_KEYS;
    process.env.GROQ_API_KEY = " gsk_key1 , 'gsk_key2' , \"gsk_key3\" ";
    const parsed = getGroqApiKeys();
    assert.deepEqual(parsed, ["gsk_key1", "gsk_key2", "gsk_key3"]);

    process.env.GROQ_API_KEYS = "gsk_customA, gsk_customB";
    const parsedMulti = getGroqApiKeys();
    assert.deepEqual(parsedMulti, ["gsk_customA", "gsk_customB"]);
  } finally {
    if (originalKeys) process.env.GROQ_API_KEYS = originalKeys;
    else delete process.env.GROQ_API_KEYS;
    if (originalKey) process.env.GROQ_API_KEY = originalKey;
    else delete process.env.GROQ_API_KEY;
  }
});

test("WhatsApp Bot: getNextGroqApiKey performs circular Round Robin rotation", () => {
  const originalKeys = process.env.GROQ_API_KEYS;
  try {
    process.env.GROQ_API_KEYS = "key1,key2,key3";
    resetGroqKeyIndex();

    assert.equal(getNextGroqApiKey(), "key1");
    assert.equal(getNextGroqApiKey(), "key2");
    assert.equal(getNextGroqApiKey(), "key3");
    // Rotasi kembali ke key pertama
    assert.equal(getNextGroqApiKey(), "key1");
    assert.equal(getNextGroqApiKey(), "key2");
  } finally {
    if (originalKeys) process.env.GROQ_API_KEYS = originalKeys;
    else delete process.env.GROQ_API_KEYS;
    resetGroqKeyIndex();
  }
});

test("WhatsApp Bot: askGroqAi rotates keys and retries next key on 429 rate limit", async () => {
  const originalKeys = process.env.GROQ_API_KEYS;
  const originalFetch = globalThis.fetch;
  const usedKeys: string[] = [];

  process.env.GROQ_API_KEYS = "key-rate-limited,key-healthy";
  resetGroqKeyIndex();

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const authHeader = (init?.headers as Record<string, string>)?.Authorization || "";
    const key = authHeader.replace("Bearer ", "");
    usedKeys.push(key);

    if (key === "key-rate-limited") {
      return new Response(JSON.stringify({ error: { message: "Rate limit reached (429)" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Respon sukses dari key-healthy." } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const reply = await askGroqAi("Halo AI");
    assert.equal(reply, "Respon sukses dari key-healthy.");
    assert.deepEqual(usedKeys, ["key-rate-limited", "key-healthy"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKeys) process.env.GROQ_API_KEYS = originalKeys;
    else delete process.env.GROQ_API_KEYS;
    resetGroqKeyIndex();
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
      inboxid: 235729608,
    });

    assert.equal(res.success, true);
    assert.equal(interceptedUrl, "https://api.fonnte.com/send");
    assert.ok(interceptedFormData);
    const fd = interceptedFormData as FormData;
    assert.equal(fd.get("target"), "6281234567890");
    assert.equal(fd.get("message"), "Pesan uji coba");
    assert.equal(fd.get("typing"), "true");
    assert.equal(fd.get("duration"), "5");
    assert.equal(fd.get("inboxid"), "235729608");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("WhatsApp Bot: handleIncomingWhatsAppWebhook handles complete execution flow", async () => {
  let sentTarget = "";
  let sentMessage = "";
  let capturedOpts: { duration?: number; inboxid?: number | string } | undefined;

  const mockSendReply = async (
    target: string,
    msg: string,
    opts?: { duration?: number; inboxid?: number | string }
  ) => {
    sentTarget = target;
    sentMessage = msg;
    capturedOpts = opts;
    return { success: true };
  };

  const result = await handleIncomingWhatsAppWebhook(
    {
      sender: "6281234567890",
      message: "hi",
      name: "Andi",
      inboxid: 998877,
    },
    { sendReplyFn: mockSendReply as typeof sendFonnteReply }
  );

  assert.equal(result.processed, true);
  assert.equal(result.decision.type, "greeting");
  assert.equal(sentTarget, "6281234567890");
  assert.ok(sentMessage.includes("Halo kak Andi!"));
  assert.ok(sentMessage.includes("cek tugas"));
  assert.equal(capturedOpts?.inboxid, 998877, "inboxid pada chat personal harus diteruskan untuk quoted reply");
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
  assert.ok(resWithMention.replyText?.includes("Halo kak Rudi!"));
  assert.ok(resWithMention.replyText?.includes("cek tugas"));

  // 3. Pesan grup DENGAN mention bot untuk Cek Tugas (Route 3)
  const mockTasks = [
    {
      id: "task-group",
      summary: "Tugas Besar Arsitektur Komputer",
      courseName: "Arsitektur Komputer",
      deadline: new Date("2026-10-25T23:59:00+08:00"),
    },
  ];

  const resGroupTask = await determineBotReply(
    {
      sender: groupJid,
      isgroup: true,
      device: botDevice,
      member: "6281234567890",
      message: "@6285123456789 cek tugas",
      name: "Rudi",
    },
    {
      getUpcomingTasksFn: async () => ({
        calendarFound: true,
        tasks: mockTasks,
      }),
    }
  );
  assert.equal(resGroupTask.type, "tasks");
  assert.ok(resGroupTask.replyText?.includes("Tugas Besar Arsitektur Komputer"));

  // 4. Pesan grup DENGAN mention bot untuk AI (Route 4)
  let aiCalled = false;
  const mockAi = async (msg: string) => {
    aiCalled = true;
    assert.equal(msg, "apa nama model AI anda?");
    return "Saya ditenagai oleh model AI Qwen.";
  };

  const resAi = await determineBotReply(
    {
      sender: groupJid,
      isgroup: true,
      device: botDevice,
      member: "6281234567890",
      message: "@6285123456789 apa nama model AI anda?",
      name: "Rudi",
    },
    { askAiFn: mockAi }
  );
  assert.equal(resAi.type, "ai");
  assert.equal(aiCalled, true);
  assert.equal(resAi.replyText, "Saya ditenagai oleh model AI Qwen.");

  // 5. Anti-loop di grup: Pesan yang dikirim oleh nomor bot sendiri di dalam grup harus diabaikan
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
    // Contoh 1: Payload DIMENTION dari webhook nyata Fonnte (dengan inboxid)
    const mentionPayload = {
      choices: [],
      device: "6285187976800",
      extension: "",
      filename: "",
      inboxid: 235729608,
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
    let capturedOptions: { duration?: number; inboxid?: number | string } | undefined;

    const mockAi = async (msg: string) => {
      cleanedAiPrompt = msg;
      return "Saya ditenagai oleh model AI Qwen.";
    };

    const mockSendReply = async (
      target: string,
      msg: string,
      opts?: { duration?: number; inboxid?: number | string }
    ) => {
      targetSent = target;
      messageSent = msg;
      capturedOptions = opts;
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
    assert.equal(
      capturedOptions?.inboxid,
      235729608,
      "inboxid harus diteruskan agar bot mereply pesan spesifik (quoted reply)"
    );

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



