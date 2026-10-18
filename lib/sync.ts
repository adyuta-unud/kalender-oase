import { google, type calendar_v3 } from "googleapis";
import type { SyncOptions, SyncResult } from "../types/calendar.ts";
import { getAuthenticatedOAuth2Client } from "./google.ts";
import { convertMoodleTasksToOaseEvents } from "./moodle.ts";
import { fetchPendingOaseTasks } from "./oase-auth.ts";
import {
  buildEventDescription,
  buildReminderOverrides,
  isEventChanged,
} from "./diff.ts";

export { isEventChanged };

const DEDICATED_CALENDAR_NAME = "OASE UNUD - Akademik";
const DEDICATED_CALENDAR_DESC =
  "Kalender sinkronisasi jadwal tugas, kuis, dan ujian OASE Universitas Udayana.";

/**
 * Mencari atau membuat kalender khusus OASE di akun Google Calendar pengguna
 */
export async function getOrCreateDedicatedCalendar(
  calendar: calendar_v3.Calendar,
): Promise<{ id: string; summary: string }> {
  // Ambil daftar kalender pengguna
  const calendarList = await calendar.calendarList.list({
    minAccessRole: "writer",
  });
  const items = calendarList.data.items || [];

  const existingCalendar = items.find(
    (cal) =>
      cal.summary?.trim().toLowerCase() ===
      DEDICATED_CALENDAR_NAME.toLowerCase(),
  );

  if (existingCalendar && existingCalendar.id) {
    return {
      id: existingCalendar.id,
      summary: existingCalendar.summary || DEDICATED_CALENDAR_NAME,
    };
  }

  // Jika belum ada, buat kalender baru
  const newCal = await calendar.calendars.insert({
    requestBody: {
      summary: DEDICATED_CALENDAR_NAME,
      description: DEDICATED_CALENDAR_DESC,
      timeZone: "Asia/Makassar", // Default zona waktu Bali (WITA)
    },
  });

  if (!newCal.data.id) {
    throw new Error("Gagal membuat kalender khusus di Google Calendar.");
  }

  return {
    id: newCal.data.id,
    summary: newCal.data.summary || DEDICATED_CALENDAR_NAME,
  };
}

/**
 * Eksekusi proses sinkronisasi daftar tugas aktif OASE ke Google Calendar
 */
