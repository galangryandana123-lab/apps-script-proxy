# 🚀 Panduan Deployment Vibecode Proxy

## Perbaikan dari Logs Vercel

### ✅ **Masalah yang Diperbaiki**
1. **Error 404 pada static resources Google** - Fixed dengan routing intelligent:
   - Static resources Google (`/static/`, `/macros/`, `/warden`) sekarang load langsung dari `script.google.com`
   - API calls tetap melalui proxy untuk menghindari CORS
   
2. **Improved URL rewriting** dengan detection logic:
   - Deteksi otomatis tipe resource (static vs API)
   - Routing yang tepat untuk setiap tipe

3. **Modern UI** dengan fitur lengkap:
   - Design modern dengan gradient dan animasi
   - Form validation real-time
   - Toast notifications
   - Copy to clipboard
   - Stats dashboard

## 📝 Prerequisites

1. **Akun Vercel** (gratis di https://vercel.com)
2. **GitHub Account** untuk deployment otomatis
3. **Google Apps Script** yang sudah di-deploy sebagai Web App

## 🔧 Step-by-Step Deployment

### 1. Push ke GitHub

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/vibecode/supplier-proxy
git init
git add .
git commit -m "Initial commit - Vibecode Proxy with fixed static resources"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vibecode-proxy.git
git push -u origin main
```

### 2. Deploy ke Vercel

1. Buka https://vercel.com/new
2. Import repository GitHub Anda
3. Konfigurasi:
   - **Project Name**: vibecode-proxy
   - **Framework Preset**: Other
   - **Build Settings**: Default (tidak perlu diubah)
4. Klik **Deploy**

### 3. Setup Vercel KV Database

**PENTING!** Tanpa ini, proxy tidak akan berfungsi.

1. Di Vercel Dashboard → Project → **Storage** tab
2. Klik **"Create Database"**
3. Pilih **"KV"** (Redis-compatible)
4. Database name: `vibecode-kv`
5. Klik **"Create"** dan **"Connect"** ke project
6. **Redeploy** project untuk load environment variables

### 4. Test Deployment

```bash
# Test landing page
curl https://your-project.vercel.app/

# Create slug via API
curl -X POST https://your-project.vercel.app/api/create-slug \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-app",
    "appsScriptUrl": "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    "appName": "Test Application"
  }'

# Access through proxy
curl https://your-project.vercel.app/test-app
```

### 5. Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add domain: `proxy.yourdomain.com`
3. Update DNS records:
   ```
   Type: CNAME
   Name: proxy
   Value: cname.vercel-dns.com
   ```

## 🎯 Cara Menggunakan

### Untuk Admin: Membuat Custom URL

1. Buka `https://your-domain.vercel.app/`
2. Isi form:
   - **Nama Aplikasi**: e.g., "Supplier Gathering PLN"
   - **URL Apps Script**: Copy dari Deploy → Web App URL
3. Klik **"Generate Custom URL"**
4. Copy URL yang dihasilkan: `https://your-domain.vercel.app/supplier-gathering-pln`

### Untuk End Users

Cukup akses URL custom yang diberikan. Aplikasi akan load tanpa warning banner!

## 🔍 Monitoring & Debugging

### View Logs di Vercel

1. Vercel Dashboard → Functions → View Logs
2. Filter by:
   - `[Proxy]` - untuk proxy requests
   - `[Create Slug]` - untuk pembuatan slug
   - Error level untuk debugging

### Check Database

1. Vercel Dashboard → Storage → KV → Data Browser
2. Keys pattern:
   - `slug:nama-slug` - mapping data
   - `slug:nama-slug:count` - access counter

## ⚠️ Troubleshooting

### Problem: "KV_REST_API_URL is not defined"
**Solution**: Create dan connect KV database, lalu redeploy

### Problem: Static resources masih 404
**Check**:
- Pastikan Apps Script di-deploy dengan akses "Anyone"
- Check logs untuk URL yang di-request
- Verify script ID benar

### Problem: CORS errors
**Fix**: Pastikan API calls melalui proxy, bukan direct ke script.google.com

### Problem: Slow response
**Optimize**:
- Enable Vercel Edge Functions
- Check Apps Script performance
- Review cache headers

## 🚀 Advanced Configuration

### Environment Variables (Optional)

```env
# .env.local for development
KV_URL=redis://localhost:6379
KV_REST_API_URL=http://localhost:8787
KV_REST_API_TOKEN=your-token
KV_REST_API_READ_ONLY_TOKEN=read-token

# Custom settings
MAX_SLUG_LENGTH=50
CACHE_TTL=3600
ENABLE_ANALYTICS=true
```

### Cache Strategy

Proxy sudah dikonfigurasi dengan:
- HTML: 60s cache dengan stale-while-revalidate
- Static assets (JS/CSS): 1 year immutable cache
- API responses: No cache

## 📊 Performance Tips

1. **Gunakan Vercel Edge Functions** untuk latency rendah
2. **Optimize Apps Script** - kurangi processing time
3. **Enable compression** di Vercel settings
4. **Monitor usage** untuk prevent rate limiting

## 🔐 Security Notes

1. Apps Script harus di-deploy dengan "Anyone" access
2. Proxy menambahkan security headers otomatis
3. Rate limiting dihandle oleh Vercel
4. Sensitive data jangan di-expose di client-side

## 📈 Scaling

Free tier Vercel dapat handle:
- 100GB bandwidth/month
- Unlimited function invocations
- Cocok untuk ribuan users

Untuk scale lebih besar:
- Upgrade ke Vercel Pro ($20/month)
- Atau self-host dengan Docker

## ✅ Deployment Checklist

- [ ] Code di-push ke GitHub
- [ ] Project imported ke Vercel
- [ ] KV Database created & connected
- [ ] First deployment success
- [ ] Test slug creation via UI
- [ ] Test proxy access
- [ ] Custom domain configured (optional)
- [ ] Monitoring setup

## 📞 Support

Jika ada masalah:
1. Check Vercel logs terlebih dahulu
2. Review error messages di browser console
3. Verify Apps Script permissions
4. Contact: support@vibecode.com

---

**Happy Deploying!** 🎉

Made with ❤️ by Vibecode Team
