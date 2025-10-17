import { kv } from '@vercel/kv';

/**
 * Iframe-based Proxy for Google Apps Script
 * Similar approach to akses.digital - using iframe embedding
 * 
 * Trade-offs:
 * ✅ Apps Script fully functional (all features work)
 * ✅ User authentication works
 * ⚠️ Google warning banner will show initially
 * ✅ But URL stays on our domain
 */

export default async function handler(req, res) {
  // Extract slug from query
  const slugParam = req.query.slug || '';
  const parts = slugParam.split('/').filter(Boolean);
  const slug = parts[0];
  
  try {
    console.log(`[IFrame Proxy] Slug: ${slug}`);
    
    // Lookup slug in database
    const mapping = await kv.get(`slug:${slug}`);
    
    if (!mapping) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, system-ui, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .error-container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #667eea; }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>404</h1>
            <p>Aplikasi dengan kode <strong>"${slug}"</strong> tidak ditemukan.</p>
            <a href="/">Kembali</a>
          </div>
        </body>
        </html>
      `);
    }
    
    const APPS_SCRIPT_URL = mapping.appsScriptUrl;
    
    // Increment access count
    kv.incr(`slug:${slug}:count`).catch(err => {
      console.error('[IFrame Proxy] Failed to increment count:', err);
    });
    
    // Generate iframe-based page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${mapping.appName || 'Apps Script App'}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, system-ui, sans-serif;
    }
    
    /* Loading overlay */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: opacity 0.5s;
    }
    
    .loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    
    .loader {
      text-align: center;
      color: white;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      margin: 0 auto 20px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-text {
      font-size: 1.2rem;
      margin-bottom: 10px;
    }
    
    .loading-subtext {
      font-size: 0.9rem;
      opacity: 0.9;
    }
    
    /* Main iframe container */
    .iframe-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
    }
    
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }
    
    /* Warning banner info (if user needs to know) */
    .info-banner {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      z-index: 1000;
      display: none;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .info-banner:hover {
      background: rgba(0, 0, 0, 0.9);
      transform: scale(1.05);
    }
    
    .info-banner.show {
      display: block;
      animation: slideIn 0.5s;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
      .loading-text {
        font-size: 1rem;
      }
      .loading-subtext {
        font-size: 0.8rem;
        padding: 0 20px;
      }
      .info-banner {
        top: auto;
        bottom: 10px;
        right: 10px;
        left: 10px;
        text-align: center;
      }
    }
    
    /* Handle Google's warning banner */
    .warning-note {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff3cd;
      color: #856404;
      padding: 12px 20px;
      border-radius: 8px;
      border: 1px solid #ffeeba;
      font-size: 0.9rem;
      z-index: 10;
      max-width: 90%;
      text-align: center;
      display: none;
    }
    
    .warning-note.show {
      display: block;
      animation: bounceIn 0.5s;
    }
    
    @keyframes bounceIn {
      0% {
        transform: translateX(-50%) scale(0.8);
        opacity: 0;
      }
      50% {
        transform: translateX(-50%) scale(1.05);
      }
      100% {
        transform: translateX(-50%) scale(1);
        opacity: 1;
      }
    }
  </style>
</head>
<body>
  <!-- Loading Overlay -->
  <div class="loading-overlay" id="loadingOverlay">
    <div class="loader">
      <div class="spinner"></div>
      <div class="loading-text">Loading ${mapping.appName || 'Application'}...</div>
      <div class="loading-subtext">Please wait a moment</div>
    </div>
  </div>
  
  <!-- Info Banner (disabled) -->
  <!-- <div class="info-banner" id="infoBanner" onclick="this.style.display='none'">
    💡 Tip: Bookmark this page for quick access
  </div> -->
  
  <!-- Warning Note (disabled) -->
  <!-- <div class="warning-note" id="warningNote">
    ⚠️ You may see a Google warning on first load - click "Continue" to proceed
  </div> -->
  
  <!-- Main iFrame -->
  <div class="iframe-container">
    <iframe 
      id="appsFrame"
      src="${APPS_SCRIPT_URL}"
      allow="camera; microphone; geolocation; *"
      allowfullscreen
      loading="lazy"
      sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation"
      onload="handleIframeLoad()"
      onerror="handleIframeError()"
    ></iframe>
  </div>
  
  <script>
    // Configuration
    const CONFIG = {
      loadingTimeout: 3000,  // Hide loading after 3 seconds
      showInfoBanner: false,  // Disabled - no bookmark tip
      showWarningNote: false,  // Disabled - no warning text
      warningDuration: 10000  // Show warning for 10 seconds
    };
    
    // Handle iframe load
    function handleIframeLoad() {
      console.log('Apps Script iframe loaded');
      hideLoading();
      
      // Show info banner after load (disabled)
      if (CONFIG.showInfoBanner) {
        // setTimeout(() => {
        //   document.getElementById('infoBanner').classList.add('show');
        // }, 2000);
      }
    }
    
    // Handle iframe error
    function handleIframeError() {
      console.error('Failed to load Apps Script');
      document.getElementById('loadingOverlay').innerHTML = \`
        <div class="loader">
          <div style="font-size: 3rem; margin-bottom: 20px;">😕</div>
          <div class="loading-text">Failed to load application</div>
          <div class="loading-subtext">Please refresh the page or try again later</div>
        </div>
      \`;
    }
    
    // Hide loading overlay
    function hideLoading() {
      const overlay = document.getElementById('loadingOverlay');
      overlay.classList.add('hidden');
      
      // Remove from DOM after animation
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 500);
    }
    
    // Auto-hide loading after timeout (in case onload doesn't fire)
    setTimeout(hideLoading, CONFIG.loadingTimeout);
    
    // Show warning note about Google banner (disabled)
    if (CONFIG.showWarningNote) {
      // Check if first visit (using sessionStorage)
      // if (!sessionStorage.getItem('warned-${slug}')) {
      //   setTimeout(() => {
      //     document.getElementById('warningNote').classList.add('show');
      //     sessionStorage.setItem('warned-${slug}', 'true');
      //     
      //     // Auto-hide warning after duration
      //     setTimeout(() => {
      //       document.getElementById('warningNote').style.display = 'none';
      //     }, CONFIG.warningDuration);
      //   }, 1000);
      // }
    }
    
    // Prevent iframe breakout attempts
    if (window.top !== window.self) {
      window.top.location = window.self.location;
    }
    
    // Analytics (optional)
    console.log('App loaded: ${slug}');
    console.log('URL: ${APPS_SCRIPT_URL}');
  </script>
</body>
</html>
    `;
    
    // Set response headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    // Send HTML response
    res.status(200).send(html);
    
    console.log(`[IFrame Proxy] Success for slug: ${slug}`);
    
  } catch (error) {
    console.error('[IFrame Proxy] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
}
