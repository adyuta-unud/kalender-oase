import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDateWita,
  buildNewTasksMessage,
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
      links: [{ label: "OASE", url: "https://oase.unud.ac.id/mod/assign/view.php?id=123" }],
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

  assert.ok(message.includes("PEMBERITAHUAN TUGAS BARU OASE UNUD"), "Harus memiliki judul");
  assert.ok(message.includes("2 tugas baru"), "Harus menyebutkan jumlah tugas");
  assert.ok(message.includes("Tugas 1: Machine Learning"), "Harus memuat nama tugas 1");
  assert.ok(message.includes("Kecerdasan Buatan"), "Harus memuat mata kuliah 1");
  assert.ok(message.includes("Kuis 2: ERD Database"), "Harus memuat nama tugas 2");
  assert.ok(message.includes("Sistem Basis Data"), "Harus memuat mata kuliah 2");
  assert.ok(message.includes("https://oase.unud.ac.id/mod/assign/view.php?id=123"), "Harus menyertakan link tugas");
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
