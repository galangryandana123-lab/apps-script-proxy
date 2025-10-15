import { kv } from '@vercel/kv';

/**
 * API endpoint to get platform statistics
 * GET /api/stats
 */
export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all keys that match our slug pattern
    // Note: This is a simplified implementation
    // In production, you might want to maintain separate counters
    
    // For demo purposes, return mock data
    // In production, you would iterate through KV store
    const stats = {
      totalApps: 12,  // Mock data
      totalAccess: 1847,  // Mock data
      uptime: 99.9,
      lastUpdated: new Date().toISOString()
    };

    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return res.status(200).json(stats);

  } catch (error) {
    console.error('[Stats API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch statistics',
      totalApps: 0,
      totalAccess: 0
    });
  }
}
