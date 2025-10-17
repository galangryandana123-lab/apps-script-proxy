import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './stats.js';

// Fungsi bantuan untuk membuat objek request dan response palsu
const mockRequest = (method) => ({
  method,
});

const mockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  return res;
};

describe('API Handler: /api/stats', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('harus mengembalikan 405 jika metode bukan GET', async () => {
    const req = mockRequest('POST');
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('harus mengembalikan 200 dan data statistik pada metode GET', async () => {
    const req = mockRequest('GET');
    const res = mockResponse();

    // Mock Date untuk mendapatkan hasil yang konsisten
    const fakeDate = new Date('2023-10-27T10:00:00Z');
    vi.spyOn(global, 'Date').mockImplementation(() => fakeDate);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      totalApps: 12,
      totalAccess: 1847,
      uptime: 99.9,
      lastUpdated: fakeDate.toISOString(),
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=120'
    );

    // Kembalikan implementasi Date ke aslinya
    vi.restoreAllMocks();
  });

  // Meskipun blok catch saat ini tidak dapat dijangkau karena tidak ada operasi
  // yang bisa gagal, kita bisa memodifikasi handler untuk menguji kasus error
  // jika logikanya menjadi lebih kompleks di masa depan.
  // Untuk saat ini, kita akan melewati pengujian blok catch secara langsung.
});