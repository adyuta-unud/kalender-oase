export type OaseEventType = 'assignment' | 'quiz' | 'exam' | 'discussion' | 'general';

export interface OaseEvent {
  uid: string;
  summary: string;
  cleanTitle: string;
  description: string;
  cleanDescription: string;
  courseName: string;
  eventType: OaseEventType;
  start: Date;
  end: Date;
  isDeadline: boolean;
  url?: string;
  links: { label: string; url: string }[];
  lastModified?: Date;
}

export interface MoodleActionEvent {
  id: number;
  name: string;
  activityname?: string;
  description?: string;
  component?: string;
  modulename?: string;
  eventtype?: string;
  timestart: number;
  timeduration?: number;
  timesort?: number;
  url?: string;
  course?: {
    id?: number;
    fullname?: string;
    shortname?: string;
    viewurl?: string;
  };
  action?: {
    name?: string;
    url?: string;
    itemcount?: number;
    actionable?: boolean;
  };
}

export interface SyncOptions {
  calendarId: string;
  createDedicatedCalendar?: boolean;
  reminderMinutes?: number[]; // Misal [1440, 120, 30] = 1 hari, 2 jam, dan 30 menit
  pendingTasks?: MoodleActionEvent[]; // Daftar tugas belum dikerjakan dari Moodle AJAX
  oaseCredentials?: {
    username: string;
    password: string;
  };
}

export interface SyncResult {
  totalEvents: number;
  created: number;
  updated: number;
  completed?: number;
  skipped: number;
  errors: { eventId: string; title: string; message: string }[];
  calendarName: string;
  calendarId: string;
  syncedAt: string;
  createdEvents?: OaseEvent[];
}

export interface GoogleSessionData {
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    scope?: string | null;
    token_type?: string | null;
    expiry_date?: number | null;
  };
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}
