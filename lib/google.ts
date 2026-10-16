import { google } from 'googleapis';
import type { GoogleSessionData } from '../types/calendar.ts';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function cleanEnv(val?: string | null): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Buat instance OAuth2 client Google
 */
export function createOAuth2Client(redirectUri?: string) {
  const clientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  const configuredRedirectUri = cleanEnv(redirectUri || process.env.GOOGLE_REDIRECT_URI);

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum dikonfigurasi di environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, configuredRedirectUri || undefined);
}

/**
 * Generate authorization URL untuk user login ke Google dengan dukungan proteksi state CSRF
 */
export function getAuthorizationUrl(redirectUri?: string, state?: string): string {
  const oauth2Client = createOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Meminta refresh_token
    prompt: 'consent', // Memastikan refresh_token selalu dikembalikan
    scope: SCOPES,
    ...(state ? { state } : {}),
  });
}

/**
 * Dapatkan authenticated OAuth2 client dari session yang tersimpan atau dari refresh token
 */
export async function getAuthenticatedOAuth2Client(explicitRefreshToken?: string) {
  // 1. Jika ada token eksplisit yang diberikan (misal dari script/cron tertentu)
  if (explicitRefreshToken) {
    const cleanedToken = cleanEnv(explicitRefreshToken);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: cleanedToken,
    });
    return oauth2Client;
  }

  // 2. Prioritaskan sesi pengguna yang sedang login di browser (jika di environment Next.js)
  try {
    const { getSession, saveSession } = await import('./session.ts');
    const session = await getSession();
    if (session && session.tokens) {
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: session.tokens.access_token || undefined,
        refresh_token: session.tokens.refresh_token || undefined,
        scope: session.tokens.scope || undefined,
        token_type: session.tokens.token_type || undefined,
        expiry_date: session.tokens.expiry_date || undefined,
      });

      // Pasang event listener untuk memperbarui session saat token diperbarui otomatis oleh googleapis
      oauth2Client.on('tokens', async (newTokens) => {
        try {
          const updatedSession: GoogleSessionData = {
            ...session,
            tokens: {
              ...session.tokens,
              ...newTokens,
            },
          };
          await saveSession(updatedSession);
        } catch {
          // Abaikan jika penyimpanan session gagal di background
        }
      });

      return oauth2Client;
    }
  } catch {
    // Abaikan jika dipanggil di luar konteks request Next.js (misal test runner)
  }

  // 3. Fallback ke environment variable (berguna untuk background cron job tanpa sesi cookie)
  const envRefreshToken = cleanEnv(process.env.GOOGLE_REFRESH_TOKEN);
  if (envRefreshToken) {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: envRefreshToken,
    });
    return oauth2Client;
  }

  return null;
}

/**
 * Ambil informasi profil user (email, name, picture) menggunakan OAuth2 client
 */
export async function getUserProfile(oauth2Client: InstanceType<typeof google.auth.OAuth2>) {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const response = await oauth2.userinfo.get();
  return response.data;
}
