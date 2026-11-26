export const RSS_GAME_PROJECT_KEY = 'rss-liquid-flow';
export const RSS_CORE_API = 'https://rsscore.cv';

export interface RssPlayerSession {
  token: string;
  expires_at: number;
  user: { id: string; email: string; name: string; email_verified?: boolean };
}

const SESSION_KEY = 'rss-liquid-flow-player-session';
const GUEST_KEY = 'rss-liquid-flow-guest-mode';

export function readPlayerSession(): RssPlayerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as RssPlayerSession;
    if (!session.token || !Number.isFinite(session.expires_at) || session.expires_at <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function savePlayerSession(session: RssPlayerSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(GUEST_KEY);
}

export function clearPlayerSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isGuestMode(): boolean {
  return localStorage.getItem(GUEST_KEY) === '1';
}

export function setGuestMode(): void {
  localStorage.setItem(GUEST_KEY, '1');
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${RSS_CORE_API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-rss-app-id': RSS_GAME_PROJECT_KEY },
    body: JSON.stringify({ ...body, project_key: RSS_GAME_PROJECT_KEY }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || `RSS Core request failed (${response.status})`);
  return payload as T;
}

export async function registerPlayer(input: { email: string; password: string; display_name: string }) {
  return request<{ ok: boolean; registered: boolean; email_verification_required: boolean }>(
    '/api/v1/customer-auth/register', input,
  );
}

export async function loginPlayer(input: { email: string; password: string }) {
  return request<RssPlayerSession>('/api/v1/customer-auth/login', input);
}

export async function resendPlayerVerification(email: string) {
  return request<{ ok: boolean; message: string }>('/api/v1/customer-auth/resend-verification', { email });
}

export async function requestPlayerPasswordReset(email: string) {
  return request<{ ok: boolean; message: string }>('/api/v1/customer-auth/forgot-password', { email });
}

export async function verifyPlayerPasswordReset(email: string, code: string) {
  return request<{ ok: boolean; reset_token: string }>('/api/v1/customer-auth/verify-password-reset', { email, code });
}

export async function resetPlayerPassword(email: string, reset_token: string, new_password: string) {
  return request<{ ok: boolean; password_reset: boolean }>('/api/v1/customer-auth/reset-password', {
    email, reset_token, new_password,
  });
}

export async function validatePlayerSession(token: string): Promise<RssPlayerSession['user']> {
  const response = await fetch(`${RSS_CORE_API}/api/v1/customer-auth/me`, {
    headers: { authorization: `Bearer ${token}`, 'x-rss-app-id': RSS_GAME_PROJECT_KEY },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.user) throw new Error(payload.error || 'Session expired');
  return payload.user as RssPlayerSession['user'];
}
