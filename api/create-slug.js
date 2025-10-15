import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug, appName, appsScriptUrl } = req.body;

    // Validate input
    if (!slug || !appName || !appsScriptUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: slug, appName, appsScriptUrl' 
      });
    }

    // Validate Apps Script URL format
    if (!appsScriptUrl.includes('/macros/s/') || !appsScriptUrl.endsWith('/exec')) {
      return res.status(400).json({ 
        error: 'Invalid Apps Script URL. Must contain /macros/s/ and end with /exec' 
      });
    }

    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ 
        error: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens' 
      });
    }

    // Reserved slugs
    const reservedSlugs = ['api', 'admin', 'static', 'public', '_next', 'vercel'];
    if (reservedSlugs.includes(slug)) {
      return res.status(400).json({ 
        error: 'This slug is reserved. Please choose another name' 
      });
    }

    // Check if slug already exists
    const existing = await kv.get(`slug:${slug}`);
    if (existing) {
      return res.status(409).json({ 
        error: 'Slug already exists. Please choose a different name',
        existingSlug: slug
      });
    }

    // Save to KV
    const mapping = {
      slug,
      appName,
      appsScriptUrl,
      createdAt: new Date().toISOString(),
      accessCount: 0
    };

    await kv.set(`slug:${slug}`, mapping);

    // Also save to index for listing (optional, for future admin panel)
    await kv.sadd('slugs:all', slug);

    console.log(`[Create Slug] Created: ${slug} -> ${appsScriptUrl}`);

    return res.status(201).json({
      success: true,
      slug,
      customUrl: `${req.headers.host}/${slug}`,
      message: 'Slug created successfully'
    });

  } catch (error) {
    console.error('[Create Slug] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
