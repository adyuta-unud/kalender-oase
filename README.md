# 📅 Kalender OASE — Sinkronisasi Moodle ke Google Calendar & WhatsApp Bot

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Google Calendar API](https://img.shields.io/badge/Google%20Calendar-API%20v3-4285F4?logo=googlecalendar)](https://developers.google.com/calendar)
[![Cloudflare Turnstile](https://img.shields.io/badge/Cloudflare-Turnstile-F38020?logo=cloudflare)](https://www.cloudflare.com/products/turnstile/)
[![Groq AI](https://img.shields.io/badge/Groq%20Cloud-AI%20LPU-orange)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Aplikasi web modern untuk menyinkronkan jadwal perkuliahan, tenggat tugas, kuis, dan ujian dari portal **OASE Moodle Universitas Udayana** ke **Google Calendar**, dilengkapi **Notifikasi WhatsApp Otomatis** serta **Chatbot Asisten AI WhatsApp** yang interaktif, aman, dan hemat kuota.

---

## Fitur Utama

### 1. Sinkronisasi Kalender OASE

- **Sinkronisasi Praktis:** Hubungkan akun Google, masukkan akun SSO OASE (NIM & Password), dan jadwal tugas yang belum dikerjakan langsung masuk ke Google Calendar.
- **Filter Tugas Belum Dikerjakan & Penandaan Selesai:** Mengambil tugas aktif langsung dari API Moodle OASE (`core_calendar_get_action_events_by_timesort`). Tugas yang telah dikumpulkan otomatis ditandai `✅ [Selesai]` dan alarm pengingatnya dinonaktifkan.
- **Pencegahan Duplikasi (Idempoten):** Mendeteksi agenda yang sudah ada agar tidak terjadi duplikasi, serta memperbarui otomatis jika ada perubahan jadwal atau revisi dari dosen.
- **Pilihan Kalender Fleksibel:**
  - **Kalender Khusus (Disarankan):** Membuat kalender terpisah bernama _"OASE UNUD - Akademik"_ agar jadwal kuliah tidak bercampur dengan agenda pribadi.
  - **Kalender Utama (Primary):** Menyinkronkan langsung ke kalender utama akun Google Anda.
  - **Kalender Lainnya:** Memilih kalender Google yang sudah ada di akun Anda.
- **Notifikasi Pengingat Google Calendar:** Opsi alarm pengingat otomatis sebelum batas pengumpulan tugas (24 jam, 2 jam, atau 30 menit sebelumnya).

### 2. Notifikasi & Chatbot Pintar WhatsApp (Fonnte + Groq AI)

- **Notifikasi Tugas Baru ke WhatsApp:** Mengirimkan pesan notifikasi rapi dan bebas spam ke nomor pribadi dan/atau grup WhatsApp setiap kali ditemukan tugas baru saat proses sinkronisasi.
- **Pengecekan Tugas / Deadline via Chat:** Mahasiswa dapat mengecek tugas langsung di WhatsApp dengan mengetik _"cek tugas"_, _"deadline"_, atau _"jadwal oase"_. Bot akan mengambil jadwal tugas aktif dari Google Calendar secara _real-time_.
- **Asisten AI Terintegrasi (Groq Cloud):** Menjawab pertanyaan seputar perkuliahan dan informasi akademik dengan bahasa Indonesia yang natural, ramah, dan ringkas.
- **Filter Mention Grup yang Presisi:** Di dalam grup WhatsApp, bot **hanya merespons jika dimention** (berdasarkan WhatsApp LID bot `@127020...`, nomor bot `@628...`, atau tag `@bot`). Percakapan antar anggota grup lainnya tidak akan dibalas sehingga menghemat kuota Fonnte.
- **Kutip Balasan (Quoted Reply):** Setiap balasan bot dikirimkan berupa _reply_ ke pesan pengguna (memanfaatkan `inboxid`), baik di chat pribadi maupun di grup.
- **Proteksi Anti-Looping:** Mencegah bot membalas pesannya sendiri secara berulang jika nomor pengirim sama dengan nomor bot.

### 3. Keamanan & Performa

- **Aman & Stateless:**
  - **Tanpa Database Server:** Tidak menyimpan email, kata sandi, atau data pribadi di database terpusat.
  - **Penyimpanan Lokal Opsional:** Kredensial SSO disimpan di `localStorage` peramban pengguna hanya jika mencentang opsi simpan.
  - **Cookie Terenkripsi:** Menggunakan enkripsi `AES-256-GCM` dengan atribut `HttpOnly`, `SameSite=Lax`, dan `Secure`.
  - **Rate Limiting & Anti-Bot:** Dilengkapi pembatasan request per IP dan verifikasi keamanan Cloudflare Turnstile.
  - **Otentikasi Webhook Aman:** Dilindungi verifikasi `FONNTE_WEBHOOK_SECRET` dengan _timing-safe comparison_ untuk mencegah _timing attacks_.
- **Otomatisasi Terjadwal (GitHub Actions & Cron-Job):** Mendukung sinkronisasi berkala di latar belakang tanpa harus membuka web setiap hari.

---

## Tech Stack

- **Framework:** [Next.js 16.4](https://nextjs.org/) (App Router, Turbopack, Cache Components, Partial Prefetching)
- **UI:** [React 19](https://react.dev/) & [Tailwind CSS v4](https://tailwindcss.com/)
- **Bahasa:** [TypeScript](https://www.typescriptlang.org/)
- **Integrasi API:**
  - [Google APIs Client (`googleapis`)](https://github.com/googleapis/google-api-nodejs-client) — Google Calendar API v3 & OAuth 2.0
  - API Internal Moodle OASE — Endpoint `core_calendar_get_action_events_by_timesort` via SSO Universitas Udayana
  - [Fonnte API](https://fonnte.com/) — WhatsApp Gateway (Notifikasi & Webhook Auto-Reply)
  - [Groq Cloud](https://console.groq.com/) — AI Assistant (Qwen 2.5 / Llama 3)
  - [Cloudflare Turnstile](https://challenges.cloudflare.com) — Verifikasi keamanan bot
- **Ikon:** [Lucide React](https://lucide.dev/)
- **Testing:** Node.js Native Test Runner (`node:test`, `node:assert/strict`)

---

## Panduan Instalasi Lokal

### 1. Prasyarat

- **Node.js** versi 20.x atau lebih baru
- Package manager **pnpm** (atau `npm` / `yarn`)

### 2. Kloning Repositori

```bash
git clone https://github.com/oka123/kalender-oase.git
cd kalender-oase
```

### 3. Instal Dependensi

```bash
pnpm install
```

### 4. Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Sesuaikan konfigurasi pada `.env.local`:

```env
# 1. Kredensial SSO OASE Moodle (Opsional untuk default server / Cron otomatis)
OASE_USERNAME="2208561001"
OASE_PASSWORD="password_sso_anda"

# 2. Google OAuth 2.0 (Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_REFRESH_TOKEN=""

# 3. Pengaturan Aplikasi & Keamanan
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_SECRET="kunci-rahasia-acak-minimal-32-karakter"
CRON_SECRET="kunci-rahasia-untuk-cron-endpoint"

# 4. Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAA..."
TURNSTILE_SECRET_KEY="0x4AAAAAA..."

# 5. WhatsApp Gateway (Fonnte)
FONNTE_TOKEN="your-fonnte-token"
FONNTE_TARGET_PHONE="6281234567890"
FONNTE_GROUP_ID="120363410925013058@g.us"
FONNTE_WEBHOOK_SECRET="your-random-webhook-secret-key"
FONNTE_BOT_PHONE="6285187976800"
FONNTE_BOT_LID="127020117803175"

# 6. Groq Cloud AI Assistant
GROQ_API_KEY="gsk_your_groq_api_key"
GROQ_MODEL="qwen/qwen3.8-27b"
```

Jalankan server pengembangan:

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## Konfigurasi Kredensial

### A. Google OAuth 2.0 (Google Cloud Console)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat proyek baru.
2. Buka **APIs & Services** > **Library**, lalu aktifkan **Google Calendar API**.
3. Buka **OAuth consent screen**:
   - Pilih User Type: **External**.
   - Isi nama aplikasi dan email developer.
   - Tambahkan scopes:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Pada bagian **Test users**, tambahkan email akun Google yang akan digunakan untuk pengujian.
4. Buka **Credentials** > **Create Credentials** > **OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` _(lokal)_
     - `https://domain-anda.vercel.app/api/auth/google/callback` _(produksi)_
5. Masukkan **Client ID** dan **Client Secret** ke file `.env.local`.

---

### B. Cloudflare Turnstile

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) lalu masuk ke menu **Turnstile**.
2. Buat widget baru:
   - **Widget name:** `Kalender OASE`
   - **Hostnames:** Tambahkan `localhost` dan domain produksi Anda.
   - **Widget Mode:** Pilih `Managed`.
3. Masukkan **Site Key** dan **Secret Key** ke `.env.local`.

---

### C. Fonnte WhatsApp & Webhook

1. Daftar dan dapatkan Token di [Fonnte Dashboard](https://fonnte.com/).
2. Masukkan `FONNTE_TOKEN` ke `.env.local`.
3. Di menu **Device > Edit**:
   - **Webhook URL:** Masukkan URL endpoint dengan parameter rahasia:
     `https://domain-anda.vercel.app/api/webhook/whatsapp?secret=your-webhook-secret`
   - Aktifkan opsi **Auto Read** (opsional) agar webhook berjalan lancar.
4. Salin nomor perangkat bot ke `FONNTE_BOT_PHONE` dan WhatsApp LID bot ke `FONNTE_BOT_LID` untuk memastikan mention di grup terdeteksi dengan presisi.

---

### D. Groq Cloud AI Assistant

1. Dapatkan API key gratis di [Groq Console](https://console.groq.com/keys).
2. Masukkan ke variabel `GROQ_API_KEY` atau `GROQ_API_KEYS` di `.env.local`.
3. **Fitur Round Robin & Pencegahan Limit (429):** Anda dapat memasukkan beberapa API Key sekaligus (dipisahkan tanda koma), misalnya:
   ```env
   GROQ_API_KEYS="gsk_key1,gsk_key2,gsk_key3"
   ```
   Bot akan otomatis merotasi penggunaan key secara sirkular (*round-robin*), dan secara cerdas berpindah ke key berikutnya jika salah satu key terkena *rate limit* (HTTP 429).
4. Model default yang digunakan adalah `qwen/qwen3.8-27b` (bisa disesuaikan via `GROQ_MODEL`, misal `llama-3.3-70b-versatile`).

---

## Otomatisasi Sinkronisasi

### GitHub Actions

Anda dapat mengaktifkan sinkronisasi otomatis menggunakan GitHub Actions gratis:

1. Buka repositori Anda di GitHub > **Settings** > **Secrets and variables** > **Actions**.
2. Tambahkan Repository Secrets:
   - `VERCEL_APP_URL`: URL aplikasi Anda di Vercel (contoh: `https://oasee.vercel.app`)
   - `CRON_SECRET`: Secret token yang sama dengan `CRON_SECRET` di Vercel
3. Workflow di `.github/workflows/sync.yml` akan secara otomatis memicu sinkronisasi berkala ke server Vercel Anda.

### Cron-Job.org (Opsional)

Gunakan [cron-job.org](https://console.cron-job.org/) untuk menjadwalkan trigger API GitHub Actions atau endpoint `/api/cron/sync` dengan header Authorization `Bearer your-cron-secret` agar sinkronisasi selalu berjalan tepat waktu.

---

## Pengujian & Kualitas Kode

```bash
# Menjalankan seluruh Unit Tests
pnpm test

# Menjalankan ESLint
pnpm lint

# Membangun build produksi Next.js
pnpm build
```

---

## Penafian (Disclaimer)

- **Bukan Produk Resmi:** Aplikasi ini merupakan proyek independen yang dikembangkan oleh mahasiswa untuk membantu sivitas akademika Universitas Udayana. Aplikasi ini tidak berafiliasi resmi dengan Universitas Udayana, Google LLC, maupun Fonnte.
- **Kepatuhan Privasi:** Mematuhi [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy). Data pengguna tidak pernah disimpan di database eksternal, tidak dijual kepada pihak ketiga, dan tidak digunakan untuk melatih model AI.

Informasi lebih lanjut dapat dilihat pada halaman [Privacy Policy](/privacy) dan [Terms of Service](/terms).

---

## Lisensi

Didistribusikan di bawah lisensi [MIT](LICENSE).
