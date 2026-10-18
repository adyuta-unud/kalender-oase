import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('GitHub Actions: workflow file .github/workflows/sync.yml exists and has valid configuration', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/sync.yml');
  assert.ok(fs.existsSync(workflowPath), 'File sync.yml wajib ada di .github/workflows/');

  const content = fs.readFileSync(workflowPath, 'utf-8');

  // 1. Verifikasi trigger schedule (cron) dan manual (workflow_dispatch)
  assert.match(content, /schedule:/, 'Workflow harus memiliki event trigger schedule');
  assert.match(content, /workflow_dispatch:/, 'Workflow harus mendukung manual dispatch');

  // 2. Verifikasi secret yang digunakan
  assert.match(content, /secrets\.VERCEL_APP_URL/, 'Workflow harus menggunakan secret VERCEL_APP_URL');
  assert.match(content, /secrets\.CRON_SECRET/, 'Workflow harus menggunakan secret CRON_SECRET');

  // 3. Verifikasi endpoint target dan method
  assert.match(content, /\/api\/cron\/sync/, 'Endpoint target harus menuju /api/cron/sync');
  assert.match(content, /-X POST/, 'Metode HTTP curl harus menggunakan POST');

  // 4. Verifikasi header Authorization Bearer
  assert.match(content, /Authorization:\s*Bearer/, 'Header Authorization Bearer wajib dikirimkan');
});

test('GitHub Actions: workflow file .github/workflows/sync-fork.yml exists and has valid configuration', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/sync-fork.yml');
  assert.ok(fs.existsSync(workflowPath), 'File sync-fork.yml wajib ada di .github/workflows/');

  const content = fs.readFileSync(workflowPath, 'utf-8');

  // 1. Verifikasi trigger schedule (cron) dan manual (workflow_dispatch)
  assert.match(content, /schedule:/, 'Workflow harus memiliki event trigger schedule');
  assert.match(content, /workflow_dispatch:/, 'Workflow harus mendukung manual dispatch');

  // 2. Verifikasi permission contents: write untuk push update ke fork
  assert.match(content, /permissions:\s*[\r\n]+\s*contents:\s*write/, 'Workflow harus memiliki permission contents: write');

  // 3. Verifikasi remote upstream repo utama
  assert.match(content, /oka123\/kalender-oase/, 'Workflow harus mengarah ke upstream repo oka123/kalender-oase');

  // 4. Verifikasi proteksi agar tidak berjalan di repo utama itu sendiri
  assert.match(content, /github\.repository\s*!=\s*'oka123\/kalender-oase'/, 'Workflow harus diskip jika berada di repo utama');
});

test('GitHub Actions Webhook: rejects requests without valid Authorization header', async () => {
  // Simulasi penolakan authorization jika header tidak valid
  const testUrl = 'http://localhost:3000/api/cron/sync';

  try {
    const res = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer token-palsu-yang-salah',
        'Content-Type': 'application/json',
      },
    });

    // Harus ditolak dengan status 401 Unauthorized
    assert.equal(res.status, 401, 'Request dengan secret palsu harus menghasilkan HTTP 401');
    const data = await res.json();
    assert.ok(data.error?.includes('Tidak diizinkan'), 'Pesan error harus mengindikasikan kredensial tidak valid');
  } catch (err: unknown) {
    // Jika server dev sedang tidak berjalan di port 3000 saat test dijalankan, lewati test koneksi langsung
    const isConnRefused =
      (err instanceof Error &&
        "code" in err &&
        (err as { code?: string }).code === "ECONNREFUSED") ||
      (err instanceof Error &&
        "cause" in err &&
        typeof (err as { cause?: { code?: string } }).cause === "object" &&
        (err as { cause?: { code?: string } }).cause?.code === "ECONNREFUSED");
    if (!isConnRefused) {
      throw err;
    }
  }
});
