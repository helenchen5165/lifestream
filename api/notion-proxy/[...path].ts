// Vercel Serverless Function for Notion API CORS Proxy (Catch-all route)
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 启用 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从 query 参数中提取路径
    const { path } = req.query;
    const notionPath = Array.isArray(path) ? path.join('/') : path || '';
    const notionUrl = `https://api.notion.com/${notionPath}`;

    console.log(`[${new Date().toISOString()}] ${req.method} ${notionUrl}`);

    // 转发请求到 Notion API
    const response = await fetch(notionUrl, {
      method: req.method as string,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
        'Notion-Version': (req.headers['notion-version'] as string) || '2022-06-28'
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();

    console.log(`[${new Date().toISOString()}] Response: ${response.status}`);

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    return res.status(500).json({
      error: error.message,
      details: 'Proxy server error'
    });
  }
}
