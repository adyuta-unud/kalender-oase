import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Syarat dan Ketentuan Layanan untuk aplikasi Kalender OASE Universitas Udayana.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsOfServicePage() {
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
              Terms of Service (Syarat dan Ketentuan)
            </h1>
          </div>

          {/* Section 1: Penerimaan Ketentuan */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              1. Penerimaan Syarat dan Ketentuan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dengan mengakses dan menggunakan aplikasi Kalender OASE
              (&quot;Layanan&quot;), Anda menyatakan bahwa Anda telah membaca,
              memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan
              Layanan ini serta Kebijakan Privasi kami. Jika Anda tidak
              menyetujui ketentuan ini, Anda diminta untuk tidak menggunakan
              Layanan ini.
            </p>
          </section>

          {/* Section 2: Deskripsi Layanan */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              2. Deskripsi Layanan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kalender OASE adalah aplikasi utilitas non-komersial yang
              dirancang untuk memfasilitasi sinkronisasi jadwal akademik
              (seperti deadline tugas, kuis, dan ujian) dari portal OASE
              Universitas Udayana ke akun Google Calendar pribadi pengguna.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fitur Utama Layanan:</span>
              </div>
              <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600">
                <li>Sinkronisasi otomatis jadwal dari OASE.</li>
                <li>
                  Pembuatan dan pembaruan agenda secara rapi di Google Calendar.
                </li>
                <li>Pengaturan notifikasi pengingat sebelum tenggat waktu.</li>
                <li>
                  Dukungan sinkronisasi otomatis terjadwal via GitHub Actions.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Tanggung Jawab Pengguna */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              3. Tanggung Jawab Pengguna
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dalam menggunakan Layanan ini, Anda setuju untuk:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 leading-relaxed">
              <li>
                Hanya menggunakan Layanan untuk kalender akademik milik Anda
                sendiri atau kelas perkuliahan Anda yang sah.
              </li>
              <li>
                Tidak menggunakan Layanan untuk tujuan yang melanggar hukum,
                merusak infrastruktur server, atau mengganggu operasional sistem
                Universitas Udayana maupun Google LLC.
              </li>
            </ul>
          </section>

          {/* Section 4: Penafian Afiliasi */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              4. Penafian Afiliasi (Disclaimer)
            </h2>
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bukan Produk Resmi Universitas Udayana atau Google</span>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">
                Layanan ini merupakan proyek perangkat lunak independen yang
                dikembangkan oleh mahasiswa. Layanan ini <strong>TIDAK</strong>{" "}
                berafiliasi resmi, didukung oleh, atau merupakan representasi
                dari Universitas Udayana maupun Google LLC. Nama OASE,
                Universitas Udayana, dan Google Calendar digunakan semata-mata
                untuk tujuan deskriptif kompatibilitas sistem.
              </p>
            </div>
          </section>

          {/* Section 5: Penafian Jaminan & Batasan Tanggung Jawab */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              5. Batasan Tanggung Jawab
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              LAYANAN DISEDIAKAN &quot;SEBAGAIMANA ADANYA&quot; (<em>AS IS</em>)
              DAN &quot;SEBAGAIMANA TERSEDIA&quot; (<em>AS AVAILABLE</em>) TANPA
              JAMINAN DALAM BENTUK APA PUN.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pengembang tidak bertanggung jawab atas:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 leading-relaxed">
              <li>
                Keterlambatan atau kekeliruan pengumpulan tugas kuliah akibat
                perbedaan waktu atau perubahan jadwal mendadak oleh dosen.
              </li>
              <li>
                Gangguan ketersediaan pada server OASE atau Google Calendar API.
              </li>
              <li>
                Kerusakan atau kehilangan agenda kalender di luar kendali wajar
                aplikasi.
              </li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pengguna disarankan untuk tetap memverifikasi tenggat waktu tugas
              secara berkala langsung di portal resmi OASE UNUD.
            </p>
          </section>

          {/* Section 6: Perubahan Ketentuan */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#001d62]"></span>
              6. Perubahan Ketentuan Layanan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kami dapat memperbarui Syarat dan Ketentuan ini sewaktu-waktu.
              Perubahan berlaku efektif setelah dipublikasikan pada halaman ini.
              Penggunaan berkelanjutan atas Layanan ini menandakan persetujuan
              Anda terhadap ketentuan yang diperbarui.
            </p>
          </section>

          {/* Section 7: Bantuan & Kontak */}
          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-slate-600" />
              7. Kontak &amp; Dukungan
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Jika Anda memiliki pertanyaan mengenai Ketentuan Layanan ini,
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
            <Link href="/terms" className="text-[#001d62] font-semibold">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-800">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
