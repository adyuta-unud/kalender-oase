"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Apa itu Kalender OASE - Universitas Udayana?",
    answer:
      "Kalender OASE adalah platform integrasi akademik untuk mahasiswa dan dosen Universitas Udayana (UNUD). Aplikasi ini menyinkronkan jadwal tugas, kuis, asistensi, dan tenggat waktu perkuliahan dari portal OASE UNUD (https://oase.unud.ac.id) langsung ke Google Calendar secara otomatis, aman, dan real-time.",
  },
  {
    question:
      "Apa hubungan Kalender OASE dengan web resmi https://oase.unud.ac.id/?",
    answer:
      "Web https://oase.unud.ac.id/ adalah portal resmi Learning Management System (LMS) milik Universitas Udayana. Kalender OASE (https://oasee.vercel.app/) berfungsi sebagai aplikasi pendamping (companion tool) yang membaca jadwal tugas aktif dari portal resmi OASE dan memasukkannya ke Google Calendar Anda.",
  },
  {
    question:
      "Bagaimana cara mengambil dan menyinkronkan tugas dari OASE UNUD?",
    answer:
      "Cukup masukkan NIM dan Password akun SSO Universitas Udayana Anda pada kartu Autentikasi Akun OASE, lalu klik Ambil Daftar Tugas. Setelah agenda terdeteksi, pilih kalender Google tujuan Anda dan tekan tombol Sinkronkan ke Google Calendar.",
  },
  {
    question:
      "Apakah Kalender OASE mendukung seluruh fakultas dan program studi di Universitas Udayana?",
    answer:
      "Ya. Semua fakultas dan prodi di Universitas Udayana yang aktif menggunakan portal pembelajaran daring OASE UNUD (seperti Fakultas Teknik, Kedokteran, MIPA, Ekonomi dan Bisnis, Hukum, Ilmu Budaya, Pertanian, Peternakan, Kedokteran Hewan, Perikanan, dan lainnya) dapat disinkronkan secara menyeluruh.",
  },
  {
    question:
      "Apakah sinkronisasi kalender OASE ini aman dan menjaga privasi data SSO?",
    answer:
      "Sangat aman. Kalender OASE menerapkan arsitektur stateless tanpa database server pusat. Kredensial SSO Anda hanya digunakan secara langsung untuk otentikasi via koneksi terenkripsi HTTPS. Kata sandi tidak pernah disimpan di database atau dibagikan ke pihak ketiga.",
  },
  {
    question:
      "Bisakah kalender OASE tersinkronisasi otomatis tanpa harus membuka web setiap hari?",
    answer:
      "Bisa. Anda dapat mengaktifkan GitHub Actions gratis menggunakan workflow webhook yang telah kami sediakan di menu Github Actions. Workflow tersebut akan memicu sinkronisasi kalender secara otomatis setiap hari di latar belakang.",
  },
  {
    question:
      "Bagaimana sistem mendeteksi jika tugas sudah selesai saya kumpulkan di OASE?",
    answer:
      "Sistem memantau linimasa aktif OASE UNUD. Saat Anda mengumpulkan tugas di OASE, tugas tersebut otomatis hilang dari daftar pending dan statusnya di Google Calendar diperbarui dengan tanda ✅ [Selesai] serta alarm pengingat dinonaktifkan.",
  },
  {
    question:
      "Apakah aplikasi ini resmi dibuat oleh pihak Universitas Udayana?",
    answer:
      "Aplikasi ini merupakan proyek independen open-source yang dikembangkan oleh mahasiswa Informatika Universitas Udayana untuk membantu mempermudah manajemen akademik seluruh sivitas akademika UNUD. Aplikasi ini tidak berafiliasi secara komersial dengan Universitas Udayana maupun Google LLC.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  // Structured Data JSON-LD untuk FAQPage
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 sm:p-8 space-y-6">
      {/* Script JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Pertanyaan Umum (FAQ)
        </h2>
      </div>

      <div className="divide-y divide-slate-100">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="py-4 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between gap-4 text-left group focus:outline-hidden"
                aria-expanded={isOpen}
              >
                <span className="text-base font-semibold text-slate-900 group-hover:text-[#001d62] transition-colors flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-[#001d62] shrink-0" />
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-[#001d62]" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="mt-3 pl-6 pr-2 text-sm text-slate-600 leading-relaxed animate-in fade-in duration-150">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
