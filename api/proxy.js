/**
 * Vercel Serverless Function - Reverse Proxy for Google Apps Script
 * 
 * Purpose: Proxy requests to Google Apps Script to:
 * 1. Eliminate "Google Apps Script" warning banner
 * 2. Provide custom domain (supplier.galangryandana.my.id)
 * 3. Improve performance with edge caching
 * 4. Professional branding
 */

// Your Google Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjIrwkM2lA8ov7qac0g2C-pLw8gcp-DO_xy-wTZ0Uigd7r-ijvNIhQv_SgLP5eIOy7/exec';

module.exports = async (req, res) => {
  try {
    // Log request for debugging
    console.log(`[Proxy] ${req.method} ${req.url}`);
    
    // Parse full URL with path and query
    const fullUrl = new URL(req.url, `https://${req.headers.host}`);
    const path = fullUrl.pathname;
    const queryString = fullUrl.search;
    
    // Build target URL - use path from request
    let targetUrl;
    if (path === '/' || path === '') {
      targetUrl = APPS_SCRIPT_URL + queryString;
    } else {
      // For other paths like /wardeninit, append to base URL
      const scriptBase = APPS_SCRIPT_URL.replace('/exec', '');
      targetUrl = scriptBase + path + queryString;
    }
    
    // Prepare fetch options
    // IMPORTANT: Don't forward Host header to prevent Google Apps Script 
    // from rewriting static resource URLs to our proxy domain
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Vercel-Proxy/1.0',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'id,en;q=0.9',
      },
      redirect: 'follow'
    };
    
    // Forward POST/PUT body if present
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.headers['content-type']) {
        fetchOptions.headers['Content-Type'] = req.headers['content-type'];
      }
      
      // Get raw body
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
        const proxyHost = req.headers.host || 'shortener-proxy.vercel.app';
        const scriptBase = APPS_SCRIPT_URL.replace('/exec', '');
        
        // Replace proxy domain with Apps Script base for all paths
        // This fixes static resources (/static/) and API calls (/wardeninit, etc)
        const proxyPattern = new RegExp(
          `https?://${proxyHost.replace(/\./g, '\\.')}(/[^"'\\s>]*)`,
          'g'
        );
        
        body = body.replace(proxyPattern, (match, path) => {
          // Keep only the main HTML on proxy domain, redirect everything else to script.google.com
          if (path === '/' || path === '' || path.startsWith('/?')) {
            return match; // Keep main page on proxy
          }
          return scriptBase + path; // Redirect static/API to script.google.com
        });
        
        // Also fix relative URLs
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
      // Skip some headers that Vercel handles
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    });
    
    // Set CORS headers if needed
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
    
    console.log(`[Proxy] Success: ${response.status}`);
    
  } catch (error) {
    console.error('[Proxy] Error:', error);
    
    res.status(500).json({
      error: 'Proxy Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
