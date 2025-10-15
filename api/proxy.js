import { kv } from '@vercel/kv';

/**
 * Dynamic Slug Reverse Proxy for Google Apps Script
 * 
 * Routes: /{slug} -> Lookup in database -> Proxy to Apps Script URL
 * Purpose:
 * 1. Multi-tenant URL shortener
 * 2. Eliminate "Google Apps Script" warning banner
 * 3. Custom branded URLs for each app
 * 4. Professional appearance
 */

export default async function handler(req, res) {
  try {
    // Extract slug from query parameter (from rewrite: ?slug=supplier-gathering/wardeninit)
    const slugParam = req.query.slug || '';
    const parts = slugParam.split('/').filter(Boolean);
    const slug = parts[0]; // First segment is the actual slug
    const subPath = parts.length > 1 ? '/' + parts.slice(1).join('/') : '';

    // Log request
    console.log(`[Proxy] ${req.method} /${slugParam}`);

    // Lookup slug in database
    const mapping = await kv.get(`slug:${slug}`);
    
    if (!mapping) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Slug Not Found</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #667eea; font-size: 3rem; margin: 0 0 16px 0; }
            p { color: #666; font-size: 1.1rem; margin-bottom: 24px; }
            a { 
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              transition: transform 0.2s;
            }
            a:hover { transform: translateY(-2px); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <p>Slug <strong>"${slug}"</strong> tidak ditemukan.</p>
            <p>Pastikan URL yang Anda masukkan sudah benar.</p>
            <a href="/">← Kembali ke Beranda</a>
          </div>
        </body>
        </html>
      `);
    }

    const APPS_SCRIPT_URL = mapping.appsScriptUrl;

    // Increment access count (fire and forget)
    kv.hincrby(`slug:${slug}`, 'accessCount', 1).catch(err => {
      console.error('[Proxy] Failed to increment access count:', err);
    });

    // Parse query string
    const fullUrl = new URL(req.url, `https://${req.headers.host}`);
    const queryString = fullUrl.search;
    
    // Build target URL
    let targetUrl;
    if (!subPath || subPath === '/' || subPath === '') {
      // Main page: /{slug}
      targetUrl = APPS_SCRIPT_URL + queryString;
    } else {
      // Sub-paths: /{slug}/wardeninit, /{slug}/static/...
      const scriptBase = APPS_SCRIPT_URL.replace('/exec', '');
      targetUrl = scriptBase + subPath + queryString;
    }
    
    // Prepare fetch options with proper headers
    const scriptBase = APPS_SCRIPT_URL.replace('/exec', '');
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'id,en;q=0.9',
        'Origin': scriptBase + '/exec',
        'Referer': scriptBase + '/exec',
      },
      redirect: 'follow',
      credentials: 'include'
    };
    
    // Forward cookies if present
    if (req.headers.cookie) {
      fetchOptions.headers['Cookie'] = req.headers.cookie;
    }
    
    // Forward POST/PUT/PATCH body if present
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.headers['content-type']) {
        fetchOptions.headers['Content-Type'] = req.headers['content-type'];
      }
      
      if (req.body) {
        if (typeof req.body === 'string') {
          fetchOptions.body = req.body;
        } else if (Buffer.isBuffer(req.body)) {
          fetchOptions.body = req.body;
        } else {
          fetchOptions.body = JSON.stringify(req.body);
        }
      }
    }
    
    // Fetch from Apps Script
    console.log(`[Proxy] Fetching: ${targetUrl}`);
    console.log(`[Proxy] Method: ${req.method}, Content-Type: ${fetchOptions.headers['Content-Type']}`);
    console.log(`[Proxy] Body length: ${fetchOptions.body ? fetchOptions.body.length : 0}`);
    
    const response = await fetch(targetUrl, fetchOptions);
    
    // Get response body
    const contentType = response.headers.get('content-type') || '';
    let body;
    
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else if (contentType.includes('text/')) {
      body = await response.text();
      
      // Rewrite HTML to fix resource URLs
      if (contentType.includes('text/html') && typeof body === 'string') {
        const proxyHost = req.headers.host;
        const scriptBase = APPS_SCRIPT_URL.replace('/exec', '');
        const scriptDomain = 'script.google.com';
        
        // Extract nonce from CSP for inline script injection
        const nonceMatch = body.match(/nonce-([A-Za-z0-9_\-]+)/);
        const nonce = nonceMatch ? nonceMatch[1] : '';
        
        // Inject JavaScript shim to handle URL construction
        // IMPORTANT: Do NOT rewrite XHR/Fetch to script.google.com (CORS!)
        // Instead, let them go through proxy server-side
        const locationShim = `
<script${nonce ? ` nonce="${nonce}"` : ''}>
(function() {
  const proxySlug = '${slug}';
  const proxyBase = window.location.origin + '/' + proxySlug;
  
  // Override XMLHttpRequest to ensure URLs stay on proxy domain
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
      // Keep URL on proxy domain for server-side proxying (avoid CORS!)
      url = proxyBase + url;
      console.log('[Proxy Shim] XHR routed through proxy:', url);
    }
    return originalOpen.call(this, method, url, ...args);
  };
  
  // Override fetch to ensure URLs stay on proxy domain
  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
      // Keep URL on proxy domain for server-side proxying (avoid CORS!)
      url = proxyBase + url;
      console.log('[Proxy Shim] Fetch routed through proxy:', url);
    }
    return originalFetch.call(this, url, ...args);
  };
  
  console.log('[Proxy Shim] Initialized - Requests will be proxied server-side');
  console.log('[Proxy Shim] Proxy base:', proxyBase);
})();
</script>
`;
        
        // Inject shim at beginning of head (must run before any XHR calls)
        body = body.replace(/<head[^>]*>/i, `$&${locationShim}`);
        
        // Defer inline scripts that call goog.script.init until goog is loaded
        body = body.replace(
          /(<script[^>]*>)\s*\(function\(\)\s*\{[\s\S]*?goog\.script\.init\([\s\S]*?\}\)\(\);?\s*<\/script>/g,
          (match) => {
            // Extract the content
            const scriptContent = match.match(/\(function\(\)\s*\{([\s\S]*)\}\)\(\);?/)[1];
            // Wrap dengan goog check
            return `<script>
(function() {
  function initWhenReady() {
    if (typeof goog === 'undefined' || !goog.script || !goog.script.init) {
      console.log('[Proxy] Waiting for goog to load...');
      setTimeout(initWhenReady, 100);
      return;
    }
    console.log('[Proxy] goog loaded, initializing...');
    ${scriptContent}
  }
  initWhenReady();
})();
</script>`;
          }
        );
        
        // Replace proxy domain URLs with Apps Script base
        const proxyPattern = new RegExp(
          `https?://${proxyHost.replace(/\./g, '\\.')}/${slug}(/[^"'\\s>]*)`,
          'g'
        );
        
        body = body.replace(proxyPattern, (match, path) => {
          // Keep main page on proxy, redirect static/API to script.google.com
          if (!path || path === '/' || path.startsWith('/?')) {
            return match;
          }
          return scriptBase + path;
        });
        
        // Fix ALL relative URLs starting with / to absolute Apps Script URLs
        body = body.replace(
          /(['"\(])(\/[^"'\)\s][^"'\)]*)/g,
          (match, prefix, url) => {
            // Skip if already absolute or protocol-relative
            if (url.match(/^\/\//)) return match;
            // Convert to absolute Apps Script URL
            return prefix + scriptBase + url;
          }
        );
        
        // Fix ALL src and href attributes specifically (catch edge cases)
        body = body.replace(
          /(src|href)=(["'])([^"']+)\2/gi,
          (match, attr, quote, url) => {
            if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('http')) {
              return `${attr}=${quote}${scriptBase}${url}${quote}`;
            }
            return match;
          }
        );
        
        // Fix action and data attributes
        body = body.replace(
          /(action|data-url|data-href)=["']([^"']+)["']/gi,
          (match, attr, url) => {
            if (url.startsWith('/') && !url.startsWith('//')) {
              return `${attr}="${scriptBase}${url}"`;
            }
            return match;
          }
        );
        
        console.log('[Proxy] Rewrote all relative URLs to absolute Apps Script URLs');
      }
    } else {
      body = await response.arrayBuffer();
    }
    
    // Forward response headers
    const forwardHeaders = {};
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
        // Remove CSP for HTML responses to allow our injected shim script
        if (lowerKey === 'content-security-policy' && contentType.includes('text/html')) {
          // Skip CSP header - our shim needs to run without CSP restrictions
          console.log('[Proxy] Removed CSP header to allow shim injection');
          return; // Don't add this header
        }
        forwardHeaders[key] = value;
      }
    });
    
    // Set CORS headers
    forwardHeaders['Access-Control-Allow-Origin'] = '*';
    forwardHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    forwardHeaders['Access-Control-Allow-Headers'] = 'Content-Type';
    
    // Cache static resources
    if (contentType.includes('text/html')) {
      forwardHeaders['Cache-Control'] = 'public, s-maxage=60, stale-while-revalidate=120';
    } else if (contentType.includes('javascript') || contentType.includes('css')) {
      forwardHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
    }
    
    // Set response headers
    Object.keys(forwardHeaders).forEach(key => {
      res.setHeader(key, forwardHeaders[key]);
    });
    
    // Send response
    res.status(response.status);
    
    if (Buffer.isBuffer(body) || body instanceof ArrayBuffer) {
      res.send(Buffer.from(body));
    } else if (typeof body === 'string') {
      res.send(body);
    } else {
      res.json(body);
    }
    
    console.log(`[Proxy] Success: ${response.status} for slug: ${slug}`);
    
  } catch (error) {
    console.error('[Proxy] Error:', error);
    console.error('[Proxy] Error stack:', error.stack);
    console.error('[Proxy] Slug:', slug);
    console.error('[Proxy] SubPath:', subPath);
    console.error('[Proxy] Target URL:', targetUrl);
    
    res.status(500).json({
      error: 'Proxy Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
