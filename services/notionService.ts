import { NotionConfig, TimeEntry, CategoryType } from "../types";
import { CATEGORY_DEFINITIONS } from "../constants";

export const syncEntryToNotion = async (entry: TimeEntry, config: NotionConfig): Promise<string> => {
  const { apiKey, recordsDatabaseId } = config;

  if (!apiKey || !recordsDatabaseId) {
    throw new Error("Missing Notion configuration");
  }

  // Use proxy URL from config, environment variable, or direct API
  const proxyUrl = config.proxyUrl || import.meta.env.VITE_NOTION_PROXY_URL || '';

  // Construct the URL. Use proxy if provided, otherwise direct Notion API
  const notionApiPath = 'v1/pages';
  let url: string;

  if (proxyUrl) {
    // Remove trailing slash from proxyUrl
    const cleanProxyUrl = proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;

    // Check if it's our serverless function format (/api/notion-proxy) or local proxy (/notion/)
    if (cleanProxyUrl.includes('/notion-proxy') || cleanProxyUrl.includes('/notion')) {
      // Vercel serverless function or local proxy - just append the Notion API path
      url = `${cleanProxyUrl}/${notionApiPath}`;
    } else {
      // Old style proxy (like corsproxy.io) - needs full URL
      url = `${cleanProxyUrl}/https://api.notion.com/${notionApiPath}`;
    }
  } else {
    url = `https://api.notion.com/${notionApiPath}`;
  }

  const properties: any = {
    "Task": {
      title: [
        {
          text: {
            content: entry.task
          }
        }
      ]
    },
    "Duration (Minutes)": {
      number: entry.durationMinutes
    },
    "Start Time": {
      date: {
        start: entry.startTime
      }
    },
    "End Time": {
      date: {
        start: entry.endTime
      }
    },
    "支出项": {
      select: {
        name: entry.activity
      }
    }
    // Note: "性质" is a formula field in Notion, so we don't set it here
  };

  // Add Goal relation if available
  if (entry.goalId) {
    properties["Goal"] = {
      relation: [{ id: entry.goalId }]
    };
  }

  const body = {
    parent: { database_id: recordsDatabaseId },
    properties
  };

  console.log('📤 Notion API Request:', {
    url,
    method: 'POST',
    hasProxy: !!proxyUrl,
    proxyUrl: proxyUrl,
    databaseId: recordsDatabaseId,
    entry: { task: entry.task, activity: entry.activity }
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(body)
    });

    console.log('📥 Notion API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Notion API Error Details:", errorData);
      throw new Error(`Notion Sync Failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ Notion page created:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('❌ Notion sync error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Check for likely CORS error
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error("Network Error (Possibly CORS). 尝试以下方法:\n1. 使用本地代理服务器\n2. 确认CORS插件已启用\n3. 检查proxy URL格式");
    }
    throw error;
  }
};
