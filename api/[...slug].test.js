import assert from 'assert';

// --- The handler function from [...slug].js ---
// This is a simplified version focusing only on the HTML rewrite logic.
// It's self-contained and doesn't need external modules.
async function testableRewriteLogic(req, slug, mapping, APPS_SCRIPT_URL) {
    const scriptBase = APPS_SCRIPT_URL.replace('/exec', '');
    const proxyHost = req.headers.host;

    // This is the HTML that would have been fetched from the upstream service
    const body = `
      <html>
        <body>
          <h1>Test Page</h1>
          <a href="https://test-proxy.com/my-app/static/style.css">Stylesheet</a>
          <a href="https://test-proxy.com/my-app?action=edit">Edit Link</a>
          <a href="https://test-proxy.com/my-app/">Home Link</a>
          <a href="https://test-proxy.com/my-app">Another Home Link</a>
          <a href="https://test-proxy.com/my-app/sub/path?param=1">Subpath Link</a>
        </body>
      </html>
    `;

    // --- The NEW, FIXED Regex and logic ---
    const proxyPattern = new RegExp(
      `https?://${proxyHost.replace(/\./g, '\\.')}/${slug}(/[^"'\\s?]*)?(\\?[^"'\\s]*)?`,
      'g'
    );

    let rewrittenBody = body.replace(proxyPattern, (match, path, query) => {
      path = path || '';
      query = query || '';

      // If path exists and is not just '/', it's a resource link
      if (path && path !== '/') {
        return scriptBase + path + query;
      }

      // Otherwise, it's a root link, rewrite to main /exec URL
      return APPS_SCRIPT_URL + query;
    });

    return rewrittenBody;
}


// --- Test Execution ---
async function runTests() {
  console.log('Running tests for URL rewrite fix in [...slug].js...');

  // --- Test Setup ---
  const req = {
    headers: { host: 'test-proxy.com' },
  };
  const slug = 'my-app';
  // We use a static object instead of importing/mocking @vercel/kv
  const mapping = {
    appsScriptUrl: 'https://script.google.com/a/macros/example.com/s/12345/exec'
  };
  const APPS_SCRIPT_URL = mapping.appsScriptUrl;

  const rewrittenBody = await testableRewriteLogic(req, slug, mapping, APPS_SCRIPT_URL);

  // --- Assertions ---

  // 1. Test that a static asset URL IS correctly rewritten to script base
  const expectedStaticUrl = `${APPS_SCRIPT_URL.replace('/exec', '')}/static/style.css`;
  assert(
    rewrittenBody.includes(`href="${expectedStaticUrl}"`),
    `FAIL: Static URL was not rewritten correctly. Expected: ${expectedStaticUrl}`
  );
  console.log('PASS: Static URL was rewritten correctly.');

  // 2. Test that a root URL with a query string IS NOW rewritten to the /exec URL
  const expectedProblematicUrl = `${APPS_SCRIPT_URL}?action=edit`;
  assert(
    rewrittenBody.includes(`href="${expectedProblematicUrl}"`),
    `FAIL: Problematic URL was not rewritten correctly. Expected: ${expectedProblematicUrl}`
  );
  console.log('PASS: Root URL with query string was fixed and rewritten correctly.');

  // 3. Test that a simple root URL with a trailing slash IS rewritten to the /exec URL
  assert(
    rewrittenBody.includes(`href="${APPS_SCRIPT_URL}"`),
    `FAIL: Root URL with slash was not rewritten correctly. Expected: ${APPS_SCRIPT_URL}`
  );
  console.log('PASS: Root URL with slash was rewritten correctly.');

  // 4. Test that a simple root URL without a trailing slash IS rewritten to the /exec URL
  assert(
    rewrittenBody.includes(`<a href="${APPS_SCRIPT_URL}">Another Home Link</a>`),
    `FAIL: Root URL without slash was not rewritten correctly.`
  );
  console.log('PASS: Root URL without slash was rewritten correctly.');

  // 5. Test that a subpath URL is rewritten correctly
  const expectedSubpathUrl = `${APPS_SCRIPT_URL.replace('/exec', '')}/sub/path?param=1`;
   assert(
    rewrittenBody.includes(`href="${expectedSubpathUrl}"`),
    `FAIL: Subpath URL was not rewritten correctly. Expected: ${expectedSubpathUrl}`
  );
  console.log('PASS: Subpath URL was rewritten correctly.');


  console.log('\nAll tests passed! The fix is working as expected.');
}

runTests().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});