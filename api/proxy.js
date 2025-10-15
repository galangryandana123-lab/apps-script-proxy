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
    
    // Build target URL with query parameters
    const targetUrl = new URL(APPS_SCRIPT_URL);
    
    // Forward all query parameters
    Object.keys(req.query).forEach(key => {
      targetUrl.searchParams.append(key, req.query[key]);
    });
    
    // Prepare fetch options
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Vercel-Proxy/1.0',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'id,en;q=0.9',
        'Referer': req.headers['referer'] || '',
      },
      redirect: 'follow'
    };
    
    // Forward POST body if present
    if (req.method === 'POST' && req.body) {
      fetchOptions.headers['Content-Type'] = req.headers['content-type'] || 'application/json';
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    // Fetch from Apps Script
    console.log(`[Proxy] Fetching: ${targetUrl.toString()}`);
    const response = await fetch(targetUrl.toString(), fetchOptions);
    
    // Get response body
    const contentType = response.headers.get('content-type') || '';
    let body;
    
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else if (contentType.includes('text/')) {
      body = await response.text();
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
