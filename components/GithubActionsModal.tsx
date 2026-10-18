"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  GitBranch,
  Globe,
  Radio,
} from "lucide-react";

interface GithubActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

export function GithubActionsModal({
  isOpen,
  onClose,
  isAuthenticated,
}: GithubActionsModalProps) {
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const isLoadingToken = isOpen && isAuthenticated && !refreshToken;

  React.useEffect(() => {
    if (!isOpen || !isAuthenticated || refreshToken) return;

    let ignore = false;
    async function loadToken() {
      try {
        const res = await fetch("/api/auth/token", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.refreshToken) {
            setRefreshToken(data.refreshToken);
          }
        }
      } catch {
        // Gagal mengambil token
      }
    }

    loadToken();

    return () => {
      ignore = true;
    };
  }, [isOpen, isAuthenticated, refreshToken]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Backdrop overlay dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Container dengan max-h dan flex vertical */}
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#001d62] text-white flex items-center justify-center font-bold shrink-0">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Otomatisasi GitHub Actions
              </h3>
              <p className="text-sm sm:text-sm text-slate-500">
                Pemicu sinkronisasi berkala ke Google Calendar di latar
                belakang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-sm text-slate-600">
          <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3.5 text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <GitBranch className="w-4 h-4 text-[#2c49b6]" />
              <span>Sinkronisasi Otomatis via Webhook</span>
            </div>
            <p className="text-sm leading-relaxed">
              Workflow <code>.github/workflows/sync.yml</code> akan memanggil
              endpoint <code>/api/cron/sync</code> di Vercel secara terjadwal
              dengan otentikasi <code>CRON_SECRET</code>.
            </p>
          </div>

          {/* Bagian 1: Di Vercel */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#005eb8]" />
              <span>
                Langkah 1: Tambahkan di Vercel Dashboard (Settings &gt;
                Environment Variables)
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
              {/* GOOGLE_REFRESH_TOKEN */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <div className="font-mono font-bold text-slate-800 text-sm">
                    GOOGLE_REFRESH_TOKEN
                  </div>
                  <div className="text-sm text-slate-500">
                    {isAuthenticated ? (
                      refreshToken ? (
                        <span className="font-mono text-slate-700 truncate max-w-xs block">
                          {refreshToken.slice(0, 15)}••••••••••••••••
                        </span>
                      ) : isLoadingToken ? (
                        "Mengambil token..."
                      ) : (
                        <span className="text-amber-600">
                          Hubungkan ulang akun Google jika token belum terisi.
                        </span>
                      )
                    ) : (
                      "Login ke Google di web ini terlebih dahulu untuk mendapatkan token."
                    )}
                  </div>
                </div>
                {refreshToken && (
                  <button
                    type="button"
                    onClick={() => handleCopy(refreshToken, "token")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold shrink-0 cursor-pointer"
                  >
                    {copiedKey === "token" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedKey === "token" ? "Tersalin" : "Salin Token"}
                    </span>
                  </button>
                )}
              </div>

              {/* CRON_SECRET */}
              <div className="text-sm text-slate-600">
                <span className="font-mono font-bold text-slate-800">
                  CRON_SECRET
                </span>
                : Buat string acak rahasia untuk mengamankan webhook
              </div>

              {/* OASE_USERNAME & OASE_PASSWORD */}
              <div className="text-sm text-slate-600 border-t border-slate-200 pt-2">
                <span className="font-mono font-bold text-slate-800">
                  OASE_USERNAME &amp; OASE_PASSWORD
                </span>
                <span className="text-sm text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded ml-1 font-semibold">
                  Wajib untuk Sinkronisasi Otomatis
                </span>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
                  Masukkan NIM dan password SSO Unud Anda di Vercel Environment
                  Variables agar cron job dapat mengambil tugas aktif dari OASE
                </p>
              </div>

              {/* FONNTE_TOKEN & FONNTE_TARGET_PHONE */}
              <div className="text-sm text-slate-600 border-t border-slate-200 pt-2">
                <span className="font-mono font-bold text-slate-800">
                  FONNTE_TOKEN &amp; FONNTE_TARGET_PHONE
                </span>
                <span className="text-sm text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded ml-1 font-semibold">
                  Opsional: Notifikasi WhatsApp
                </span>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
                  Tambahkan token device Fonnte dan nomor WhatsApp Anda untuk
                  menerima pesan otomatis saat ada tugas baru yang terdeteksi.
                </p>
              </div>
            </div>
          </div>

          {/* Bagian 2: Di GitHub Secrets */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#2c49b6]" />
              <span>
                Langkah 2: Tambahkan 2 Secrets di GitHub (Settings &gt; Secrets
                &gt; Actions)
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-mono font-bold text-slate-800 text-sm">
                  VERCEL_APP_URL
                </div>
                <div className="text-sm text-slate-500">
                  Domain aplikasi Anda di Vercel (contoh:{" "}
                  <code>https://oasee.vercel.app</code>).
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-mono font-bold text-slate-800 text-sm">
                  CRON_SECRET
                </div>
                <div className="text-sm text-slate-500">
                  Nilai rahasia yang sama persis dengan yang Anda pasang di
                  environment variable Vercel.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-sm text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Selesai!</strong> Setelah kedua secret tersebut disetel,
              GitHub Actions akan mengirim ping webhook setiap 2 jam sekali ke
              Vercel untuk menyinkronkan tugas OASE secara otomatis 24/7.
            </span>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-5 py-3 sm:px-6 sm:py-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-[#005eb8] hover:bg-[#004ba8] text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Tutup &amp; Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
