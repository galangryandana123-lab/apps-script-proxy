/**
 * Local testing script for Vibecode Proxy
 * Usage: node test-local.js
 */

import { createServer } from 'http';
import { parse } from 'url';

// Mock KV store for local testing
const mockKV = new Map();

// Mock data
mockKV.set('slug:test-app', {
  slug: 'test-app',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyjIrwkM2lA8ov7qac0g2C-pLw8gcp-DO_xy-wTZ0Uigd7r-ijvNIhQv_SgLP5eIOy7/exec',
  appName: 'Test Application',
  createdAt: new Date().toISOString()
});

console.log('🧪 Vibecode Proxy - Local Test Server');
console.log('=====================================');
console.log('');
console.log('Mock KV Store initialized with test data:');
console.log('- Slug: test-app');
console.log('- URL: https://script.google.com/macros/s/.../exec');
console.log('');

// Create simple HTTP server for testing
const server = createServer((req, res) => {
  const { pathname } = parse(req.url);
  
  // Serve landing page
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vibecode Proxy - Local Test</title>
        <style>
          body { 
            font-family: system-ui; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h1 { color: #667eea; }
          .test-links {
            margin-top: 30px;
            padding: 20px;
            background: #f7fafc;
            border-radius: 8px;
          }
          .test-links a {
            display: block;
            margin: 10px 0;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
          }
          .test-links a:hover {
            text-decoration: underline;
          }
          code {
            background: #edf2f7;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🧪 Local Test Mode</h1>
          <p>This is a local test server for Vibecode Proxy development.</p>
          
          <div class="test-links">
            <h3>Test Links:</h3>
            <a href="/test-app">→ Test proxy with mock slug: <code>/test-app</code></a>
            <a href="/api/stats">→ View mock statistics: <code>/api/stats</code></a>
            <a href="/non-existent">→ Test 404 error: <code>/non-existent</code></a>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #fff5f5; border-radius: 8px; border-left: 4px solid #f56565;">
            <strong>⚠️ Note:</strong> This is a mock server for local testing only. 
            For production deployment, use <code>vercel dev</code> or deploy to Vercel.
          </div>
        </div>
      </body>
      </html>
    `);
  }
  
  // Mock API stats endpoint
  else if (pathname === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalApps: 5,
      totalAccess: 1234,
      uptime: 99.9,
      testMode: true
    }, null, 2));
  }
  
  // Mock proxy endpoint
  else if (pathname === '/test-app') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test App (Proxied)</title>
      </head>
      <body style="font-family: system-ui; padding: 40px; text-align: center;">
        <h1>✅ Proxy Working!</h1>
        <p>This is a mock response simulating a proxied Google Apps Script app.</p>
        <p>Slug: <strong>test-app</strong></p>
        <p>In production, this would show your actual Apps Script content without the warning banner.</p>
      </body>
      </html>
    `);
  }
  
  // 404 handler
  else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - Not Found</title>
      </head>
      <body style="font-family: system-ui; padding: 40px; text-align: center;">
        <h1>404</h1>
        <p>Slug not found: <strong>${pathname.substring(1)}</strong></p>
        <p><a href="/">← Back to home</a></p>
      </body>
      </html>
    `);
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Test server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`- http://localhost:${PORT}/           (Landing page)`);
  console.log(`- http://localhost:${PORT}/test-app   (Mock proxy)`);
  console.log(`- http://localhost:${PORT}/api/stats  (Mock stats)`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
