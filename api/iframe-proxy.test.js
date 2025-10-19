import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kv } from '@vercel/kv';
import handler from './iframe-proxy.js';

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    incr: vi.fn(),
  },
}));

const mockRequest = (slug, options = {}) => ({
  method: 'GET',
  query: { slug },
  headers: { host: 'proxy.test', ...options.headers },
  ...options,
});

const mockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  return res;
};

describe('IFrame Proxy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('meng-escape slug pada halaman 404', async () => {
    kv.get.mockResolvedValue(null);
    const maliciousSlug = `bad"><script>alert("xss")</script>`;
    const req = mockRequest(maliciousSlug);
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const html = res.send.mock.calls[0][0];
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)');
  });

  it('meng-escape appName saat merender halaman', async () => {
    const maliciousAppName = '<img src=x onerror=alert(1)>';
    kv.get.mockResolvedValue({
      appsScriptUrl: 'https://script.google.com/macros/s/123/exec',
      appName: maliciousAppName,
    });
    kv.incr.mockResolvedValue(1);

    const req = mockRequest('demo');
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    const html = res.send.mock.calls[0][0];
    expect(html).not.toContain(maliciousAppName);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
