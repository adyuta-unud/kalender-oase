"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Apa itu Kalender OASE Universitas Udayana?",
    answer:
      "Kalender OASE adalah aplikasi yang menghubungkan sistem pembelajaran daring OASE Moodle Universitas Udayana ke Google Calendar. Aplikasi ini mengekstrak kalender untuk menyinkronkan jadwal tugas, kuis, dan ujian secara otomatis dan terjadwal.",
  },
  {
    question: "Bagaimana cara mengambil daftar tugas dari OASE UNUD?",
    answer:
      "Cukup masukkan NIM dan Password akun SSO Universitas Udayana Anda pada form Autentikasi Akun OASE. Sistem akan mengambil daftar tugas, kuis, dan ujian yang belum selesai secara langsung dari API resmi Moodle OASE.",
  },
  {
    question: "Apakah sinkronisasi kalender OASE ini aman dan menjaga privasi?",
    answer:
      "Sangat aman. Aplikasi menerapkan arsitektur stateless tanpa database server. Kredensial SSO Anda hanya digunakan secara langsung untuk mengambil sesi tugas Moodle via koneksi terenkripsi (HTTPS). Kami tidak pernah menyimpan kata sandi Anda di database mana pun.",
  },
  {
    question:
      "Bisakah kalender OASE tersinkronisasi otomatis tanpa harus buka web setiap hari?",
    answer:
      "Bisa. Anda dapat mengaktifkan GitHub Actions gratis menggunakan workflow webhook yang telah kami sediakan di menu 'Github Actions'. GitHub Actions akan memicu sinkronisasi kalender setiap hari secara terjadwal.",
  },
  {
    question:
      "Bagaimana aplikasi mengetahui jika tugas sudah selesai saya kumpulkan di OASE?",
    answer:
      "Sistem memantau linimasa aktif Moodle OASE. Saat Anda mengumpulkan tugas di OASE, tugas tersebut otomatis hilang dari daftar pending dan di Google Calendar akan diperbarui dengan label '✅ [Selesai]' serta alarm pengingatnya dinonaktifkan.",
  },
  {
    question:
      "Apakah aplikasi ini resmi dibuat oleh pihak Universitas Udayana?",
    answer:
      "Aplikasi ini merupakan proyek yang dikembangkan oleh mahasiswa untuk membantu sivitas Universitas Udayana. Aplikasi ini tidak berafiliasi resmi dengan Universitas Udayana maupun Google LLC.",
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
