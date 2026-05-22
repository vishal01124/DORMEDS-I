// Auth + Admin middleware for Hono
import { verifyJWT } from './utils.js';
import { dbGet } from './utils.js';

// ── Resolve JWT secret safely ───────────────────────────────
// In production, if JWT_SECRET is not set as a Worker secret,
// we refuse to proceed rather than fall back to a known string.
function getJwtSecret(env) {
  const secret = env.JWT_SECRET;
  if (!secret) {
    const isProd = (env.NODE_ENV || 'production') === 'production';
    if (isProd) return null; // caller must handle this as 500
    return 'pharmadist_jwt_secret_dev_only_not_for_production';
  }
  return secret;
}

// Auth middleware — sets c.set('user', payload)
export async function authMiddleware(c, next) {
  const auth = c.req.header('authorization') || '';
  const tokenParam = new URL(c.req.url).searchParams.get('token');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : tokenParam;
  if (!token) return c.json({ ok: false, msg: 'Authentication required. Please sign in.' }, 401);
  const JWT_SECRET = getJwtSecret(c.env);
  if (!JWT_SECRET) return c.json({ ok: false, msg: 'Server misconfiguration: JWT_SECRET is not set.' }, 500);
  try {
    const decoded = await verifyJWT(token, JWT_SECRET);
    // Check session not revoked
    const session = await dbGet(c.env.DB,
      'SELECT id FROM sessions WHERE token_id=? AND revoked=0', [decoded.jti]);
    if (!session) return c.json({ ok: false, msg: 'Session expired or revoked. Please sign in again.' }, 401);
    // Refresh last_seen
    await c.env.DB.prepare('UPDATE sessions SET last_seen=? WHERE token_id=?')
      .bind(new Date().toISOString(), decoded.jti).run();
    c.set('user', decoded);
    await next();
  } catch (e) {
    return c.json({ ok: false, msg: 'Invalid or expired token. Please sign in again.' }, 401);
  }
}

// Admin-only middleware
export async function adminMiddleware(c, next) {
  if (c.get('user')?.role !== 'admin')
    return c.json({ ok: false, msg: 'Admin access required.' }, 403);
  await next();
}
