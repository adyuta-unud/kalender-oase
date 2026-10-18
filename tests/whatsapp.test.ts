import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDateWita,
  buildNewTasksMessage,
  normalizeWhatsAppTarget,
  sendWhatsAppNewTasksNotification,
} from "../lib/whatsapp.ts";
import type { OaseEvent } from "../types/calendar.ts";

test("WhatsApp: formatDateWita formats date to Indonesian WITA timezone", () => {
  // 2026-10-15T04:00:00Z -> 12:00 WITA (UTC+8)
  const date = new Date("2026-10-15T04:00:00Z");
  const result = formatDateWita(date);

  assert.ok(result.includes("WITA"), "Hasil harus mengandung WITA");
  assert.ok(result.includes("15"), "Hasil harus memuat tanggal 15");
  assert.ok(result.includes("Okt"), "Hasil harus memuat bulan Okt");
});

test("WhatsApp: buildNewTasksMessage builds correct markdown layout", () => {
  const sampleTasks: OaseEvent[] = [
    {
      uid: "task-1",
      summary: "Tugas 1: Machine Learning",
      cleanTitle: "Tugas 1: Machine Learning",
      description: "Kerjakan laporan praktikum",
      cleanDescription: "Kerjakan laporan praktikum",
      start: new Date("2026-10-20T15:59:00Z"),
      end: new Date("2026-10-20T15:59:00Z"),
      eventType: "assignment",
      courseName: "Kecerdasan Buatan",
      isDeadline: true,
      links: [
        {
          label: "OASE",
          url: "https://oase.unud.ac.id/mod/assign/view.php?id=123",
        },
      ],
    },
    {
      uid: "task-2",
      summary: "Kuis 2: ERD Database",
      cleanTitle: "Kuis 2: ERD Database",
      description: "Kuis online di OASE",
      cleanDescription: "Kuis online di OASE",
      start: new Date("2026-10-22T04:00:00Z"),
      end: new Date("2026-10-22T04:00:00Z"),
      eventType: "quiz",
      courseName: "Sistem Basis Data",
      isDeadline: true,
      links: [],
    },
  ];

  const message = buildNewTasksMessage(sampleTasks);

  assert.ok(
    message.includes("Tugas Baru OASE UNUD (Kelas A Informatika 2024)"),
    "Harus memiliki judul ringkas dengan info kelas",
  );
  assert.ok(
    message.includes("Tugas 1: Machine Learning"),
    "Harus memuat nama tugas 1",
  );
  assert.ok(
    message.includes("Kecerdasan Buatan"),
    "Harus memuat mata kuliah 1",
  );
  assert.ok(
    message.includes("Kuis 2: ERD Database"),
    "Harus memuat nama tugas 2",
  );
  assert.ok(
    message.includes("Sistem Basis Data"),
    "Harus memuat mata kuliah 2",
  );
  assert.ok(
    message.includes("https://oasee.vercel.app"),
    "Pesan harus memuat tautan web resmi oasee di bagian footer",
  );
});

test("WhatsApp: sendWhatsAppNewTasksNotification skips cleanly when no tasks or no config", async () => {
  // Kasus 1: Array kosong
  const resEmpty = await sendWhatsAppNewTasksNotification([]);
  assert.equal(resEmpty.sent, false);
  assert.equal(resEmpty.reason, "no_new_tasks");

  // Kasus 2: Ada task tapi kredensial kosong
  const sampleTask: OaseEvent = {
    uid: "task-1",
    summary: "Tugas Demo",
    cleanTitle: "Tugas Demo",
    description: "",
    cleanDescription: "",
    start: new Date(),
    end: new Date(),
    eventType: "assignment",
    courseName: "Informatika",
    isDeadline: true,
    links: [],
  };

  const resUnconfigured = await sendWhatsAppNewTasksNotification([sampleTask], {
    token: "",
    targetPhone: "",
  });

  assert.equal(resUnconfigured.sent, false);
  assert.equal(resUnconfigured.reason, "unconfigured");
});

