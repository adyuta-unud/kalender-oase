import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Lock, ArrowLeft, KeyRound, EyeOff, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Kalender OASE",
  description:
    "Kebijakan Privasi untuk aplikasi Kalender OASE Universitas Udayana.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group text-slate-800 hover:text-[#001d62] transition-colors"
          >
            <Logo
              size="md"
              priority
              className="border border-slate-200 shadow-2xs"
            />
            <div>
              <span className="font-bold text-base text-slate-900 block leading-tight">
                Kalender OASE
              </span>
              <span className="text-sm text-slate-500 block leading-tight">
                Universitas Udayana
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#001d62] hover:text-[#2c49b6] bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-10 space-y-8">
          {/* Header Title */}
          <div className="border-b border-slate-200 pb-6 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy (Kebijakan Privasi)
            </h1>
          </div>

          {/* Section: Pendahuluan */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              1. Pendahuluan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kalender OASE (&quot;Aplikasi&quot;) adalah proyek independen yang
              dikembangkan untuk membantu sivitas akademika Universitas Udayana
              menyinkronkan jadwal perkuliahan, tenggat tugas, kuis, dan ujian
              dari portal OASE ke Google Calendar pribadi.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kami menghargai privasi Anda dan berkomitmen penuh untuk
              melindungi data pribadi Anda. Kebijakan Privasi ini menjelaskan
              bagaimana Aplikasi memproses dan melindungi informasi Anda sesuai
              dengan standar keamanan dan Google API Services User Data Policy.
            </p>
          </section>

          {/* Section: Data yang Diakses */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              2. Data yang Diakses dan Diperlukan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Untuk menyediakan fungsi sinkronisasi kalender, Aplikasi meminta
              izin otorisasi Google OAuth dengan cakupan (scopes) terbatas
              berikut:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 leading-relaxed">
              <li>
                <strong className="text-slate-800">
                  Profil Akun Google (Email &amp; Profil Dasar):
                </strong>{" "}
                Digunakan untuk menampilkan identitas akun yang sedang aktif
                (nama, alamat email, dan foto profil) pada antarmuka aplikasi.
              </li>
              <li>
                <strong className="text-slate-800">
                  Google Calendar API (events):
                </strong>{" "}
                Digunakan untuk menambahkan jadwal baru, memperbarui agenda yang
                berubah, dan memastikan tidak ada duplikasi jadwal di Google
                Calendar Anda.
              </li>
            </ul>
          </section>

          {/* Section: Arsitektur Stateless */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              3. Penyimpanan Data &amp; Keamanan
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Tanpa Database Pengguna (Stateless Architecture)</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Aplikasi ini tidak menyimpan data pribadi Anda di database
                server. Token sesi Google disimpan dalam bentuk cookie HTTP-only
                yang dienkripsi menggunakan algoritma{" "}
                <span className="font-mono text-slate-800 font-medium">
                  AES-256-GCM
                </span>{" "}
                pada browser Anda sendiri.
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600">
                <li>
                  Kami tidak pernah menyimpan password OASE maupun password akun
                  Google Anda.
                </li>
                <li>
                  Kami tidak mengumpulkan atau merekam log aktivitas pribadi
                  Anda.
                </li>
                <li>
                  Saat Anda menekan tombol Sign out, seluruh sesi dan token
                  langsung dihapus dari browser.
                </li>
              </ul>
            </div>
          </section>

          {/* Section: Google Limited Use Policy */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              4. Kepatuhan Google API Services User Data Policy
            </h2>
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-3">
              <p className="text-sm text-blue-900 leading-relaxed">
                Penggunaan informasi yang diterima dari Google API oleh Kalender
                OASE mematuhi ketentuan{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold underline hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Google API Services User Data Policy
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                , termasuk klausul <strong>Limited Use</strong>:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-800">
                <li>
                  Data pengguna tidak akan pernah dijual atau dialihkan ke pihak
                  ketiga.
                </li>
                <li>
                  Data tidak digunakan untuk keperluan iklan atau pemasaran.
                </li>
                <li>
                  Data tidak digunakan untuk pelatihan model kecerdasan buatan
                  (AI / machine learning).
                </li>
                <li>
                  Akses data kalender hanya dilakukan untuk keperluan
                  sinkronisasi atas persetujuan pengguna.
                </li>
              </ul>
            </div>
          </section>

          {/* Section: Berbagi Data Pihak Ketiga */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              5. Pengungkapan kepada Pihak Ketiga
            </h2>
            <div className="flex items-start gap-3">
              <EyeOff className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-relaxed">
                Kami tidak membagikan, menyewakan, atau menjual informasi Anda
                kepada pihak ketiga. Komunikasi data berlangsung langsung dan
                terenkripsi melalui koneksi aman HTTPS antara browser Anda,
                server aplikasi, portal OASE UNUD, dan server resmi Google
                Calendar.
              </p>
            </div>
          </section>

          {/* Section: Hak Pengguna & Pencabutan Akses */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              6. Pencabutan Izin Akses (Revoke Access)
            </h2>
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
                <p>
                  Anda memegang kendali penuh atas akun Google Anda. Anda dapat
                  mencabut izin akses aplikasi ini ke Google Calendar kapan saja
                  melalui langkah berikut:
                </p>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>
                    Buka pengaturan keamanan akun Google di{" "}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[#001d62] font-semibold underline hover:text-[#2c49b6]"
                    >
                      Google Account Security &amp; Permissions
                    </a>
                    .
                  </li>
                  <li>
                    Pilih &quot;Kalender OASE&quot; pada daftar aplikasi pihak
                    ketiga.
                  </li>
                  <li>Klik tombol &quot;Hapus Akses&quot; (Remove Access).</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Section: Kontak */}
          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              7. Kontak &amp; Dukungan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini,
              silakan hubungi tim pengembang melalui{" "}
              <a
                href="https://github.com/oka123/kalender-oase"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#001d62] font-semibold underline hover:text-[#2c49b6]"
              >
                repositori GitHub Kalender OASE
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; 2026 Kalender OASE &bull; Universitas Udayana</p>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="hover:text-slate-800">
              Beranda
            </Link>
            <a
              href="https://github.com/oka123/kalender-oase"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-800 transition-colors"
            >
              GitHub
            </a>
            <Link href="/terms" className="hover:text-slate-800">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-[#001d62] font-semibold">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
