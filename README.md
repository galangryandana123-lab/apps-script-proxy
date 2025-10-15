# Supplier Gathering Proxy

Reverse proxy untuk menghilangkan Google Apps Script warning banner dan menyediakan custom domain yang professional.

## 🎯 Fitur

- ✅ Menghilangkan warning banner Google Apps Script
- ✅ Custom domain (supplier.galangryandana.my.id)
- ✅ Edge caching untuk performance optimal
- ✅ Professional branding
- ✅ Camera/scanner permissions support

## 📋 Prerequisites

1. Akun Vercel (gratis di https://vercel.com)
2. Domain galangryandana.my.id (sudah ada)
3. Google Apps Script Web App URL

## 🚀 Deployment ke Vercel

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login ke Vercel

```bash
vercel login
```

### Step 3: Deploy Project

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/vibecode/supplier-proxy
vercel --prod
```

### Step 4: Setup Custom Domain

1. Login ke Vercel Dashboard: https://vercel.com/dashboard
2. Pilih project "supplier-gathering-proxy"
3. Go to Settings → Domains
4. Add domain: `supplier.galangryandana.my.id`
5. Vercel akan memberikan DNS records yang perlu ditambahkan

### Step 5: Update DNS Records

Di DNS provider (cloudflare/namecheap/dll) untuk `galangryandana.my.id`:

**Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: supplier
Value: cname.vercel-dns.com
TTL: Auto/3600
```

**Option B: A Record**
```
Type: A
Name: supplier
Value: 76.76.21.21 (Vercel IP)
TTL: Auto/3600
```

## 🔧 Configuration

Edit `api/proxy.js` dan update Apps Script URL:

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## 📊 Monitoring

Lihat logs di Vercel Dashboard:
- https://vercel.com/dashboard
- Pilih project → Functions → View Logs

## 🧪 Testing

### Local Testing
```bash
vercel dev
# Visit: http://localhost:3000
```

### Production Testing
```bash
curl -I https://supplier.galangryandana.my.id
```

## 🎨 Custom Domain Structure

```
Main Domain: galangryandana.my.id
Subdomain: supplier.galangryandana.my.id
           ↓
           Vercel Edge Network (Proxy)
           ↓
           Google Apps Script
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

## 📝 Cost

**Vercel Free Tier:**
- 100GB bandwidth/month ✅
- Unlimited serverless function invocations ✅
- Automatic SSL ✅
- Global CDN ✅

**Estimated usage for 500 suppliers:**
- Form page: ~100KB × 500 = 50MB
- API calls: ~10KB × 500 = 5MB
- Total: ~55MB ✅ Well within free tier!

## 🛠️ Troubleshooting

### Domain not working
- Check DNS propagation: https://dnschecker.org
- Wait 5-10 minutes for DNS to propagate
- Verify CNAME points to: cname.vercel-dns.com

### 502 Bad Gateway
- Check Apps Script URL is correct
- Ensure Apps Script is deployed as Web App
- Verify "Anyone" access in Apps Script

### Slow response
- Check Vercel function logs
- Verify Apps Script response time
- Consider enabling more aggressive caching

## 📞 Support

Issue tracker: Create issue in project repository
Documentation: https://vercel.com/docs

## 📄 License

MIT License - Free to use and modify
