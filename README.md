# 🚀 Apps Script Proxy

Serverless reverse proxy yang membuat Google Apps Script tampil profesional di domain Anda sendiri. Proyek ini menyediakan antarmuka landing page untuk membuat slug kustom, menyimpan mapping ke Vercel KV, lalu me-render aplikasi Google Apps Script tanpa menampilkan warning banner bawaan Google.

## ✨ Highlights
- Multi-tenant: satu deployment melayani banyak aplikasi dengan slug berbeda.
- HTML rewriting: request ke Apps Script diproksikan sambil membersihkan URL dan resource path.
- Storage terpusat: mapping slug ↔ Apps Script URL disimpan di Vercel KV.
- Landing page statis siap pakai untuk membuat slug baru.
- Vitest coverage untuk endpoint utama (`create-slug` dan proxy slug).

## 🔍 Arsitektur Singkat
```
/{slug}              → vercel.json rewrite → api/iframe-proxy.js → Google Apps Script (iframe mode)
/api/{slug...}       → api/[...slug].js    → Google Apps Script (reverse proxy + HTML rewrite)
/api/create-slug     → api/create-slug.js  → Vercel KV (store slug mapping)
/api/stats           → api/stats.js        → KV / mock data (opsional)
Landing page (public/index.html) memanggil /api/create-slug untuk membuat slug baru.
```

## 📁 Struktur Repository
- `api/[...slug].js` – reverse proxy utama dengan rewriting HTML resource.
- `api/create-slug.js` – endpoint pembuatan slug baru.
- `api/iframe-proxy.js` – fallback iframe loader yang digunakan oleh rewrite default.
- `api/stats.js` – endpoint statistik (saat ini mock data).
- `public/index.html` – landing page + form generator slug.
- `vercel.json` – konfigurasi rewrites, headers, dan limits fungsi.
- `vitest.config.js` & `api/*.test.js` – konfigurasi dan test suite.

## ✅ Prasyarat
1. Node.js 18+ (match runtime Vercel).
2. Akun Vercel dengan akses KV.
3. Vercel CLI (`npm i -g vercel`) untuk local dev & deploy.
4. Opsional: domain kustom.

## ⚡ Quickstart
1. **Clone repositori**
   ```bash
   git clone https://github.com/galangryandana123-lab/apps-script-proxy.git
   cd apps-script-proxy
   npm install
   ```
2. **Login & link proyek ke Vercel**
   ```bash
   vercel login
   vercel link  # pilih scope & project name
   ```
3. **Buat dan tautkan Vercel KV**
   - Vercel Dashboard → Storage → Create Database → pilih **KV**.
   - Link database ke project ini.
   - Klik Redeploy agar environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_REST_API_READ_WRITE_TOKEN`) tersedia.
4. **Sinkronkan environment ke lokal**
   ```bash
   vercel env pull .env.local
   ```
5. **Jalankan secara lokal**
   ```bash
   npm run dev       # alias dari `vercel dev`
   # Akses http://localhost:3000
   ```

## 🧪 Testing
- Unit test & coverage:
  ```bash
  npm test          # menjalankan Vitest dengan laporan cakupan
  ```
- Endpoint manual:
  ```bash
  curl -X POST http://localhost:3000/api/create-slug \
    -H 'Content-Type: application/json' \
    -d '{"slug":"demo","appsScriptUrl":"https://script.google.com/macros/s/XXX/exec","appName":"Demo"}'

  curl http://localhost:3000/api/demo
  ```

## 🚀 Deploy ke Vercel
Opsi 1 – CLI:
```bash
vercel                 # preview deployment
vercel --prod          # atau npm run deploy
```

Opsi 2 – GitHub integration:
1. Push perubahan ke branch default.
2. Vercel otomatis build & deploy.

## 🌐 Konfigurasi Domain
1. Vercel Dashboard → Project → Settings → Domains.
2. Tambahkan domain kustom dan ikuti instruksi DNS.
3. Semua permintaan `https://yourdomain.com/{slug}` otomatis dialihkan ke proxy.

## 🔌 API Reference
- **POST `/api/create-slug`** – body JSON:
  ```json
  {
    "slug": "nama-aplikasi",
    "appsScriptUrl": "https://script.google.com/macros/s/.../exec",
    "appName": "Nama Tampilan"
  }
  ```
  Validasi: slug hanya huruf kecil/angka/hyphen, URL harus `.../exec`.

- **GET `/api/{slug}`** – reverse proxy dengan rewriting penuh (gunakan jika ingin melewati iframe).

- **GET `/api/{slug}/{path}`** – meneruskan sub-path (misal `/static/style.css`).

- **GET `/api/stats`** – saat ini mock data; modifikasi sesuai kebutuhan.

- **GET `/api/iframe-proxy?slug={slug/...}`** – mode iframe (digunakan oleh rewrite default).

## 🗃️ Bentuk Data KV
- Key: `slug:{slug}`
- Value:
  ```json
  {
    "slug": "demo",
    "appsScriptUrl": "https://script.google.com/macros/s/.../exec",
    "appName": "Demo App",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "accessCount": 0
  }
  ```
- Hit counter tambahan: `kv.hincrby('slug:{slug}', 'accessCount', 1)` di reverse proxy.

## 🎨 Kustomisasi
- Ubah copywriting/branding: edit `public/index.html`.
- Ganti strategi proxy:
  - Untuk selalu memakai reverse proxy HTML, update `vercel.json` rewrite agar mengarah ke `/api/[...slug]`.
  - Sesuaikan header keamanan / izin kamera di file yang sama.
- Tambah endpoint baru: buat file baru di `api/` (Next.js / Vercel style).

## 🧰 Monitoring
- **Logs**: Vercel Dashboard → Project → Functions → Logs.
- **KV**: Dashboard → Storage → KV → Explore untuk cek slug & akses.

## 🛠️ Troubleshooting
- `KV_REST_API_URL is not defined`
  - Pastikan KV sudah di-link dan environment ditarik ulang (`vercel env pull`).
- `Slug not found`
  - Cek data di KV, slug dibuat lewat landing page, atau gunakan endpoint POST manual.
- Warning banner masih muncul
  - Gunakan endpoint `/api/{slug}` (reverse proxy) atau pastikan Apps Script URL valid.
- Response lambat
  - Optimalkan Apps Script, manfaatkan cache control, atau gunakan Edge Functions jika perlu.

## 🤝 Kontribusi
1. Fork repo.
2. Buat branch fitur.
3. Tambahkan test bila memungkinkan.
4. Kirim pull request.

## 📄 Lisensi
MIT License.

---

Dibuat dengan ❤️ oleh [Galang Ryandana](https://github.com/galangryandana123-lab)
