# 🚀 DEPLOYMENT INSTRUCTIONS

## Quick Start

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
cd /Applications/XAMPP/xamppfiles/htdocs/vibecode/supplier-proxy
vercel --prod
```

## Step-by-Step Deployment

### 1️⃣ First Time Deployment

```bash
# Navigate to project
cd /Applications/XAMPP/xamppfiles/htdocs/vibecode/supplier-proxy

# Deploy with Vercel
vercel --prod
```

Vercel akan menanyakan:
```
? Set up and deploy "~/supplier-proxy"? [Y/n] y
? Which scope do you want to deploy to? Your Personal Account
? Link to existing project? [y/N] n
? What's your project's name? supplier-gathering-proxy
? In which directory is your code located? ./
? Want to override the settings? [y/N] n
```

### 2️⃣ Setup Custom Domain

**Di Vercel Dashboard:**
1. Go to: https://vercel.com/dashboard
2. Click project: "supplier-gathering-proxy"
3. Go to: Settings → Domains
4. Add domain: `supplier.galangryandana.my.id`
5. Vercel will show DNS instructions

**Update DNS (di provider domain Anda):**

**Option A: CNAME (Recommended)**
```
Type: CNAME
Name: supplier
Value: cname.vercel-dns.com
TTL: 3600
```

**Option B: A Record**
```
Type: A
Name: supplier
Value: 76.76.21.21
TTL: 3600
```

### 3️⃣ Verify Deployment

```bash
# Check DNS propagation
nslookup supplier.galangryandana.my.id

# Test endpoint
curl -I https://supplier.galangryandana.my.id

# Test with page parameter
curl https://supplier.galangryandana.my.id?page=step2
```

### 4️⃣ Update Apps Script URL

Edit `api/proxy.js` line 10:
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

Replace with your actual Apps Script URL:
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjIrwkM2lA8ov7qac0g2C-pLw8gcp-DO_xy-wTZ0Uigd7r-ijvNIhQv_SgLP5eIOy7/exec';
```

Then redeploy:
```bash
vercel --prod
```

## 🧪 Testing

### Local Testing
```bash
# Install dependencies (if any)
npm install

# Start local dev server
vercel dev

# Visit: http://localhost:3000
```

### Production Testing
```bash
# Test main page
curl https://supplier.galangryandana.my.id

# Test with query parameter
curl "https://supplier.galangryandana.my.id?page=step2"

# Test response time
curl -w "@-" -o /dev/null -s "https://supplier.galangryandana.my.id" <<< "
   time_namelookup:  %{time_namelookup}s
      time_connect:  %{time_connect}s
   time_appconnect:  %{time_appconnect}s
  time_pretransfer:  %{time_pretransfer}s
     time_redirect:  %{time_redirect}s
time_starttransfer:  %{time_starttransfer}s
                   ----------
        time_total:  %{time_total}s
"
```

## 🔄 Update Deployment

Setiap perubahan code:
```bash
# Git commit changes
git add .
git commit -m "Update proxy configuration"

# Deploy update
vercel --prod
```

Atau auto-deploy with Git:
1. Push to GitHub
2. Link repo to Vercel
3. Auto-deploy on every push ✅

## 📊 Monitoring

**Vercel Dashboard:**
- Functions: https://vercel.com/dashboard/[project]/functions
- Logs: Real-time function execution logs
- Analytics: Traffic, bandwidth, performance

**Check logs:**
```bash
vercel logs [deployment-url]
```

## ⚡ Performance Tips

1. **Enable caching** (already configured in vercel.json)
2. **Use edge functions** (already using Vercel Edge)
3. **Optimize images** (if serving images)
4. **Monitor usage** in Vercel dashboard

## 🔒 Security

Already configured:
- ✅ HTTPS/SSL automatic
- ✅ Security headers
- ✅ CORS enabled
- ✅ Rate limiting (Vercel)

## 💰 Cost Estimate

**Vercel Free Tier:**
- Bandwidth: 100GB/month
- Functions: Unlimited invocations
- SSL: Free
- CDN: Free

**Your Usage (500 suppliers):**
- Bandwidth: ~55MB ✅
- Function calls: ~1,000 ✅
- Cost: $0 (Free tier) ✅

## 🆘 Troubleshooting

### Issue: "Command not found: vercel"
```bash
# Install Vercel CLI
npm install -g vercel
# Or use npx
npx vercel --version
```

### Issue: DNS not resolving
```bash
# Check DNS propagation
dig supplier.galangryandana.my.id
nslookup supplier.galangryandana.my.id

# Wait 5-10 minutes for DNS propagation
```

### Issue: 502 Bad Gateway
```bash
# Check Apps Script URL is correct
# Verify Apps Script is deployed as Web App
# Check Vercel function logs
vercel logs
```

### Issue: Slow response
```bash
# Check response time
curl -w "@-" -o /dev/null -s "https://supplier.galangryandana.my.id"

# Check Vercel function region
# Add caching headers (already configured)
```

## 📱 Next Steps

After deployment:
1. ✅ Update step2.html "Kembali" button
2. ✅ Test full questionnaire flow
3. ✅ Monitor performance
4. ✅ Check analytics

## 🎉 Success Indicators

Your deployment is successful when:
- ✅ `https://supplier.galangryandana.my.id` loads
- ✅ No Google warning banner
- ✅ Response time < 500ms
- ✅ Camera scanner works
- ✅ Form submission works

Happy deploying! 🚀
