import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kv } from '@vercel/kv';
import handler from './[...slug].js';

// Mock modul @vercel/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    incr: vi.fn(),
  },
}));

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Matikan console.log dan console.error selama pengujian
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

const mockRequest = (method, slug, options = {}) => ({
  method,
  query: { slug: Array.isArray(slug) ? slug : [slug] },
  headers: {
    host: 'proxy.com',
    'user-agent': 'vitest-test',
    ...options.headers,
  },
  url: `/${Array.isArray(slug) ? slug.join('/') : slug}`,
  ...options,
});

const mockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  return res;
};

const mockMapping = {
  slug: 'my-app',
  appsScriptUrl: 'https://script.google.com/macros/s/123/exec',
  appName: 'My Test App',
};

describe('API Handler: /[...slug].js', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Pastikan incr selalu di-mock untuk menghindari error '.catch' pada undefined
    kv.incr.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('harus mengembalikan 404 jika slug tidak ditemukan', async () => {
    kv.get.mockResolvedValue(null);
    const req = mockRequest('GET', 'slug-tidak-ada');
    const res = mockResponse();

    await handler(req, res);

    expect(kv.get).toHaveBeenCalledWith('slug:slug-tidak-ada');
    expect(res.status).toHaveBeenCalledWith(404);
    // Asersi yang lebih andal untuk memeriksa konten HTML
    const sentHtml = res.send.mock.calls[0][0];
    expect(sentHtml).toContain('<p>Slug <strong>"slug-tidak-ada"</strong> tidak ditemukan.</p>');
  });

  it('harus meng-escape slug saat menampilkan halaman 404', async () => {
    kv.get.mockResolvedValue(null);
    const maliciousSlug = `bad"><script>alert("xss")</script>`;
    const req = mockRequest('GET', maliciousSlug);
    const res = mockResponse();

    await handler(req, res);

    const sentHtml = res.send.mock.calls[0][0];
    expect(sentHtml).not.toContain('<script>alert("xss")</script>');
    expect(sentHtml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(sentHtml).toContain('Slug <strong>"');
  });

  it('harus melakukan proxy ke URL Apps Script utama untuk slug root', async () => {
    kv.get.mockResolvedValue(mockMapping);
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Map([['content-type', 'text/plain']]),
      text: () => Promise.resolve('OK'),
    });

    const req = mockRequest('GET', 'my-app');
    const res = mockResponse();

    await handler(req, res);

    expect(kv.get).toHaveBeenCalledWith('slug:my-app');
    expect(kv.incr).toHaveBeenCalledWith('slug:my-app:count');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/123/exec',
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('harus melakukan proxy ke URL dasar skrip untuk sub-path', async () => {
    kv.get.mockResolvedValue(mockMapping);
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Map([['content-type', 'text/plain']]),
      text: () => Promise.resolve('Subpath OK'),
    });

    const req = mockRequest('GET', ['my-app', 'static', 'style.css']);
    const res = mockResponse();

    await handler(req, res);

    const expectedUrl = 'https://script.google.com/macros/s/123/static/style.css';
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    expect(res.send).toHaveBeenCalledWith('Subpath OK');
  });

  it('harus meneruskan body request untuk metode POST', async () => {
    kv.get.mockResolvedValue(mockMapping);
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ success: true }),
    });

    const req = mockRequest('POST', 'my-app', {
      body: { data: 'test' },
      headers: { 'content-type': 'application/json' },
    });
    const res = mockResponse();

    await handler(req, res);

    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.method).toBe('POST');
    expect(fetchOptions.headers['Content-Type']).toBe('application/json');
    expect(fetchOptions.body).toBe(JSON.stringify({ data: 'test' }));
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  describe('Penulisan Ulang HTML', () => {
    const htmlBody = `
      <html>
        <head><link rel="stylesheet" href="/static/style.css"></head>
        <body>
          <a href="https://proxy.com/my-app/resource">Resource Link</a>
          <a href="https://proxy.com/my-app?param=1">Root Link with Query</a>
          <a href="https://proxy.com/my-app">Root Link</a>
        </body>
      </html>
    `;

    beforeEach(() => {
      kv.get.mockResolvedValue(mockMapping);
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(htmlBody),
      });
    });

    it('harus menulis ulang URL absolut dan relatif dalam respons HTML', async () => {
      const req = mockRequest('GET', 'my-app');
      const res = mockResponse();

      await handler(req, res);

      const rewrittenBody = res.send.mock.calls[0][0];
      const scriptBase = 'https://script.google.com/macros/s/123';

      // Uji penulisan ulang URL relatif
      expect(rewrittenBody).toContain(`href="${scriptBase}/static/style.css"`);
      // Uji penulisan ulang URL absolut
      expect(rewrittenBody).toContain(`href="${scriptBase}/resource"`);
      // Uji penulisan ulang root link
      expect(rewrittenBody).toContain(`href="${mockMapping.appsScriptUrl}?param=1"`);
      expect(rewrittenBody).toContain(`href="${mockMapping.appsScriptUrl}"`);
    });
  });

  it('harus mengembalikan 500 jika fetch gagal', async () => {
    kv.get.mockResolvedValue(mockMapping);
    const fetchError = new Error('Network Error');
    mockFetch.mockRejectedValue(fetchError);

    const req = mockRequest('GET', 'my-app');
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Proxy Error',
        message: 'Network Error',
      })
    );
  });
});
