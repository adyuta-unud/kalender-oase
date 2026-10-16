/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      result[key] = val;
    }
  }
  return result;
}

async function testActions() {
  const envLocal = loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  const cronSecret = process.env.CRON_SECRET || envLocal.CRON_SECRET;
  const appUrl = process.env.VERCEL_APP_URL || envLocal.NEXT_PUBLIC_APP_URL || 'https://oasee.vercel.app';

  console.log('----------------------------------------------------');
  console.log('🧪 SIMULASI TRIGGER GITHUB ACTIONS KE VERCEL');
  console.log('----------------------------------------------------');
  console.log(`Target URL : ${appUrl}/api/cron/sync`);
  console.log(`Secret     : ${cronSecret ? '••••••••' + cronSecret.slice(-6) : '(KOSONG)'}`);
  console.log('----------------------------------------------------\n');

  if (!cronSecret) {
    console.error('❌ ERROR: CRON_SECRET tidak ditemukan di environment maupun .env.local');
    process.exit(1);
  }

  const endpoint = `${appUrl.replace(/\/$/, '')}/api/cron/sync`;
  console.log(`Mengirim POST request ke ${endpoint}...`);

  try {
    const startTime = Date.now();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const elapsed = Date.now() - startTime;
    const status = res.status;
    let body: any;

    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }

    console.log(`\nHTTP Status : ${status} (${elapsed}ms)`);
    console.log('Response Payload:');
    console.log(JSON.stringify(body, null, 2));

    if (status === 200 && body?.success) {
      console.log('\n🎉 HASIL: SUKSES! Webhook sinkronisasi berjalan normal persis seperti di GitHub Actions.');
    } else {
      console.log('\n❌ HASIL: GAGAL! Periksa kembali kredensial atau error di atas.');
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error('❌ Network error saat memanggil endpoint:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

testActions();
