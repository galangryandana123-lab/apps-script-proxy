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