export async function syncOaseToGoogleCalendar(
  options: SyncOptions,
  explicitOAuth2Client?: InstanceType<typeof google.auth.OAuth2>,
): Promise<SyncResult> {
  const oauth2Client =
    explicitOAuth2Client || (await getAuthenticatedOAuth2Client());
  if (!oauth2Client) {
    throw new Error(
      "Pengguna belum terautentikasi dengan Google Calendar. Silakan hubungkan akun Google atau set GOOGLE_REFRESH_TOKEN.",
    );
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // 1. Tentukan kalender tujuan
  let targetCalendarId = options.calendarId || "primary";
  let targetCalendarName = "Primary Calendar";

  if (options.createDedicatedCalendar || targetCalendarId === "dedicated") {
    const dedicated = await getOrCreateDedicatedCalendar(calendar);
    targetCalendarId = dedicated.id;
    targetCalendarName = dedicated.summary;
  } else if (targetCalendarId !== "primary") {
    try {
      const calInfo = await calendar.calendars.get({
        calendarId: targetCalendarId,
      });
      targetCalendarName = calInfo.data.summary || targetCalendarId;
    } catch {
      targetCalendarName = targetCalendarId;
    }
  }

  // 2. Ambil daftar tugas yang belum dikerjakan dari Moodle AJAX API
  let rawTasks = options.pendingTasks;
  if (
    !rawTasks &&
    options.oaseCredentials?.username &&
    options.oaseCredentials?.password
  ) {
    rawTasks = await fetchPendingOaseTasks(
      options.oaseCredentials.username,
      options.oaseCredentials.password,
    );
  }

  if (!rawTasks) {
    throw new Error(
      "Tidak ada data tugas OASE untuk disinkronkan. Silakan muat daftar tugas menggunakan username dan password SSO Unud Anda terlebih dahulu.",
    );
  }

  const oaseEvents = convertMoodleTasksToOaseEvents(rawTasks);

  // 3. Ambil daftar event yang sudah tersinkronisasi di Google Calendar
  // Ambil event dari 60 hari yang lalu hingga 1 tahun ke depan untuk menghemat quota
  const timeMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const existingEventsRes = await calendar.events.list({
    calendarId: targetCalendarId,
    timeMin,
    maxResults: 2500,
    singleEvents: true,
  });

  const existingItems = existingEventsRes.data.items || [];

  // Index event yang sudah ada berdasarkan oase_event_id atau matching UID di private properties
  const existingEventsMap = new Map<string, calendar_v3.Schema$Event>();
  for (const item of existingItems) {
    const oaseId = item.extendedProperties?.private?.oase_event_id;
    if (oaseId) {
      existingEventsMap.set(oaseId, item);
    }
  }

  const reminders = buildReminderOverrides(
    options.reminderMinutes || [1440, 120, 30],
  );

  let created = 0;
  let updated = 0;
  let completed = 0;
  let skipped = 0;
  const errors: SyncResult["errors"] = [];
  const createdEvents: SyncResult["createdEvents"] = [];

  const pendingUidSet = new Set(oaseEvents.map((e) => e.uid));

  // 4. Proses setiap event yang aktif/belum selesai dari OASE
  for (const event of oaseEvents) {
    try {
      const formattedDescription = buildEventDescription(event);
      const existingGoogleEvent = existingEventsMap.get(event.uid);

      const eventBody: calendar_v3.Schema$Event = {
        summary: event.summary,
        description: formattedDescription,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: "Asia/Makassar",
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: "Asia/Makassar",
        },
        reminders,
        extendedProperties: {
          private: {
            oase_event_id: event.uid,
            oase_course: event.courseName,
            oase_type: event.eventType,
            oase_completed: "false",
            oase_last_synced: new Date().toISOString(),
          },
        },
      };

      if (!existingGoogleEvent || !existingGoogleEvent.id) {
        // Event baru: INSERT
        await calendar.events.insert({
          calendarId: targetCalendarId,
          requestBody: eventBody,
        });
        created++;
        createdEvents.push(event);
      } else {
        // Event sudah ada: Cek apakah ada perubahan
        // Jika sebelumnya sempat ditandai selesai tapi kembali muncul di pending list, reset status selesainya
        const wasCompleted =
          existingGoogleEvent.summary?.startsWith("✅ [Selesai]");
        if (
          wasCompleted ||
          isEventChanged(existingGoogleEvent, event, formattedDescription)
        ) {
          await calendar.events.patch({
            calendarId: targetCalendarId,
            eventId: existingGoogleEvent.id,
            requestBody: eventBody,
          });
          updated++;
        } else {
          skipped++;
        }
      }

      // Berikan delay kecil untuk menghindari Google API rate limit
      await new Promise((resolve) => setTimeout(resolve, 60));
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown sync error";
      errors.push({
        eventId: event.uid,
        title: event.summary,
        message: errorMsg,
      });
    }
  }

  // 5. Tandai tugas-tugas di Google Calendar yang sudah tidak ada di daftar pending tugas sebagai SELESAI
  const yesterdayTime = Date.now() - 24 * 60 * 60 * 1000;

  for (const item of existingItems) {
    const oaseId = item.extendedProperties?.private?.oase_event_id;
    if (!oaseId || !item.id) continue;

    // Jika ID tidak ada di daftar pending tugas
    if (!pendingUidSet.has(oaseId)) {
      const itemStartTime = item.start?.dateTime
        ? new Date(item.start.dateTime).getTime()
        : 0;
      // Hanya tandai jika tugas belum kadaluarsa jauh (misal dalam 30 hari terakhir atau masa depan)
      const isRecentOrFuture =
        itemStartTime >= yesterdayTime - 30 * 24 * 60 * 60 * 1000;
      const currentSummary = item.summary || "";
      const isAlreadyMarked = currentSummary.startsWith("✅ [Selesai]");

      if (isRecentOrFuture && !isAlreadyMarked) {
        try {
          const cleanTitle = currentSummary
            .replace(/^✅\s*\[Selesai\]\s*/i, "")
            .trim();
          await calendar.events.patch({
            calendarId: targetCalendarId,
            eventId: item.id,
            requestBody: {
              summary: `✅ [Selesai] ${cleanTitle}`,
              // Hapus pengingat/alarm karena tugas sudah dikerjakan
              reminders: {
                useDefault: false,
                overrides: [],
              },
              extendedProperties: {
                private: {
                  ...item.extendedProperties?.private,
                  oase_completed: "true",
                  oase_completed_at: new Date().toISOString(),
                },
              },
            },
          });
          completed++;
          await new Promise((resolve) => setTimeout(resolve, 60));
        } catch (err: unknown) {
          const errorMsg =
            err instanceof Error ? err.message : "Gagal menandai tugas selesai";
          errors.push({
            eventId: oaseId,
            title: currentSummary,
            message: errorMsg,
          });
        }
      }
    }
  }

  return {
    totalEvents: oaseEvents.length,
    created,
    updated,
    completed,
    skipped,
    errors,
    calendarName: targetCalendarName,
    calendarId: targetCalendarId,
    syncedAt: new Date().toISOString(),
    createdEvents,
  };
}

