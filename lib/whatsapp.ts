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
 * Membentuk pesan WhatsApp yang rapi dan terstruktur untuk daftar tugas baru
 */
export function buildNewTasksMessage(tasks: OaseEvent[]): string {
  const taskCount = tasks.length;
  const countText = taskCount === 1 ? "1 tugas baru" : `${taskCount} tugas baru`;

  const taskList = tasks
    .map((task, index) => {
      const deadlineStr = formatDateWita(task.start);
      const course = task.courseName ? task.courseName : "Tidak tercantum";
      const taskLink =
        task.links && task.links.length > 0 && task.links[0]?.url
          ? task.links[0].url
          : "https://oase.unud.ac.id";

      return [
        `*${index + 1}. ${task.summary}*`,
        `   📚 *Mata Kuliah:* ${course}`,
        `   ⏰ *Batas Waktu:* ${deadlineStr}`,
        `   🔗 *Link Tugas:* ${taskLink}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `🔔 *PEMBERITAHUAN TUGAS BARU OASE UNUD*`,
    ``,
    `Halo! Sinkronisasi otomatis mendeteksi ada *${countText}* yang baru saja ditambahkan ke Google Calendar Anda:`,
    ``,
    taskList,
    ``,
    `📅 _Pengingat (1 hari, 2 jam, dan 30 menit) telah otomatis disetel di Google Calendar._`,
  ].join("\n");
}

export interface WhatsAppSendResult {
  sent: boolean;
  reason?: string;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/**
 * Mengirimkan pesan WhatsApp ke nomor pengguna via Fonnte API jika ada tugas baru
 */
export async function sendWhatsAppNewTasksNotification(
  newTasks: OaseEvent[],
  options?: {
    token?: string;
    targetPhone?: string;
  }
): Promise<WhatsAppSendResult> {
  // Jika tidak ada tugas baru, tidak perlu mengirim pesan
  if (!newTasks || newTasks.length === 0) {
    return { sent: false, reason: "no_new_tasks" };
  }

  const token = (options?.token || process.env.FONNTE_TOKEN)?.trim().replace(/^["']|["']$/g, "");
  const targetPhone = (options?.targetPhone || process.env.FONNTE_TARGET_PHONE)?.trim().replace(/^["']|["']$/g, "");

  // Jika kredensial belum disetel di environment variables, lewati secara halus
  if (!token || !targetPhone) {
    return {
      sent: false,
      reason: "unconfigured",
    };
  }

  const message = buildNewTasksMessage(newTasks);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: targetPhone,
        message,
        countryCode: "62",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok || (data && data.status === false)) {
      const errorMsg = data?.reason || `HTTP ${res.status}: Gagal mengirim via Fonnte`;
      console.warn("[Fonnte WhatsApp Warning]:", errorMsg);
      return {
        sent: false,
        error: errorMsg,
        data,
      };
    }

    console.info(`[Fonnte WhatsApp]: Berhasil mengirim notifikasi ${newTasks.length} tugas baru ke ${targetPhone}`);
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