test("WhatsApp: normalizeWhatsAppTarget correctly handles phone numbers and group IDs", () => {
  // Nomor HP biasa
  assert.equal(normalizeWhatsAppTarget("081234567890"), "6281234567890");
  assert.equal(normalizeWhatsAppTarget("6281234567890"), "6281234567890");
  assert.equal(normalizeWhatsAppTarget("+62 812-3456-7890"), "6281234567890");

  // Group ID WhatsApp (harus mempertahankan @g.us tanpa terpotong regex \D)
  const groupId = "120363429059412433@g.us";
  assert.equal(normalizeWhatsAppTarget(groupId), groupId);

  // Kombinasi HP + Grup
  const combined = normalizeWhatsAppTarget(
    "081234567890, 120363429059412433@g.us",
  );
  assert.equal(combined, "6281234567890,120363429059412433@g.us");
});

test("WhatsApp: sendWhatsAppNewTasksNotification sends to both personal phone and group with delay", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = "";
  let interceptedHeaders: Record<string, string> = {};
  let interceptedFormData: FormData | null = null;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    interceptedUrl = String(input);
    interceptedHeaders = (init?.headers as Record<string, string>) || {};
    interceptedFormData = (init?.body as FormData) || null;

    return new Response(
      JSON.stringify({
        status: true,
        target: ["6281234567890", "120363429059412433@g.us"],
        message: "success",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const sampleTask: OaseEvent = {
      uid: "task-group-1",
      summary: "Tugas Pengujian Grup",
      cleanTitle: "Tugas Pengujian Grup",
      description: "Deskripsi",
      cleanDescription: "Deskripsi",
      start: new Date("2026-10-25T10:00:00Z"),
      end: new Date("2026-10-25T10:00:00Z"),
      eventType: "assignment",
      courseName: "Sistem Terdistribusi",
      isDeadline: true,
      links: [],
    };

    const res = await sendWhatsAppNewTasksNotification([sampleTask], {
      token: "test-token-123",
      targetPhone: "081234567890",
      groupId: "120363429059412433@g.us",
    });

    assert.equal(res.sent, true);
    assert.equal(interceptedUrl, "https://api.fonnte.com/send");
    assert.equal(interceptedHeaders.Authorization, "test-token-123");
    assert.ok(interceptedFormData, "FormData harus dikirim");
    const sentFormData = interceptedFormData as FormData;
    assert.equal(
      sentFormData.get("target"),
      "6281234567890,120363429059412433@g.us",
      "Target harus memuat nomor pribadi dan ID grup",
    );
    assert.equal(sentFormData.get("typing"), "true");
    assert.equal(sentFormData.get("duration"), "5");
    assert.equal(sentFormData.get("connectOnly"), "false");
    assert.equal(sentFormData.get("preview"), "false");
    assert.equal(
      sentFormData.get("delay"),
      "3",
      "Harus ada delay 3s untuk multiple target",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("WhatsApp: sendWhatsAppNewTasksNotification sends only to personal phone when groupId is absent", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedFormData: FormData | null = null;

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    interceptedFormData = (init?.body as FormData) || null;
    return new Response(JSON.stringify({ status: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const sampleTask: OaseEvent = {
      uid: "task-single-1",
      summary: "Tugas Single",
      cleanTitle: "Tugas Single",
      description: "",
      cleanDescription: "",
      start: new Date(),
      end: new Date(),
      eventType: "assignment",
      courseName: "Basis Data",
      isDeadline: true,
      links: [],
    };

    const res = await sendWhatsAppNewTasksNotification([sampleTask], {
      token: "test-token-123",
      targetPhone: "081234567890",
    });

    assert.equal(res.sent, true);
    assert.ok(interceptedFormData);
    const sentFormData = interceptedFormData as FormData;
    assert.equal(sentFormData.get("target"), "6281234567890");
    // Tidak ada parameter delay jika target hanya 1 nomor
    assert.equal(sentFormData.get("delay"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
