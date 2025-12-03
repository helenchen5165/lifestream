// Simple CORS proxy server for Notion API
// Run with: node proxy-server.js

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 8080;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Proxy endpoint - catch all requests starting with /notion/
app.use('/notion', async (req, res) => {
  try {
    // Extract the Notion API path (remove /notion prefix)
    const notionPath = req.path.substring(1); // Remove leading /
    const notionUrl = `https://api.notion.com/${notionPath}`;

    console.log(`📡 Proxying request: ${req.method} ${notionUrl}`);

    // Forward the request to Notion API
    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
        'Notion-Version': req.headers['notion-version'] || '2022-06-28'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    // Get response data
    const data = await response.json();

    // Forward the response
    res.status(response.status).json(data);

    if (response.ok) {
      console.log(`✅ Success: ${response.status}`);
    } else {
      console.log(`❌ Error: ${response.status}`, data);
    }
  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
🚀 CORS Proxy Server Running!

📍 Local URL: http://localhost:${PORT}

✅ Usage in Notion Settings:
   CORS Proxy URL: http://localhost:${PORT}/notion/

🔧 To stop: Press Ctrl+C
  `);
});
