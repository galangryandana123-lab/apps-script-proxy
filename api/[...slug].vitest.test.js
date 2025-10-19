import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kv } from '@vercel/kv';
import handler from './[...slug].js';

// --- Mocks ---

const pipelineMock = {
  zadd: vi.fn().mockReturnThis(),
  zremrangebyscore: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(), // exec akan di-mock di setiap tes
};

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    incr: vi.fn(),
    pipeline: vi.fn(() => pipelineMock),
    zrange: vi.fn(), // Tambahkan mock untuk zrange
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// --- Helpers ---

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

// --- Tests ---

describe('API Handler: /[...slug].js', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Gunakan clearAllMocks untuk mereset state mock
    kv.incr.mockResolvedValue(1);
  });

  // --- Test Keamanan ---

  it('harus mengembalikan 429 jika rate limit terlampaui', async () => {
    // Atur pipeline untuk mengembalikan jumlah yang melebihi batas
    pipelineMock.exec.mockResolvedValue([0, 0, 61, 0]);
    // Atur zrange untuk kalkulasi reset time
    kv.zrange.mockResolvedValue([{ score: Date.now() - 1000 }]);

    const req = mockRequest('GET', 'any-slug');
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests' });
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 60);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
  });

  // --- Test Fungsionalitas ---

  it('harus mengembalikan 404 jika slug tidak ditemukan', async () => {
    // Atur pipeline untuk rate limit yang tidak terlampaui
    pipelineMock.exec.mockResolvedValue([0, 0, 1, 0]);
    kv.get.mockResolvedValue(null);
    const req = mockRequest('GET', 'slug-tidak-ada');
    const res = mockResponse();

    await handler(req, res);

    expect(kv.get).toHaveBeenCalledWith('slug:slug-tidak-ada');
    expect(res.status).toHaveBeenCalledWith(404);
    const sentHtml = res.send.mock.calls[0][0];
    expect(sentHtml).toContain('<p>Slug <strong>"slug-tidak-ada"</strong> tidak ditemukan.</p>');
  });

  it('harus melakukan proxy ke URL Apps Script utama untuk slug root', async () => {
    pipelineMock.exec.mockResolvedValue([0, 0, 5, 0]); // 5 permintaan, di bawah batas
    kv.get.mockResolvedValue(mockMapping);
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Map([['content-type', 'text/plain']]),
      text: () => Promise.resolve('OK'),
    });

    const req = mockRequest('GET', 'my-app');
    const res = mockResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 55);
    expect(kv.get).toHaveBeenCalledWith('slug:my-app');
    expect(kv.incr).toHaveBeenCalledWith('slug:my-app:count');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/123/exec',
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('harus mengembalikan 500 jika fetch gagal', async () => {
    pipelineMock.exec.mockResolvedValue([0, 0, 10, 0]);
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