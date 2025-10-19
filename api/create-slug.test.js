import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kv } from '@vercel/kv';
import handler from './create-slug.js';
import * as utils from './_utils.js';

// Mock modul @vercel/kv dan _utils.js
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    pipeline: vi.fn().mockReturnThis(),
    zadd: vi.fn(),
    zremrangebyscore: vi.fn(),
    zcard: vi.fn(),
    expire: vi.fn(),
    exec: vi.fn(),
  },
}));

// Mock fungsi rateLimit secara spesifik
const rateLimitMock = vi.spyOn(utils, 'rateLimit');

// Fungsi bantuan untuk membuat objek request dan response palsu
const mockRequest = (method, body, headers = {}) => ({
  method,
  body,
  headers,
});

const mockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  return res;
};

const AUTHORIZATION_TOKEN = 'test-secret-token';

describe('API Handler: /api/create-slug', () => {
  beforeEach(() => {
    // Reset semua mock sebelum setiap tes
    vi.resetAllMocks();
    delete process.env.APP_BASE_URL;
    process.env.AUTHORIZATION_TOKEN = AUTHORIZATION_TOKEN;

    // Default mock untuk rate limit (tidak terbatas)
    rateLimitMock.mockResolvedValue({ isLimited: false, remaining: 10, reset: 60 });
  });

  // --- Test Keamanan ---

  it('harus mengembalikan 401 jika token otentikasi tidak ada', async () => {
    const req = mockRequest('POST', {}, {}); // Tidak ada header Authorization
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('harus mengembalikan 401 jika token otentikasi tidak valid', async () => {
    const req = mockRequest('POST', {}, { authorization: 'Bearer invalid-token' });
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('harus mengembalikan 429 jika rate limit terlampaui', async () => {
    // Mock rateLimit untuk mengembalikan 'terbatas'
    rateLimitMock.mockResolvedValue({ isLimited: true, remaining: 0, reset: 30 });

    const req = mockRequest('POST', {}, { authorization: `Bearer ${AUTHORIZATION_TOKEN}` });
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests. Please try again later.' });
  });

  // --- Test Fungsionalitas ---

  it('harus mengembalikan 405 jika metode bukan POST', async () => {
    const req = mockRequest('GET', {}, { authorization: `Bearer ${AUTHORIZATION_TOKEN}` });
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('harus mengembalikan 400 untuk field yang wajib diisi tapi kosong', async () => {
    const req = mockRequest('POST', { slug: 'test' }, { authorization: `Bearer ${AUTHORIZATION_TOKEN}` }); // Field lain kosong
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: slug, appsScriptUrl, appName',
    });
  });

  it('harus mengembalikan 400 untuk format slug yang tidak valid', async () => {
    const req = mockRequest('POST', {
      slug: 'Slug Tidak Valid',
      appsScriptUrl: 'https://script.google.com/macros/s/123/exec',
      appName: 'Test App',
    }, { authorization: `Bearer ${AUTHORIZATION_TOKEN}` });
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung',
    });
  });

  it('harus berhasil membuat slug baru dengan otentikasi yang valid', async () => {
    const req = mockRequest(
      'POST',
      {
        slug: 'slug-baru',
        appsScriptUrl: 'https://script.google.com/macros/s/12345/exec',
        appName: 'Aplikasi Baru Saya',
      },
      {
        host: 'contoh.com',
        authorization: `Bearer ${AUTHORIZATION_TOKEN}`
      }
    );
    const res = mockResponse();

    kv.get.mockResolvedValue(null);
    kv.set.mockResolvedValue('OK');

    await handler(req, res);

    expect(kv.get).toHaveBeenCalledWith('slug:slug-baru');
    expect(kv.set).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        slug: 'slug-baru',
      })
    );
  });

  it('harus mengembalikan 500 jika kv.get melempar error', async () => {
    const req = mockRequest('POST', {
      slug: 'error-slug',
      appsScriptUrl: 'https://script.google.com/macros/s/123/exec',
      appName: 'Test App',
    }, { authorization: `Bearer ${AUTHORIZATION_TOKEN}` });
    const res = mockResponse();

    const testError = new Error('KV Get Error');
    kv.get.mockRejectedValue(testError);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Terjadi kesalahan saat membuat custom URL',
      details: undefined,
    });
  });
});