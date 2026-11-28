import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { Request, Response } from 'express';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral in-memory fallback when AUTH_TOKEN_SECRET is not set
const SERVER_SECRET =
  process.env.AUTH_TOKEN_SECRET && process.env.AUTH_TOKEN_SECRET.trim().length >= 16
    ? process.env.AUTH_TOKEN_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const WORKSPACE_ROOT = path.resolve(process.cwd());
const DATA_DIR = path.resolve(WORKSPACE_ROOT, '.data');
const ACCOUNTS_FILE = path.resolve(DATA_DIR, 'accounts.json');

interface ServerAccountRecord {
  email: string;
  displayName: string;
  passwordHash: string;
  verified: boolean;
  lastLevel: number;
  createdAt: number;
}

interface PendingOtpRecord {
  email: string;
  displayName: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN_MS = 45 * 1000; // 45 seconds between resends
const OTP_MAX_ATTEMPTS = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX_SENDS = 5;

const pendingOtps = new Map<string, PendingOtpRecord>();
const sendRateLog = new Map<string, number[]>();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 5 || normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeDisplayName(value: unknown, fallbackEmail: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const cleaned = raw.replace(/\s+/g, ' ').slice(0, 32);
  if (cleaned.length >= 2) return cleaned;
  const fromEmail = fallbackEmail.split('@')[0].replace(/[._-]+/g, ' ').trim().slice(0, 24);
  return fromEmail.length >= 2 ? fromEmail : 'Player';
}

function ensureDataDir(): void {
  if (!DATA_DIR.startsWith(WORKSPACE_ROOT + path.sep)) {
    throw new Error('Invalid data directory path');
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function loadAccounts(): Record<string, ServerAccountRecord> {
  try {
    ensureDataDir();
    if (!ACCOUNTS_FILE.startsWith(DATA_DIR + path.sep) || !fs.existsSync(ACCOUNTS_FILE)) {
      return {};
    }
    const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts: Record<string, ServerAccountRecord>): void {
  ensureDataDir();
  if (!ACCOUNTS_FILE.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid accounts storage path');
  }
  const tmpFile = path.resolve(DATA_DIR, `accounts.${crypto.randomBytes(6).toString('hex')}.tmp`);
  fs.writeFileSync(tmpFile, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  fs.renameSync(tmpFile, ACCOUNTS_FILE);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function hashOtp(email: string, otp: string): string {
  return crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(`otp:${email}:${otp}`)
    .digest('hex');
}

function verifyOtpHash(email: string, otp: string, expectedHex: string): boolean {
  const actualBuf = Buffer.from(hashOtp(email, otp), 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function signSessionToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(`session:${payload}`)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(`session:${payload}`)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.sub || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    return parsed.sub;
  } catch {
    return null;
  }
}

type EmailProviderType = 'resend' | null;

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.SENDER_EMAIL?.trim());
}

function detectEmailProvider(): EmailProviderType {
  return isResendConfigured() ? 'resend' : null;
}

interface ResendAttachment {
  filename: string;
  content: string;
  content_id?: string;
}

const EMAIL_LOGO_CID = 'rss-liquid-flow-logo';
let cachedInlineLogoAttachment: ResendAttachment | null | undefined;

function loadInlineEmailLogoAttachment(): ResendAttachment | null {
  if (cachedInlineLogoAttachment !== undefined) {
    return cachedInlineLogoAttachment;
  }
  const publicDir = path.resolve(WORKSPACE_ROOT, 'public');
  const candidates = [
    path.resolve(publicDir, 'pwa-192x192.png'),
    path.resolve(publicDir, 'logo.png'),
  ];
  for (const filePath of candidates) {
    if (!filePath.startsWith(publicDir + path.sep)) continue;
    try {
      if (fs.existsSync(filePath)) {
        const base64 = fs.readFileSync(filePath).toString('base64');
        cachedInlineLogoAttachment = {
          filename: 'rss-liquid-flow-logo.png',
          content: base64,
          content_id: EMAIL_LOGO_CID,
        };
        return cachedInlineLogoAttachment;
      }
    } catch {
      // Try next candidate
    }
  }
  cachedInlineLogoAttachment = null;
  return null;
}

function buildOtpEmailContent(
  displayName: string,
  otp: string,
  hasInlineLogo: boolean,
  senderAddress?: string
) {
  const safeName = escapeHtml(displayName);
  const safeSender = senderAddress ? escapeHtml(senderAddress) : '';
  const spacedOtp = otp.split('').join(' ');
  const currentYear = new Date().getFullYear();
  const subject = `${otp} is your RSS Liquid Flow verification code`;

  const text = [
    'RAZEEN SMART SOLUTION · RSS LIQUID FLOW',
    '========================================',
    '',
    `Hi ${displayName},`,
    '',
    `Your RSS Liquid Flow email verification code is: ${otp}`,
    '',
    'Enter this 6-digit code in the app to verify your account and start playing.',
    'This code expires in 10 minutes and can only be used once.',
    'For your security, never share this code with anyone.',
    '',
    'If you did not request this verification code, you can safely ignore this email.',
    '',
    '----------------------------------------',
    'Razeen Smart Solution',
    'RSS Liquid Flow — Crystal Glass Liquid Sorting Adventure',
    'Website: https://rssapps.net',
    'Game Portal: https://rssapps.net/games/liquid-flow/',
    ...(senderAddress ? [`Sent from: ${senderAddress}`] : []),
    `© ${currentYear} Razeen Smart Solution. All rights reserved.`,
  ].join('\n');

  const profileAvatarHtml = hasInlineLogo
    ? `<img src="cid:${EMAIL_LOGO_CID}" alt="RSS Liquid Flow" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:12px;background-color:#FFFFFF;padding:4px;box-sizing:border-box;object-fit:contain;" />`
    : '';

  const footerLogoHtml = hasInlineLogo
    ? `<img src="cid:${EMAIL_LOGO_CID}" alt="RSS Liquid Flow" width="32" height="32" style="display:block;width:32px;height:32px;border-radius:8px;background-color:#FFFFFF;padding:3px;box-sizing:border-box;object-fit:contain;" />`
    : '';

  const heroLogoHtml = hasInlineLogo
    ? `<div style="margin:0 auto 14px;width:96px;height:96px;border-radius:24px;background-color:#FFFFFF;border:2px solid #FFE680;padding:8px;box-sizing:border-box;box-shadow:0 12px 28px rgba(0,0,0,0.28);">
          <img src="cid:${EMAIL_LOGO_CID}" alt="RSS Liquid Flow Logo" width="76" height="76" style="display:block;width:76px;height:76px;margin:0 auto;object-fit:contain;" />
        </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>RSS Liquid Flow Email Verification</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:#081524;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ECF7FF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#0F2438;border:1px solid #224B6E;border-radius:22px;overflow:hidden;">
    <!-- Top Studio Accent Bar -->
    <tr>
      <td style="height:4px;background:linear-gradient(90deg,#2BD4C5 0%,#38BDF8 50%,#F5BC38 100%);font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    <!-- Sender Profile Header -->
    <tr>
      <td style="padding:16px 24px;background-color:#0A1B2E;border-bottom:1px solid #1C3E5C;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            ${hasInlineLogo ? `<td width="56" valign="middle">${profileAvatarHtml}</td>` : ''}
            <td valign="middle">
              <div style="font-size:15px;font-weight:800;color:#FFFFFF;line-height:1.25;">RSS Liquid Flow</div>
              <div style="font-size:12px;color:#7FD8CF;line-height:1.35;">
                Razeen Smart Solution${safeSender ? ` &middot; ${safeSender}` : ''}
              </div>
            </td>
            <td align="right" valign="middle" style="font-size:11px;font-weight:700;color:#9EC5DC;letter-spacing:0.6px;white-space:nowrap;">
              ACCOUNT SECURITY
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Hero Logo & Headline -->
    <tr>
      <td style="padding:30px 28px 22px;text-align:center;background:linear-gradient(135deg,#0B1F34 0%,#143957 100%);">
        ${heroLogoHtml}
        <div style="font-size:11px;font-weight:700;letter-spacing:2.4px;color:#5EEAD4;text-transform:uppercase;">
          Razeen Smart Solution
        </div>
        <h1 style="margin:8px 0 6px;font-size:24px;line-height:1.25;color:#FFFFFF;">
          Verify Your Email Address
        </h1>
        <p style="margin:0;font-size:13px;color:#A9CBE0;">
          RSS Liquid Flow &middot; Crystal Glass Liquid Sorting Adventure
        </p>
      </td>
    </tr>

    <!-- Main OTP Body -->
    <tr>
      <td style="padding:28px 28px 24px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#E2F1FA;">
          Hi <strong>${safeName}</strong>,
        </p>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#B9D4E6;">
          Thank you for creating your <strong>RSS Liquid Flow</strong> account. Enter the 6-digit verification code below in the game to confirm your email address and begin your journey:
        </p>

        <!-- 6-Digit OTP Box -->
        <div style="margin:0 auto 22px;padding:20px 16px;background-color:#081827;border:1px solid #2BD4C5;border-radius:16px;text-align:center;">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.8px;color:#8EB1C9;text-transform:uppercase;margin-bottom:8px;">
            Your 6-Digit Verification Code
          </div>
          <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:#5EEAD4;line-height:1.2;">
            ${spacedOtp}
          </div>
        </div>

        <!-- Security Notice Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B1D30;border:1px solid #1E4262;border-radius:12px;">
          <tr>
            <td style="padding:14px 16px;font-size:12px;line-height:1.55;color:#A9CBE0;">
              <strong style="color:#FFE680;">Security Notice:</strong> This verification code expires in <strong>10 minutes</strong> and can only be used once. Never share your OTP with anyone&mdash;Razeen Smart Solution will never ask you for this code.
            </td>
          </tr>
        </table>

        <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#7D9FB8;">
          If you didn't request this verification email, you can safely ignore and delete this message.
        </p>
      </td>
    </tr>

    <!-- Company Branding & Official Footer -->
    <tr>
      <td style="padding:22px 28px;background-color:#081726;border-top:1px solid #1C3E5C;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            ${hasInlineLogo ? `<td width="42" valign="top" style="padding-top:2px;">${footerLogoHtml}</td>` : ''}
            <td valign="top">
              <div style="font-size:13px;font-weight:800;color:#FFFFFF;line-height:1.3;">
                Razeen Smart Solution
              </div>
              <div style="font-size:12px;color:#8EB1C9;line-height:1.45;margin-top:2px;">
                Creators of RSS Liquid Flow &middot; Interactive Puzzle &amp; Casual Games Studio
              </div>
              <div style="margin-top:10px;font-size:12px;line-height:1.5;">
                <a href="https://rssapps.net" style="color:#5EEAD4;text-decoration:none;font-weight:600;">rssapps.net</a>
                <span style="color:#456884;padding:0 6px;">&middot;</span>
                <a href="https://rssapps.net/games/liquid-flow/" style="color:#5EEAD4;text-decoration:none;font-weight:600;">Play RSS Liquid Flow</a>
              </div>
            </td>
          </tr>
        </table>

        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #16324A;font-size:11px;line-height:1.55;color:#6E90AA;">
          <div>
            This is an automated account verification email sent by <strong>Razeen Smart Solution</strong>${safeSender ? ` via ${safeSender}` : ''}.
          </div>
          <div style="margin-top:4px;">
            &copy; ${currentYear} Razeen Smart Solution. All rights reserved.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: ResendAttachment[];
}): Promise<'resend'> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const senderEmail = process.env.SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const from = senderEmail.includes('<')
    ? senderEmail
    : `RSS Liquid Flow <${senderEmail}>`;

  const payload: Record<string, unknown> = {
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  if (params.attachments && params.attachments.length > 0) {
    payload.attachments = params.attachments;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`RESEND_FAILED:${response.status}:${errBody.slice(0, 180)}`);
  }

  return 'resend';
}

async function sendRealOtpEmail(
  toEmail: string,
  displayName: string,
  otp: string
): Promise<'resend'> {
  const logoAttachment = loadInlineEmailLogoAttachment();
  const senderAddress = process.env.SENDER_EMAIL?.trim();
  const { subject, text, html } = buildOtpEmailContent(
    displayName,
    otp,
    Boolean(logoAttachment),
    senderAddress
  );
  return sendResendEmail({
    to: toEmail,
    subject,
    html,
    text,
    attachments: logoAttachment ? [logoAttachment] : undefined,
  });
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (sendRateLog.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_SENDS) {
    sendRateLog.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  sendRateLog.set(key, timestamps);
  return true;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  // Check whether real email OTP delivery is configured (no secrets returned)
  app.get('/api/auth/email-status', (_req: Request, res: Response) => {
    const provider = detectEmailProvider();
    res.json({
      configured: Boolean(provider),
      provider,
    });
  });

  // Step 1 of Registration: Generate cryptographic 6-digit OTP and send real email
  app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
      return;
    }

    const displayName = normalizeDisplayName(req.body?.displayName, email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'Password must be between 6 and 128 characters.',
      });
      return;
    }

    const accounts = loadAccounts();
    if (accounts[email]?.verified) {
      res.status(409).json({
        ok: false,
        error: 'An account with this email already exists. Please switch to Login.',
      });
      return;
    }

    const now = Date.now();
    const existingPending = pendingOtps.get(email);
    if (existingPending && now - existingPending.lastSentAt < OTP_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - existingPending.lastSentAt)) / 1000);
      res.status(429).json({
        ok: false,
        error: `Please wait ${waitSec}s before requesting another verification email.`,
        retryAfterSeconds: waitSec,
      });
      return;
    }

    const clientKey = `${req.ip || 'unknown'}:${email}`;
    if (!checkRateLimit(clientKey)) {
      res.status(429).json({
        ok: false,
        error: 'Too many OTP requests. Please wait a few minutes and try again.',
      });
      return;
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    try {
      const provider = await sendRealOtpEmail(email, displayName, otp);

      pendingOtps.set(email, {
        email,
        displayName,
        otpHash: hashOtp(email, otp),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
      });

      res.json({
        ok: true,
        provider,
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
        cooldownSeconds: Math.floor(OTP_COOLDOWN_MS / 1000),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'EMAIL_NOT_CONFIGURED') {
        res.status(503).json({
          ok: false,
          code: 'EMAIL_NOT_CONFIGURED',
          error:
            'Resend email delivery is not configured on the server yet. Add RESEND_API_KEY and SENDER_EMAIL in Settings → Secrets.',
        });
        return;
      }
      console.error('[auth/send-otp] Resend email dispatch failed:', message.split(':')[0]);
      res.status(502).json({
        ok: false,
        code: 'EMAIL_SEND_FAILED',
        error:
          'Unable to send the verification email through Resend right now. Please verify your email address and try again.',
      });
    }
  });

  // Step 2 of Registration: Verify 6-digit OTP and create verified account
  app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email) {
      res.status(400).json({ ok: false, error: 'Invalid email address.' });
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      res.status(400).json({ ok: false, error: 'Please enter a valid 6-digit OTP code.' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ ok: false, error: 'Invalid password length.' });
      return;
    }

    const record = pendingOtps.get(email);
    if (!record) {
      res.status(400).json({
        ok: false,
        error: 'No active verification code found. Please request a new OTP.',
      });
      return;
    }

    if (Date.now() > record.expiresAt) {
      pendingOtps.delete(email);
      res.status(400).json({
        ok: false,
        error: 'Your verification code has expired. Please request a fresh OTP.',
      });
      return;
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      pendingOtps.delete(email);
      res.status(429).json({
        ok: false,
        error: 'Too many incorrect attempts. Please request a new verification code.',
      });
      return;
    }

    record.attempts += 1;
    if (!verifyOtpHash(email, otp, record.otpHash)) {
      const remaining = Math.max(0, OTP_MAX_ATTEMPTS - record.attempts);
      if (remaining === 0) {
        pendingOtps.delete(email);
      }
      res.status(400).json({
        ok: false,
        error:
          remaining > 0
            ? `Incorrect OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Too many incorrect attempts. Please request a new verification code.',
      });
      return;
    }

    // OTP verified — consume immediately (single-use)
    pendingOtps.delete(email);

    const accounts = loadAccounts();
    const displayName = normalizeDisplayName(req.body?.displayName || record.displayName, email);
    // Every newly registered account starts fresh at Level 1
    const continueLevel = 1;

    accounts[email] = {
      email,
      displayName,
      passwordHash: hashPassword(password),
      verified: true,
      lastLevel: continueLevel,
      createdAt: Date.now(),
    };
    saveAccounts(accounts);

    const token = signSessionToken(email);
    res.json({
      ok: true,
      token,
      user: {
        email,
        displayName,
        continueLevel,
      },
    });
  });

  // Existing account login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ ok: false, error: 'Please enter your password (6+ characters).' });
      return;
    }

    const accounts = loadAccounts();
    const account = accounts[email];
    if (!account || !account.verified) {
      res.status(404).json({
        ok: false,
        error: 'No verified account found for this email. Please register and verify via email OTP first.',
      });
      return;
    }

    if (!verifyPassword(password, account.passwordHash)) {
      res.status(401).json({
        ok: false,
        error: 'Incorrect email or password. Please try again.',
      });
      return;
    }

    const continueLevel = Math.max(1, Math.floor(Number(account.lastLevel) || 1));

    const token = signSessionToken(email);
    res.json({
      ok: true,
      token,
      user: {
        email: account.email,
        displayName: account.displayName,
        continueLevel,
      },
    });
  });

  // Sync player's highest level back to verified server account
  app.post('/api/auth/sync-level', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const authedEmail = bearer ? verifySessionToken(bearer) : null;
    if (!authedEmail) {
      res.status(401).json({ ok: false, error: 'Authentication required.' });
      return;
    }

    const level = Math.floor(Number(req.body?.level));
    if (!Number.isFinite(level) || level < 1 || level > 100000) {
      res.status(400).json({ ok: false, error: 'Invalid level value.' });
      return;
    }

    const accounts = loadAccounts();
    const account = accounts[authedEmail];
    if (!account) {
      res.status(404).json({ ok: false, error: 'Account not found.' });
      return;
    }

    account.lastLevel = Math.max(account.lastLevel || 1, level);
    accounts[authedEmail] = account;
    saveAccounts(accounts);

    res.json({ ok: true, lastLevel: account.lastLevel });
  });

  // Mount Vite middleware in dev, or serve static dist in production
  if (!IS_PROD) {
    // HMR is disabled in this runtime: serve a lightweight WebSocket-free /@vite/client
    // implementing Vite's style injection exports so dev CSS loads cleanly without WS errors.
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(WORKSPACE_ROOT, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ ok: false, error: 'Not found' });
        return;
      }
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const provider = detectEmailProvider();
    console.log(
      `[RSS Liquid Flow] Server running on http://0.0.0.0:${PORT} (Email OTP provider: ${provider || 'not configured'})`
    );
  });
}

startServer().catch((err) => {
  console.error('[RSS Liquid Flow] Failed to start server:', err);
  process.exit(1);
});
