"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { SyncControls } from "@/components/SyncControls";
import { EventsList } from "@/components/EventsList";
import { OaseLoginCard } from "@/components/OaseLoginCard";
import { SecurityCaptcha } from "@/components/SecurityCaptcha";
import { GithubActionsModal } from "@/components/GithubActionsModal";
import { FaqSection } from "@/components/FaqSection";
import { GoogleDisclosure } from "@/components/GoogleDisclosure";
import { Logo } from "@/components/Logo";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import type {
  OaseEvent,
  GoogleCalendarItem,
  SyncResult,
  MoodleActionEvent,
} from "@/types/calendar";
import { useToast } from "@/components/Toast";

function DashboardContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State
  const [user, setUser] = useState<{
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);
  const [calendars, setCalendars] = useState<GoogleCalendarItem[]>([]);
  const [events, setEvents] = useState<OaseEvent[]>([]);
  const [rawTasks, setRawTasks] = useState<MoodleActionEvent[]>([]);
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const authStatus = searchParams.get("auth");
  const authError = searchParams.get("auth_error");
  const handledAuthRef = useRef(false);

  // Tangani notifikasi dari URL OAuth callback
  useEffect(() => {
    if (!authStatus && !authError) return;
    if (handledAuthRef.current) return;
    handledAuthRef.current = true;

    if (authStatus === "success") {
      toast.success(
        "Akun Google berhasil terhubung! Anda dapat menyinkronkan jadwal sekarang.",
      );
    } else if (authError) {
      toast.error(decodeURIComponent(authError));
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [authStatus, authError, toast]);

  // Muat daftar kalender Google
  const loadCalendars = useCallback(async () => {
    try {
      const res = await fetch("/api/calendars");
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars || []);
      }
    } catch {
      // Kalender gagal dimuat
    }
  }, []);

  // Muat jadwal tugas belum dikerjakan dari OASE via API Moodle
  const handleFetchTasks = useCallback(
    async (creds: { username: string; password: string }) => {
      setIsLoadingEvents(true);
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setEvents(data.events || []);
          setRawTasks(data.rawTasks || []);
          setCredentials(creds);
          toast.success(`Berhasil memuat ${data.total} tugas aktif dari OASE!`);
        } else {
          throw new Error(
            data.error || "Gagal mengambil daftar tugas dari OASE.",
          );
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Koneksi ke server gagal.";
        toast.error(msg);
        throw err;
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [toast],
  );

  // Handler OAuth login
  const handleLogin = async () => {
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Gagal mengambil URL otorisasi Google");
      }
    } catch {
      toast.error("Terjadi kesalahan saat memulai autentikasi Google.");
    }
  };

  // Handler Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setIsAuthenticated(false);
      setCalendars([]);
      toast.success("Berhasil keluar dari akun Google.");
    } catch {
      toast.error("Gagal melakukan logout akun Google.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handler Sinkronisasi
  const handleSync = async (options: {
    calendarId: string;
    createDedicatedCalendar: boolean;
    reminderMinutes: number[];
    turnstileToken?: string;
  }) => {
    if (events.length === 0) {
      toast.error(
        "Belum ada tugas yang dimuat. Silakan masukkan akun OASE Anda dan ambil daftar tugas terlebih dahulu.",
      );
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const body = {
        ...options,
        pendingTasks: rawTasks,
        oaseCredentials: credentials || undefined,
        turnstileToken: options.turnstileToken,
      };

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult(data.result);
        toast.success(data.message || "Sinkronisasi kalender berhasil!");
        if (options.createDedicatedCalendar) {
          loadCalendars();
        }
      } else {
        toast.error(data.error || "Gagal menjalankan sinkronisasi kalender.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kegagalan komunikasi saat sinkronisasi.";
      toast.error(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Bersihkan status parameter auth dari URL browser setelah dibaca
  useEffect(() => {
    if (authStatus || authError) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [authStatus, authError]);

  // Inisialisasi data awal (auth check & preview jadwal jika kredensial server tersedia)
  useEffect(() => {
    let ignore = false;

    async function init() {
      // 1. Cek sesi Google
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!ignore) {
          if (data.authenticated) {
            setIsAuthenticated(true);
            setUser(data.user);
            const calRes = await fetch("/api/calendars");
            if (calRes.ok) {
              const calData = await calRes.json();
              if (!ignore) {
                setCalendars(calData.calendars || []);
              }
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch {
        if (!ignore) {
          setIsAuthenticated(false);
        }
      }

      // 2. Muat jadwal awal OASE jika kredensial lingkungan disetel di server
      try {
        const previewRes = await fetch("/api/preview");
        const previewData = await previewRes.json();
        if (!ignore && previewRes.ok && previewData.success) {
          setEvents(previewData.events || []);
          setRawTasks(previewData.rawTasks || []);
        }
      } catch {
        // Memerlukan login manual dari form OaseLoginCard
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        onOpenGithubSetup={() => setIsGithubModalOpen(true)}
      />

      <GithubActionsModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        isAuthenticated={isAuthenticated}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Hero Banner Pendahuluan */}
        <div className="bg-linear-to-r from-[#001d62] via-[#204c96] to-[#005eb8] text-white rounded-xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Kalender OASE UNUD
              </h1>
              <p className="text-sm text-blue-100/90 leading-relaxed">
                Sinkronisasi jadwal tugas perkuliahan dari OASE Universitas
                Udayana ke Google Calendar secara otomatis.
              </p>
            </div>

            {/* Logo Badge di Hero */}
            <div className="hidden md:flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner shrink-0">
              <Logo size={76} priority className="drop-shadow-md" />
            </div>
          </div>
          {/* Subtle Decorative Background Element */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-radial from-white to-transparent pointer-events-none" />
        </div>

        {/* Verifikasi Keamanan Cloudflare di Awal Halaman */}
        <SecurityCaptcha
          onVerifyChange={(state) => setIsCaptchaVerified(state.isVerified)}
        />

        {/* 3-Step Alur Cepat Onboarding */}
        <WorkflowStepper
          isAuthenticated={isAuthenticated}
          eventsCount={events.length}
          hasSynced={Boolean(syncResult)}
          onLoginClick={handleLogin}
          onScrollToSync={() => {
            document
              .getElementById("sync-controls")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          onScrollToEvents={() => {
            document
              .getElementById("oase-auth-section")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* Form Login & Pengambilan Tugas OASE Moodle */}
        <OaseLoginCard
          isLoading={isLoadingEvents}
          onFetchTasks={handleFetchTasks}
          loadedTasksCount={events.length}
          hasLoadedTasks={events.length > 0}
          isCaptchaVerified={isCaptchaVerified}
          onClearSession={() => {
            setEvents([]);
            setRawTasks([]);
            setCredentials(null);
            toast.info("Sesi dan daftar tugas OASE berhasil dibersihkan.");
          }}
        />

        {/* Pusat Kontrol Sinkronisasi */}
        <SyncControls
          isAuthenticated={isAuthenticated}
          calendars={calendars}
          onSync={handleSync}
          isSyncing={isSyncing}
          syncResult={syncResult}
          onLoginRequest={handleLogin}
          isCaptchaVerified={isCaptchaVerified}
          hasTasks={events.length > 0}
        />

        {/* Daftar Agenda & Event Preview */}
        <EventsList
          events={events}
          isLoading={isLoadingEvents}
          onRefresh={() => {
            if (credentials) {
              handleFetchTasks(credentials);
            }
          }}
        />

        {/* Transparansi & Kepatuhan Kebijakan Penggunaan Data Google API */}
        <GoogleDisclosure />

        {/* Section FAQ & Panduan SEO */}
        <FaqSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-end gap-4 ">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
            <a
              href="https://github.com/oka123/kalender-oase"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 hover:underline transition-colors"
            >
              GitHub
            </a>
            <span className="text-slate-300">&bull;</span>
            <a
              href="#google-disclosure"
              className="hover:text-slate-900 hover:underline transition-colors"
            >
              Google Disclosure
            </a>
            <span className="text-slate-300">&bull;</span>
            <Link
              href="/privacy"
              className="hover:text-slate-900 hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link
              href="/terms"
              className="hover:text-slate-900 hover:underline transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-slate-300">&bull;</span>
            <p className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} Kalender OASE &bull; Universitas
              Udayana
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-3 border-[#2c49b6] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
