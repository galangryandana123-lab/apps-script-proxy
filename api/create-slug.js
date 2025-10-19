import { kv } from '@vercel/kv';
import { resolveOrigin } from './_utils.js';

/**
 * API endpoint to create new slug mappings
 * POST /api/create-slug
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug, appsScriptUrl, appName } = req.body;

    // Validate input
    if (!slug || !appsScriptUrl || !appName) {
      return res.status(400).json({ 
        error: 'Missing required fields: slug, appsScriptUrl, appName' 
      });
    }

    // Validate slug format (alphanumeric and hyphens only)
    if (!slug.match(/^[a-z0-9-]+$/)) {
      return res.status(400).json({ 
        error: 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung' 
      });
    }

    // Validate Apps Script URL (allow parameters at the end)
    if (!appsScriptUrl.match(/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(\?.*)?$/)) {
      return res.status(400).json({ 
        error: 'URL Google Apps Script tidak valid' 
      });
    }

    // Check if slug already exists
    const existingMapping = await kv.get(`slug:${slug}`);
    if (existingMapping) {
      return res.status(409).json({ 
        error: `Slug "${slug}" sudah digunakan. Silakan gunakan nama lain.` 
      });
    }

    // Store the mapping
    const mapping = {
      slug,
      appsScriptUrl,
      appName,
      createdAt: new Date().toISOString(),
      accessCount: 0
    };

    await kv.set(`slug:${slug}`, mapping);

    // Log creation
    console.log(`[Create Slug] Created: ${slug} -> ${appsScriptUrl}`);

    const origin = resolveOrigin(req);
    const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : undefined;
    const publicUrl = normalizedOrigin ? `${normalizedOrigin}/${slug}` : `/${slug}`;

    // Return success response
    return res.status(201).json({
      success: true,
      slug,
      message: `Custom URL berhasil dibuat: /${slug}`,
      url: publicUrl
    });

  } catch (error) {
    console.error('[Create Slug] Error:', error);
    return res.status(500).json({
      error: 'Terjadi kesalahan saat membuat custom URL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
