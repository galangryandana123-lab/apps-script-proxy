# 🚀 Akses Shortener

Multi-tenant URL shortener untuk Google Apps Script - Menghilangkan warning banner dan menyediakan custom slug URLs yang professional.

## 🎯 Fitur

- ✅ **Multi-tenant**: Banyak aplikasi dalam satu platform
- ✅ **Custom Slug**: URL yang mudah diingat (e.g., `domain.com/supplier-pln`)
- ✅ **No Warning Banner**: Menghilangkan warning Google Apps Script
- ✅ **Auto Slug Generator**: Generate slug otomatis dari nama aplikasi
- ✅ **Database Driven**: Vercel KV (Redis) untuk penyimpanan mapping
- ✅ **Professional Appearance**: Custom branding untuk setiap aplikasi
- ✅ **Edge Caching**: Performance optimal dengan CDN
- ✅ **Camera/Scanner Support**: Permissions untuk barcode/QR scanner

## 📋 Prerequisites

1. Akun Vercel (gratis di https://vercel.com)
2. GitHub Account (untuk auto-deployment)
3. Domain custom (optional, bisa pakai `*.vercel.app`)

## 🚀 Quick Start Deployment

### **Step 1: Fork & Clone Repository**
```bash
git clone https://github.com/yourusername/akses-shortener
cd akses-shortener
```

### **Step 2: Push ke GitHub**
```bash
git remote set-url origin https://github.com/yourusername/akses-shortener.git
git push -u origin main
```

### **Step 3: Deploy ke Vercel via Web Dashboard**

1. Buka https://vercel.com/new
2. **Import Git Repository** → Pilih repo Anda
3. **Configure Project:**
   - Project Name: `akses-shortener`
   - Framework Preset: Other
   - Root Directory: `./`
4. Klik **"Deploy"**

### **Step 4: Setup Vercel KV Database** (PENTING!)

Setelah deployment pertama:

1. Di Vercel Dashboard, buka project Anda
2. Klik **"Storage"** tab
3. Klik **"Create Database"**
4. Pilih **"KV"** (Key-Value Storage)
5. Database Name: `akses-kv`
6. Klik **"Create"**
7. **Auto-link** ke project Anda
8. **Redeploy** project (Settings → Deployments → Redeploy)

### **Step 5: Custom Domain (Optional)**

1. Di project dashboard, klik **"Settings" → "Domains"**
2. Add domain: `yourdomain.com`
3. Update DNS records sesuai instruksi Vercel

## 🎨 Cara Menggunakan

### **Untuk User: Generate Slug**

1. Buka `https://yourdomain.com/`
2. Isi form:
   - **Nama Aplikasi**: "Supplier Gathering PLN"
   - **URL Apps Script**: `https://script.google.com/macros/s/.../exec`
3. Klik **"Generate Slug"**
4. Copy custom URL: `https://yourdomain.com/supplier-gathering-pln`
5. Share URL tersebut ke users!

### **Untuk End Users: Akses App**

1. Buka `https://yourdomain.com/supplier-gathering-pln`
2. Aplikasi akan load **TANPA warning banner** ✅
3. URL tetap di custom domain (tidak redirect ke script.google.com)

## 🏗️ Architecture

```
User Request
    ↓
https://yourdomain.com/{slug}
    ↓
Vercel Serverless Function
    ↓
Lookup slug in KV Database
    ↓
Fetch from Apps Script URL
    ↓
Rewrite HTML (remove warning)
    ↓
Return to User (URL stays on custom domain)
```

## 📊 Monitoring & Analytics

**View Logs:**
- Vercel Dashboard → Project → Functions → Logs
- Real-time function execution logs
- Error tracking

**Database Analytics:**
- Each slug tracks `accessCount`
- View in Vercel KV Dashboard

## 🧪 Testing

### Local Development
```bash
npm install
vercel dev
# Visit: http://localhost:3000
```

### Production Testing
```bash
# Test landing page
curl https://yourdomain.com/

# Test slug
curl https://yourdomain.com/your-slug
```

## ⚡ Performance

- Edge caching: 50-200ms response time
- Global CDN: 275+ locations
- Automatic HTTPS
- HTTP/2 & HTTP/3 support

## 🔒 Security

- Automatic HTTPS/SSL
- DDoS protection
- Rate limiting (Vercel)
- Security headers enabled

## 💰 Cost Estimation

**Vercel Free Tier (Hobby):**
- ✅ 100GB bandwidth/month
- ✅ Unlimited serverless function invocations
- ✅ 256KB KV storage (plenty for thousands of slugs)
- ✅ Automatic SSL
- ✅ Global CDN

**Example Usage:**
- 10 apps × 1,000 pageviews/month = 10,000 requests
- Avg 100KB per request = 1GB bandwidth
- **Cost: $0 (Free tier)** ✅

**Scale:**
- Free tier dapat handle **ratusan apps** dan **puluhan ribu users/month**

## 🛠️ Troubleshooting

### ❌ "KV_REST_API_URL is not defined"
**Solusi:**
1. Buka Vercel Dashboard → Project → Storage
2. Create KV Database
3. Link database ke project
4. Redeploy project

### ❌ "Slug not found" (404)
**Cek:**
- Slug sudah dibuat via landing page?
- Cek di Vercel KV Dashboard apakah data tersimpan
- Test dengan slug lain

### ❌ Warning banner masih muncul
**Penyebab:**
- HTML rewriting gagal
- Apps Script URL tidak valid
- Cek Vercel function logs untuk error

### ❌ Slug sudah ada (409)
**Solusi:**
- Gunakan nama aplikasi yang berbeda
- Atau hapus slug lama dari KV Database

### 🐌 Response lambat
- Cache: Check Cache-Control headers
- Apps Script: Optimize script performance
- Vercel Region: Consider using Edge Functions

## 🤝 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Make changes
4. Submit pull request

## 📄 License

MIT License - Free to use and modify

---

Made with ❤️ by [Galang Ryandana](https://github.com/galangryandana123-lab)
