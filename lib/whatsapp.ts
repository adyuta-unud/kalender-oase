import type { OaseEvent } from "../types/calendar.ts";

/**
 * Format tanggal ke format lokal Indonesia dan zona waktu WITA (Asia/Makassar)
 */
export function formatDateWita(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${formatter.format(date)} WITA`;
  } catch {
    return date.toLocaleString("id-ID") + " WITA";
  }
}

/**
/**
 * Membentuk pesan WhatsApp yang ringkas, minimalis, dan bebas link (anti-spam)
 */
export function buildNewTasksMessage(tasks: OaseEvent[]): string {
  const taskCount = tasks.length;
  const footerNote = `_Jika jadwal tidak sesuai dengan kelas/prodi/jurusan Anda, jadwal bisa dicek dan disinkronkan ke Google Calendar melalui web ini: https://oasee.vercel.app_`;

  const taskList = tasks
    .map((task, index) => {
      const deadlineStr = formatDateWita(task.start);
      const course = task.courseName ? task.courseName : "Tidak tercantum";
      const prefix = taskCount > 1 ? `${index + 1}. ` : "• ";

      return [
        `${prefix}*${task.summary}*`,
        `   📚 ${course}`,
        `   ⏰ ${deadlineStr}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `*Tugas Baru OASE UNUD (Kelas A Informatika 2024)*`,
    ``,
    `Tersinkron ke Google Calendar:`,
    ``,
    taskList,
    ``,
    `_Pembaruan: ${formatDateWita(new Date())}_`,
    ``,
    footerNote,
  ].join("\n");
}

/**
 * Normalisasi daftar target WhatsApp (mendukung nomor HP Indonesia & ID Grup WhatsApp)
 */
export function normalizeWhatsAppTarget(input: string): string {
  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const normalizedParts = parts.map((part) => {
    // Jika merupakan Group ID atau memuat @ (misal: 120363429059412433@g.us)
    if (part.includes("@")) {
      return part;
    }
    // Jika nomor telepon biasa
    let cleaned = part.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    }
    return cleaned;
  });

  return Array.from(new Set(normalizedParts)).join(",");
}

export interface WhatsAppSendResult {
  sent: boolean;
  reason?: string;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/**
 * Mengirimkan pesan WhatsApp ke nomor pengguna dan/atau grup via Fonnte API jika ada tugas baru
 */
export async function sendWhatsAppNewTasksNotification(
  newTasks: OaseEvent[],
  options?: {
    token?: string;
    targetPhone?: string;
    groupId?: string;
  },
): Promise<WhatsAppSendResult> {
  // Jika tidak ada tugas baru, tidak perlu mengirim pesan
  if (!newTasks || newTasks.length === 0) {
    return { sent: false, reason: "no_new_tasks" };
  }

  const token = (options?.token || process.env.FONNTE_TOKEN)
    ?.trim()
    .replace(/^["']|["']$/g, "");

  const rawPhone = (
    options?.targetPhone !== undefined
      ? options.targetPhone
      : process.env.FONNTE_TARGET_PHONE
  )
    ?.trim()
    .replace(/^["']|["']$/g, "");

  // ID Grup WhatsApp (opsional via parameter atau process.env.FONNTE_GROUP_ID)
  const rawGroup = (
    options?.groupId !== undefined
      ? options.groupId
      : process.env.FONNTE_GROUP_ID
  )
    ?.trim()
    .replace(/^["']|["']$/g, "");

  const targetList: string[] = [];
  if (rawPhone) {
    targetList.push(rawPhone);
  }
  if (rawGroup && rawGroup !== "false" && rawGroup !== "none") {
    targetList.push(rawGroup);
  }

  // Jika kredensial belum disetel di environment variables atau target kosong
  if (!token || targetList.length === 0) {
    return {
      sent: false,
      reason: "unconfigured",
    };
  }

  const combinedTarget = normalizeWhatsAppTarget(targetList.join(","));
  const message = buildNewTasksMessage(newTasks);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const formData = new FormData();
    formData.append("target", combinedTarget);
    formData.append("message", message);
    formData.append("countryCode", "62");
    // Simulasi pengetikan alami di WhatsApp untuk menghindari deteksi spam/bot
    formData.append("typing", "true");
    // Durasi mengetik 3 detik agar terlihat wajar dan natural
    formData.append("duration", "3");

    // Jika mengirim ke beberapa target (misal personal & grup), tambahkan jeda delay 2 detik antar target
    if (combinedTarget.includes(",")) {
      formData.append("delay", "2");
    }

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok || (data && data.status === false)) {
      const errorMsg =
        data?.reason || `HTTP ${res.status}: Gagal mengirim via Fonnte`;
      console.warn("[Fonnte WhatsApp Warning]:", errorMsg);
      return {
        sent: false,
        error: errorMsg,
        data,
      };
    }

    console.info(
      `[Fonnte WhatsApp]: Berhasil mengirim notifikasi ${newTasks.length} tugas baru ke ${combinedTarget}`,
    );
    return {
      sent: true,
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("[Fonnte WhatsApp Error]:", errorMsg);
    return {
      sent: false,
      error: errorMsg,
    };
  }
}
