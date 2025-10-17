import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Cari file tes di dalam direktori `api`
    include: ['api/**/*.test.js'],
    // Aktifkan laporan cakupan
    coverage: {
      // Gunakan provider v8 untuk cakupan
      provider: 'v8',
      // Direktori mana yang akan dimasukkan dalam laporan cakupan
      include: ['api/**/*.js'],
      // Direktori mana yang akan dikecualikan
      exclude: [
        'api/**/*.test.js', // Abaikan file tes itu sendiri
        'api/index.js', // Ini hanya file entri dasar, tidak ada logika untuk diuji
      ],
      // Reporter untuk menampilkan hasil di konsol dan dalam format lain
      reporter: ['text', 'json-summary', 'json'],
      // Batas minimum cakupan yang harus dipenuhi (opsional, bagus untuk masa depan)
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },
  },
});