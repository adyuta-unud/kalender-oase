/**
 * Helper konfigurasi URL domain situs untuk SEO, Sitemap, dan Metadata
 */

export function getBaseUrl(): string {
  // 1. Jika pengguna mengatur NEXT_PUBLIC_APP_URL secara eksplisit dan bukan localhost
  const customAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (customAppUrl && !customAppUrl.includes('localhost') && !customAppUrl.includes('127.0.0.1')) {
    return customAppUrl.replace(/\/+$/, '');
  }

  // 2. Jika dideploy di Vercel Production
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '')}`;
  }

  // 3. Jika dideploy di branch preview Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  // 4. Fallback domain produksi default
  return 'https://oasee.vercel.app';
}
