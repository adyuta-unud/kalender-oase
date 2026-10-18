"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  UserCheck,
} from "lucide-react";

interface OaseLoginCardProps {
  isLoading: boolean;
  onFetchTasks: (credentials: {
    username: string;
    password: string;
  }) => Promise<void>;
  loadedTasksCount: number;
  hasLoadedTasks: boolean;
  onClearSession: () => void;
  isCaptchaVerified?: boolean;
}

export function OaseLoginCard({
  isLoading,
  onFetchTasks,
  loadedTasksCount,
  hasLoadedTasks,
  onClearSession,
  isCaptchaVerified = true,
}: OaseLoginCardProps) {
  const [username, setUsername] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        // Hapus sisa password lama jika pernah tersimpan di browser
        localStorage.removeItem("oase_password");
        return localStorage.getItem("oase_username") || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  // Password hanya disimpan di React memory state selama sesi aktif tab (tidak pernah di localStorage)
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isCaptchaVerified) {
      setErrorMsg(
        "Selesaikan verifikasi keamanan Cloudflare Turnstile di atas terlebih dahulu.",
      );
      document
        .getElementById("security-verification")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!username.trim() || !password) {
      setErrorMsg(
        "Silakan masukkan Username (NIM) dan Password SSO Unud Anda.",
      );
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem("oase_username", username.trim());
      } else {
        localStorage.removeItem("oase_username");
      }
      // Pastikan kata sandi tidak pernah tersimpan di media penyimpanan persisten browser
      localStorage.removeItem("oase_password");

      await onFetchTasks({ username: username.trim(), password });

      // Picu pop-up simpan kata sandi bawaan browser via W3C Credential Management API
      if (
        typeof window !== "undefined" &&
        "PasswordCredential" in window &&
        navigator.credentials
      ) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const CredentialConstructor = (window as any).PasswordCredential;
          const cred = new CredentialConstructor({
            id: username.trim(),
            password,
            name: username.trim(),
          });
          await navigator.credentials.store(cred);
        } catch {
          // Abaikan jika browser tidak mengizinkan atau pengguna menolak
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal mengambil daftar tugas dari OASE.";
      setErrorMsg(msg);
    }
  };

  const handleClear = () => {
    setUsername("");
    setPassword("");
    setErrorMsg(null);
    try {
      localStorage.removeItem("oase_username");
      localStorage.removeItem("oase_password");
    } catch {
      // Abaikan
    }
    onClearSession();
  };

  return (
    <div
      id="oase-auth-section"
      className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4 scroll-mt-20"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#005eb8]" />
          <span>Akun OASE</span>
        </h2>

        {hasLoadedTasks && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{loadedTasksCount} Tugas Dimuat</span>
          </span>
        )}
      </div>

      <p className="text-sm text-slate-500 leading-relaxed">
        Masuk dengan akun SSO Universitas Udayana untuk memuat daftar tugas
        aktif dari portal OASE.
      </p>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <span className="font-bold shrink-0 text-rose-700">&bull;</span>
          <div className="leading-relaxed flex-1">{errorMsg}</div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        method="post"
        action="#"
        className="space-y-3.5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Input Username / NIM */}
          <div className="space-y-1.5">
            <label
              htmlFor="oase-username"
              className="block text-sm font-semibold uppercase tracking-wider text-slate-600"
            >
              Username / NIM
            </label>
            <input
              id="oase-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: 2408561001"
              required
              disabled={isLoading}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition-all placeholder:text-slate-400 bg-white"
            />
          </div>

          {/* Input Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="oase-password"
              className="block text-sm font-semibold uppercase tracking-wider text-slate-600"
            >
              Password SSO
            </label>
            <div className="relative">
              <input
                id="oase-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password SSO Anda"
                required
                disabled={isLoading}
                className="w-full pl-3.5 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition-all placeholder:text-slate-400 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Checkbox Ingat Kredensial */}
        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-[#005eb8] focus:ring-[#005eb8]"
            />
            <span>Ingat NIM di perangkat ini</span>
          </label>

          {hasLoadedTasks && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ganti Akun</span>
            </button>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="submit"
            disabled={
              isLoading || !isCaptchaVerified || !username.trim() || !password
            }
            className={`flex-1 inline-flex items-center justify-center gap-2 font-semibold px-4 py-2.5 rounded-lg text-sm shadow-xs transition-all ${
              !isCaptchaVerified || !username.trim() || !password
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-[#001d62] hover:bg-[#002888] text-white active:scale-98 cursor-pointer"
            } disabled:opacity-75`}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>
              {isLoading
                ? "Memuat dari OASE..."
                : !isCaptchaVerified
                  ? "Verifikasi Keamanan Diperlukan"
                  : !username.trim() || !password
                    ? "Masukkan NIM & Password"
                    : hasLoadedTasks
                      ? "Perbarui Daftar Tugas"
                      : "Ambil Daftar Tugas"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
