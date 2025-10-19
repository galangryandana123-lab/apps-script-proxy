export const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const HOST_HEADER_REGEX = /^[A-Za-z0-9.-]+(?::\d+)?$/;

const trimArrayHeader = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const resolveOrigin = (req) => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }

  const forwardedHost = trimArrayHeader(req?.headers?.['x-forwarded-host']);
  const host = forwardedHost || trimArrayHeader(req?.headers?.host);

  if (!host || !HOST_HEADER_REGEX.test(host)) {
    return undefined;
  }

  const forwardedProtoRaw = trimArrayHeader(req?.headers?.['x-forwarded-proto']);
  const protoCandidate = forwardedProtoRaw ? forwardedProtoRaw.split(',')[0].trim().toLowerCase() : undefined;
  const proto = protoCandidate === 'http' ? 'http' : 'https';

  return `${proto}://${host}`;
};

/**
 * Implements IP-based rate limiting using Vercel KV.
 * @param {import('http').IncomingMessage} req - The incoming request object.
 * @param {object} options - Configuration for the rate limiter.
 * @param {number} options.limit - The maximum number of requests allowed.
 * @param {number} options.window - The time window in seconds.
 * @param {string} options.prefix - A unique prefix for the KV key.
 * @param {import('@vercel/kv').VercelKV} kv - The Vercel KV client.
 * @returns {Promise<{isLimited: boolean, remaining: number, reset: number}>}
 */
export async function rateLimit(req, { limit, window, prefix, kv }) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1';
  const key = `ratelimit:${prefix}:${ip}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  const pipeline = kv.pipeline();
  // Use a sorted set. The score and member are both the current timestamp.
  pipeline.zadd(key, { score: now, member: now.toString() });
  // Remove all members that are outside the current time window.
  pipeline.zremrangebyscore(key, 0, windowStart);
  // Get the total number of members in the set.
  pipeline.zcard(key);
  // Set an expiration on the key itself to auto-clean up inactive IPs.
  pipeline.expire(key, window);

  // Execute the pipeline.
  const [zaddResult, zremResult, count, expireResult] = await pipeline.exec();

  const isLimited = count > limit;
  const remaining = isLimited ? 0 : limit - count;

  // Find the timestamp of the oldest request in the window to calculate the reset time
  const resetTime = isLimited ? (await kv.zrange(key, 0, 0, { withScores: true }))[0]?.score + window * 1000 : now;
  const reset = Math.ceil((resetTime - now) / 1000);

  return { isLimited, remaining, reset };
}

/**
 * Sanitizes a string for logging by removing newline and carriage return characters.
 * This helps prevent log injection attacks where an attacker might try to forge log entries.
 * @param {any} input - The value to sanitize.
 * @returns {string} The sanitized string, with newlines replaced by underscores.
 */
export const sanitizeForLog = (input) => {
  return String(input).replace(/[\r\n]+/g, '_');
};
