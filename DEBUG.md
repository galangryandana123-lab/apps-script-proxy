# 🐛 Debug Guide - Vibecode Proxy

## Fixed Issues

### ✅ Blank Page Issue (15 Oct 2024)

**Problem**: Halaman blank saat akses URL dengan slug, `/wardeninit` return 400 Bad Request

**Root Cause**: 
- Proxy salah routing `/wardeninit` ke `script.google.com/.../wardeninit` 
- Seharusnya ke `script.google.com/.../exec/wardeninit`

**Solution**:
1. Fixed URL routing logic untuk handle `/wardeninit` specially
2. Preserve `x-same-domain` header yang required oleh Google Apps Script
3. Set correct origin dan referer headers

**Changes Made**:
```javascript
// Before: semua sub-path dianggap static
targetUrl = scriptBase + subPath + queryString;

// After: specific handling per endpoint type
if (subPath === '/wardeninit') {
  targetUrl = APPS_SCRIPT_URL + '/wardeninit' + queryString; // routes to /exec/wardeninit
}
```

## Testing Checklist

### After Deployment:

1. **Test Main Page Load**
   - Akses: `https://shortener-proxy.vercel.app/[slug]`
   - Expected: Halaman Apps Script muncul tanpa warning banner
   - Check Console: Tidak ada error 400

2. **Check Network Tab**
   - `/wardeninit` request should return 200 OK
   - Response should contain proper initialization data

3. **Test Form Submission** (if applicable)
   - Submit form di Apps Script app
   - Should work without CORS errors

## Common Issues & Solutions

### Issue: Still getting 400 on wardeninit

**Possible Causes**:
1. Session expired - clear cookies and try again
2. Apps Script not deployed properly - redeploy as Web App with "Anyone" access
3. Wrong script URL in database

**Debug Steps**:
```bash
# Check Vercel logs
vercel logs --follow

# Look for these key logs:
# [Proxy] Wardeninit request, target: ...
# [Proxy] Response status: ...
```

### Issue: CORS errors

**Solution**: 
- Pastikan semua API calls melalui proxy, bukan direct ke script.google.com
- Check browser console untuk melihat URL mana yang error

### Issue: Static resources 404

**Expected Behavior**:
- Static resources (`/static/`, `/macros/`) load directly dari `https://script.google.com`
- API calls (`/wardeninit`, `/exec`) melalui proxy

## Debugging Tools

### 1. Enable Verbose Logging

Tambahkan di proxy.js untuk debug detail:
```javascript
console.log('[DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
console.log('[DEBUG] Response headers:', JSON.stringify(response.headers, null, 2));
```

### 2. Test Direct Access

Test apakah Apps Script URL bekerja directly:
```bash
curl -I https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Should return 200 OK or 302 redirect.

### 3. Check KV Database

Verify slug mapping di Vercel KV:
```javascript
// Add debug endpoint: /api/debug/[slug].js
const mapping = await kv.get(`slug:${slug}`);
console.log('Mapping:', mapping);
```

## Performance Optimization

### Current Optimizations:
1. ✅ Static resources load directly (no proxy overhead)
2. ✅ HTML cached for 60s
3. ✅ JS/CSS cached for 1 year

### Future Improvements:
1. Consider edge caching for proxy responses
2. Implement request batching for multiple API calls
3. Add compression for large responses

## Security Notes

### Current Security:
1. ✅ Security headers applied (CSP, XSS Protection, etc.)
2. ✅ Origin/Referer properly spoofed for Apps Script
3. ✅ Sensitive headers filtered

### Important:
- Never log full cookie values
- Don't expose Apps Script URLs in client-side code
- Rate limiting handled by Vercel automatically

## Contact

Jika masih ada issues setelah fix ini:
1. Check Vercel deployment logs
2. Clear browser cache & cookies
3. Test dengan browser incognito mode
4. Contact: support@vibecode.com

---

Last Updated: 15 Oct 2024
Fix Version: f7ca260
