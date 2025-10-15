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

// Disable body parsing - we'll handle it manually
export const config = {
  api: {
    bodyParser: true, // Enable body parsing
    sizeLimit: '10mb'
  }
};

export default async function handler(req, res) {
  // Extract slug from query parameter (from rewrite: ?slug=supplier-gathering/wardeninit)
  const slugParam = req.query.slug || '';
  const parts = slugParam.split('/').filter(Boolean);
  const slug = parts[0]; // First segment is the actual slug
  const subPath = parts.length > 1 ? '/' + parts.slice(1).join('/') : '';
  let targetUrl = ''; // Declare here for error logging
  
  try {

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

    // Increment access count in separate key (fire and forget)
    // Note: mapping is stored as JSON string, so we use separate key for counter
    kv.incr(`slug:${slug}:count`).catch(err => {
      console.error('[Proxy] Failed to increment access count:', err);
    });

    // Parse query string and remove internal 'slug' parameter
    const fullUrl = new URL(req.url, `https://${req.headers.host}`);
    const searchParams = new URLSearchParams(fullUrl.search);
    
    // Remove internal routing parameter
    searchParams.delete('slug');
    
    // Reconstruct query string (with leading ? if not empty)
    const queryString = searchParams.toString() ? '?' + searchParams.toString() : '';
    
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
    
    // Prepare fetch options - forward ALL client headers except problematic ones
    const scriptBase = APPS_SCRIPT_URL.replace('/exec', '');
    const fetchOptions = {
      method: req.method,
      headers: {},
      redirect: 'follow'
    };
    
    // Forward headers from client, excluding problematic ones
    const skipHeaders = [
      'host', 'connection', 'content-length', 'content-encoding', 'transfer-encoding',
      // Skip all Vercel-specific headers that leak proxy info
      'x-vercel-', 'x-forwarded-', 'x-real-ip', 'x-same-domain', 'forwarded',
      'x-vercel-id', 'x-vercel-deployment-url', 'x-vercel-forwarded-for', 
      'x-vercel-proxied-for', 'x-vercel-proxy-signature', 'x-vercel-oidc-token',
      'x-vercel-ip-', 'x-vercel-ja4-digest', 'x-vercel-internal-',
      // Skip origin/referer - we'll override with correct values
      'origin', 'referer'
    ];
    
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      // Skip if matches any skip pattern
      const shouldSkip = skipHeaders.some(pattern => 
        lowerKey === pattern || lowerKey.startsWith(pattern)
      );
      if (!shouldSkip) {
        fetchOptions.headers[key] = value;
      }
    }
    
    // Set correct Origin and Referer (case-sensitive, will override any existing)
    fetchOptions.headers['origin'] = scriptBase + '/exec';
    fetchOptions.headers['referer'] = scriptBase + '/exec';
    
    console.log(`[Proxy] Forwarding ${Object.keys(fetchOptions.headers).length} headers (cleaned)`);
    
    // Forward POST/PUT/PATCH body if present
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.headers['content-type']) {
        fetchOptions.headers['Content-Type'] = req.headers['content-type'];
      }
      
      // Read body - Vercel provides body in different formats
      let bodyContent = null;
      
      if (req.body) {
        if (typeof req.body === 'string') {
          bodyContent = req.body;
        } else if (Buffer.isBuffer(req.body)) {
          bodyContent = req.body;
        } else if (typeof req.body === 'object') {
          // If body is already parsed as object, stringify it
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            bodyContent = JSON.stringify(req.body);
          } else {
            // For form-urlencoded, convert object to query string
            bodyContent = Object.keys(req.body)
              .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(req.body[key])}`)
              .join('&');
          }
        }
      }
      
      if (bodyContent) {
        fetchOptions.body = bodyContent;
        console.log(`[Proxy] Body preview: ${bodyContent.substring(0, 200)}`);
      }
    }
    
    // Fetch from Apps Script
    console.log(`[Proxy] Fetching: ${targetUrl}`);
    console.log(`[Proxy] Method: ${req.method}`);
    console.log(`[Proxy] Headers:`, JSON.stringify(fetchOptions.headers, null, 2));
    console.log(`[Proxy] Body type: ${typeof fetchOptions.body}, length: ${fetchOptions.body ? fetchOptions.body.length : 0}`);
    if (fetchOptions.body) {
      console.log(`[Proxy] Body preview: ${fetchOptions.body.substring(0, 500)}`);
    }
    
    let response;
    try {
      response = await fetch(targetUrl, fetchOptions);
      console.log(`[Proxy] Response status: ${response.status}`);
    } catch (fetchError) {
      console.error(`[Proxy] Fetch failed:`, fetchError);
      throw fetchError;
    }
    
    // Get response body
    const contentType = response.headers.get('content-type') || '';
    console.log(`[Proxy] Response content-type: ${contentType}`);
    let body;
    
    try {
      if (contentType.includes('application/json')) {
        // Get raw text first to handle XSSI protection prefix
        let rawText = await response.text();
        console.log(`[Proxy] Raw JSON response preview: ${rawText.substring(0, 100)}`);
        
        // Strip Google Apps Script XSSI protection prefix: )]}'
        if (rawText.startsWith(")]}'\n")) {
          rawText = rawText.substring(5);
          console.log(`[Proxy] Stripped XSSI prefix )]}'`);
        }
        
        body = JSON.parse(rawText);
        console.log(`[Proxy] JSON response length: ${JSON.stringify(body).length}`);
      } else if (contentType.includes('text/')) {
        body = await response.text();
        console.log(`[Proxy] Text response length: ${body.length}`);
      
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
        
        // Replace all goog.script.init calls with safe wrapper
        body = body.replace(
          /goog\.script\.init\(/g,
          `(function(){ var maxRetries=20; var retryCount=0; function tryInit(data){ if(typeof goog!=='undefined'&&goog.script&&goog.script.init){ console.log('[Proxy] goog.script.init executing'); goog.script.init(data); }else{ retryCount++; if(retryCount<maxRetries){ console.log('[Proxy] Waiting for goog... retry '+retryCount); setTimeout(function(){tryInit(data);},100); }else{ console.error('[Proxy] goog failed to load after '+maxRetries+' retries'); } } } return tryInit; })()(`
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
      console.log(`[Proxy] Binary response length: ${body.byteLength}`);
    }
    } catch (bodyError) {
      console.error(`[Proxy] Error parsing response body:`, bodyError);
      throw bodyError;
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
