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
    // Extract slug from catch-all route
    // slug can be: ['supplier-gathering'] or ['supplier-gathering', 'wardeninit']
    const slugArray = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug];
    const slug = slugArray[0]; // First segment is the actual slug
    const subPath = slugArray.length > 1 ? '/' + slugArray.slice(1).join('/') : '';

    // Log request
    console.log(`[Proxy] ${req.method} /${slugArray.join('/')}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);

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
    
    // Prepare fetch options
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Akses-Shortener/1.0',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'id,en;q=0.9',
      },
      redirect: 'follow'
    };
    
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
        
        // Replace proxy domain URLs with Apps Script base
        const proxyPattern = new RegExp(
          `https?://${proxyHost.replace(/\./g, '\\.')}/${slug}(/[^"'\\s?]*)?(\\?[^"'\\s]*)?`,
          'g'
        );
        
        body = body.replace(proxyPattern, (match, path, query) => {
          path = path || '';
          query = query || '';

          // If path exists and is not just '/', it's a resource link (e.g., /static/style.css)
          // These should be rewritten to point to the script base URL.
          if (path && path !== '/') {
            return scriptBase + path + query;
          }

          // Otherwise, it's a root link (path is '', '/', or there's only a query).
          // These should be rewritten to point to the main /exec URL to ensure
          // navigation with query parameters works correctly.
          return APPS_SCRIPT_URL + query;
        });
        
        // Fix relative URLs
        body = body.replace(
          /(['"])(\/(?:static|macros|warden)[^"']*)/g,
          `$1${scriptBase}$2`
        );
        
        console.log('[Proxy] Rewrote resource URLs in HTML');
      }
    } else {
      body = await response.arrayBuffer();
    }
    
    // Forward response headers
    const forwardHeaders = {};
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
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
    
    res.status(500).json({
      error: 'Proxy Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
