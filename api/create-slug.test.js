import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kv } from '@vercel/kv';
import handler from './create-slug.js';

// Mock modul @vercel/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

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
  return res;
};

describe('API Handler: /api/create-slug', () => {
  beforeEach(() => {
    // Reset semua mock sebelum setiap tes
    vi.resetAllMocks();
    delete process.env.APP_BASE_URL;
  });

  it('harus mengembalikan 405 jika metode bukan POST', async () => {
    const req = mockRequest('GET', {});
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('harus mengembalikan 400 untuk field yang wajib diisi tapi kosong', async () => {
    const req = mockRequest('POST', { slug: 'test' }); // Field lain kosong
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
    });
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung',
    });
  });

  it('harus mengembalikan 400 untuk URL Google Apps Script yang tidak valid', async () => {
    const req = mockRequest('POST', {
      slug: 'valid-slug',
      appsScriptUrl: 'https://url-tidak-valid.com',
      appName: 'Test App',
    });
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'URL Google Apps Script tidak valid',
    });
  });

  it('harus mengembalikan 409 jika slug sudah ada', async () => {
    const req = mockRequest('POST', {
      slug: 'slug-sudah-ada',
      appsScriptUrl: 'https://script.google.com/macros/s/123/exec',
      appName: 'Test App',
    });
    const res = mockResponse();

    // Mock kv.get untuk mengembalikan data yang sudah ada
    kv.get.mockResolvedValue({ slug: 'slug-sudah-ada' });

    await handler(req, res);

    expect(kv.get).toHaveBeenCalledWith('slug:slug-sudah-ada');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: `Slug "slug-sudah-ada" sudah digunakan. Silakan gunakan nama lain.`,
    });
    expect(kv.set).not.toHaveBeenCalled();
  });

  it('harus berhasil membuat slug baru', async () => {
    const req = mockRequest(
      'POST',
      {
        slug: 'slug-baru',
        appsScriptUrl: 'https://script.google.com/macros/s/12345/exec',
        appName: 'Aplikasi Baru Saya',
      },
      { host: 'contoh.com' }
    );
    const res = mockResponse();

    // Mock kv.get mengembalikan null (slug tersedia)
    kv.get.mockResolvedValue(null);
    kv.set.mockResolvedValue('OK'); // Mock set yang berhasil

    await handler(req, res);

    expect(kv.get).toHaveBeenCalledWith('slug:slug-baru');
    expect(kv.set).toHaveBeenCalledTimes(1);

    // Periksa bahwa objek yang disimpan ke kv.set benar
    const savedMapping = kv.set.mock.calls[0][1];
    expect(savedMapping.slug).toBe('slug-baru');
    expect(savedMapping.appsScriptUrl).toBe('https://script.google.com/macros/s/12345/exec');
    expect(savedMapping.appName).toBe('Aplikasi Baru Saya');
    expect(savedMapping.accessCount).toBe(0);
    expect(savedMapping).toHaveProperty('createdAt');

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      slug: 'slug-baru',
      message: `Custom URL berhasil dibuat: /slug-baru`,
      url: `https://contoh.com/slug-baru`,
    });
  });

  it('harus menggunakan APP_BASE_URL jika tersedia', async () => {
    process.env.APP_BASE_URL = 'https://app.example.com';

    const req = mockRequest(
      'POST',
      {
        slug: 'slug-base',
        appsScriptUrl: 'https://script.google.com/macros/s/abc/exec',
        appName: 'Base URL',
      },
      { host: 'malicious.com' }
    );
    const res = mockResponse();

    kv.get.mockResolvedValue(null);
    kv.set.mockResolvedValue('OK');

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      slug: 'slug-base',
      message: `Custom URL berhasil dibuat: /slug-base`,
      url: `https://app.example.com/slug-base`,
    });
  });

  it('harus mengembalikan URL relatif ketika host tidak valid', async () => {
    const req = mockRequest(
      'POST',
      {
        slug: 'slug-relatif',
        appsScriptUrl: 'https://script.google.com/macros/s/xyz/exec',
        appName: 'Relatif',
      },
      { host: 'bad.com\nmalicious.com' }
    );
    const res = mockResponse();

    kv.get.mockResolvedValue(null);
    kv.set.mockResolvedValue('OK');

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      slug: 'slug-relatif',
      message: `Custom URL berhasil dibuat: /slug-relatif`,
      url: `/slug-relatif`,
    });
  });

  it('harus mengembalikan 500 jika kv.get melempar error', async () => {
    const req = mockRequest('POST', {
      slug: 'error-slug',
      appsScriptUrl: 'https://script.google.com/macros/s/123/exec',
      appName: 'Test App',
    });
    const res = mockResponse();

    // Mock kv.get untuk melempar error
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