export interface UpcomingOaseTask {
  id?: string;
  summary: string;
  courseName?: string;
  deadline?: Date;
  description?: string;
  isCompleted?: boolean;
}

/**
 * Mengambil daftar tugas / deadline OASE mendatang dari Google Calendar
 */
export async function getUpcomingOaseEventsFromCalendar(options?: {
  daysAhead?: number;
  calendarId?: string;
  explicitOAuth2Client?: InstanceType<typeof google.auth.OAuth2>;
}): Promise<{
  calendarFound: boolean;
  tasks: UpcomingOaseTask[];
}> {
  const oauth2Client =
    options?.explicitOAuth2Client || (await getAuthenticatedOAuth2Client());
  if (!oauth2Client) {
    throw new Error(
      "Google Calendar belum terhubung. Silakan hubungkan akun Google atau set GOOGLE_REFRESH_TOKEN.",
    );
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // 1. Tentukan target kalender awal (utamakan opsi eksplisit, GOOGLE_CALENDAR_ID di env, atau dedicated)
  const envCalendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  let targetCalendarId =
    options?.calendarId ||
    (envCalendarId && envCalendarId !== "dedicated"
      ? envCalendarId
      : undefined);

  if (!targetCalendarId) {
    try {
      const calendarList = await calendar.calendarList.list({
        minAccessRole: "reader",
      });
      const items = calendarList.data.items || [];
      const dedicated = items.find(
        (cal) =>
          cal.summary?.trim().toLowerCase() ===
          DEDICATED_CALENDAR_NAME.toLowerCase(),
      );
      if (dedicated?.id) {
        targetCalendarId = dedicated.id;
      }
    } catch {
      targetCalendarId = "primary";
    }
  }

  if (!targetCalendarId) {
    targetCalendarId = "primary";
  }

  // Mulai dari waktu saat ini agar tugas lampau tidak ikut termuat
  const now = new Date();
  const timeMin = now.toISOString();

  // Hanya terapkan timeMax jika daysAhead disetel secara spesifik; default: tanpa batas waktu (ambil semua tugas mendatang)
  const timeMax = options?.daysAhead
    ? new Date(
        now.getTime() + options.daysAhead * 24 * 60 * 60 * 1000,
      ).toISOString()
    : undefined;

  async function fetchCalendarTasks(calId: string) {
    try {
      const eventsRes = await calendar.events.list({
        calendarId: calId,
        timeMin,
        ...(timeMax ? { timeMax } : {}),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
      });

      const rawItems = eventsRes.data.items || [];
      return rawItems
        .filter((item) => {
          if (item.summary?.startsWith("✅ [Selesai]")) return false;
          if (item.extendedProperties?.private?.oase_completed === "true")
            return false;
          return Boolean(item.summary);
        })
        .map((item) => {
          const course =
            item.extendedProperties?.private?.oase_course ||
            item.description
              ?.match(/Mata Kuliah:\s*([^\n\r]+)/i)?.[1]
              ?.trim() ||
            undefined;

          const dateStr =
            item.start?.dateTime ||
            item.start?.date ||
            item.end?.dateTime ||
            item.end?.date;
          const deadline = dateStr ? new Date(dateStr) : undefined;

          return {
            id: item.id || undefined,
            summary: item.summary || "Tugas OASE",
            courseName: course,
            deadline,
            description: item.description || undefined,
            isCompleted: false,
          };
        });
    } catch {
      return [];
    }
  }

  let tasks = await fetchCalendarTasks(targetCalendarId);

  // Jika di kalender target (misal dedicated) tidak ada tugas aktif dan target bukan primary, coba cek kalender primary
  if (tasks.length === 0 && targetCalendarId !== "primary") {
    const primaryTasks = await fetchCalendarTasks("primary");
    if (primaryTasks.length > 0) {
      tasks = primaryTasks;
    }
  }

  return {
    calendarFound: true,
    tasks,
  };
}
