"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ExternalLink, ArrowRight } from "lucide-react";

export function GoogleDisclosure() {
  return (
    <section
      id="google-disclosure"
      aria-labelledby="google-disclosure-title"
      className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4 scroll-mt-20"
    >
      {/* Header Minimalis */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h2
          id="google-disclosure-title"
          className="text-base font-bold text-slate-900 flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 text-[#005eb8]" />
          <span>Penggunaan Data Google Calendar</span>
        </h2>

        <Link
          href="/privacy"
          className="inline-flex flex-1 sm:flex-none items-center gap-1 text-sm font-semibold text-[#005eb8] hover:text-[#002888] hover:underline"
        >
          <span className="">Kebijakan Privasi</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 3 Poin Kepatuhan Utama */}
      <ul className="space-y-2.5 text-sm text-slate-600 leading-relaxed">
        <li className="flex items-start gap-2.5">
          <span className="text-[#005eb8] font-bold select-none">&bull;</span>
          <div>
            <strong className="text-slate-800">Tujuan Izin Kalender:</strong>{" "}
            Akses <code>calendar.events</code> hanya digunakan untuk membuat
            kalender &quot;OASE UNUD&quot; dan menyinkronkan tugas kuliah aktif.
            Aplikasi{" "}
            <strong>
              tidak membaca, mengubah, atau menghapus agenda pribadi
            </strong>{" "}
            Anda.
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="text-emerald-600 font-bold select-none">&bull;</span>
          <div>
            <strong className="text-slate-800">Arsitektur Stateless:</strong>{" "}
            Tidak ada basis data pusat yang menyimpan profil atau kata sandi
            Anda. Token akses Google disimpan aman dalam cookie peramban
            terenkripsi (AES-256-GCM).
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="text-blue-600 font-bold select-none">&bull;</span>
          <div>
            <strong className="text-slate-800">Ketentuan Limited Use:</strong>{" "}
            Data Anda tidak pernah dijual atau digunakan untuk periklanan dan
            pelatihan AI/ML, sesuai dengan ketentuan{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#005eb8] font-medium underline inline-flex items-center gap-0.5 hover:text-[#002888]"
            >
              <span>Google API Services User Data Policy</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
            .
          </div>
        </li>
      </ul>

      {/* Subteks Footer Ringkas */}
      <div className="pt-1 text-sm text-slate-400 flex flex-wrap items-center gap-2 border-t border-slate-100">
        <span>Tunduk pada persyaratan Limited Use.</span>
        <span>&bull;</span>
        <Link
          href="/terms"
          className="text-slate-500 hover:text-slate-800 hover:underline"
        >
          Ketentuan Layanan
        </Link>
        <span>&bull;</span>
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-800 hover:underline"
        >
          Kelola Izin Akun
        </a>
      </div>
    </section>
  );
}
