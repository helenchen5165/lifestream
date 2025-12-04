import { CATEGORY_DEFINITIONS } from "../constants";
import { CategoryType, TimeEntry } from "../types";
import { v4 as uuidv4 } from 'uuid';

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log('API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'NOT FOUND');
  if (!apiKey) {
    throw new Error("API Key not found. Please set the VITE_GEMINI_API_KEY environment variable.");
  }
  return apiKey;
};

const callGeminiAPI = async (prompt: string, responseSchema?: any) => {
  const apiKey = getApiKey();
  // 使用 Gemini 1.5 Flash 稳定版（付费模型）
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  if (responseSchema) {
    requestBody.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: responseSchema
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
};

// Prompt helper to construct the context
const getCategoryContext = () => {
  let context = "We classify time into three categories based on these specific activities:\n";
  Object.entries(CATEGORY_DEFINITIONS).forEach(([key, def]) => {
    context += `- ${key} (${def.description}): ${def.activities.join(', ')}\n`;
  });
  return context;
};

export const parseNaturalLanguageInput = async (input: string): Promise<TimeEntry[]> => {
  const context = getCategoryContext();
  const now = new Date();

  const prompt = `
    User Input: "${input}"
    Current Date/Time: ${now.toISOString()}

    Task: Analyze the user's input describing their activities.
    1. Break down distinct activities.
    2. Map each activity to the closest Standard Activity from the provided list.
    3. Assign the correct Category (PRODUCTION, INVESTMENT, EXPENSE).
    4. Parse time ranges:
       - If user says "9点到10点" or "9:00-10:00", extract start and end times
       - If no time specified, use current time and calculate end time from duration
       - If only duration given (e.g., "1小时"), estimate reasonable start time
    5. Extract keywords from the task description for goal matching (e.g., "学习编程" → ["学习", "编程"])
    6. If the input implies a date (e.g., "yesterday", "昨天"), use that date. Otherwise use today.

    ${context}

    Important: Return ISO datetime strings for startTime and endTime (e.g., "2025-12-02T09:00:00.000Z")
  `;

  const responseSchema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        task: { type: "STRING", description: "The task description" },
        activity: { type: "STRING", description: "The standardized activity name from the list" },
        category: { type: "STRING", enum: [CategoryType.INVESTMENT, CategoryType.PRODUCTION, CategoryType.EXPENSE] },
        startTime: { type: "STRING", description: "ISO datetime string for start time" },
        endTime: { type: "STRING", description: "ISO datetime string for end time" },
        durationMinutes: { type: "INTEGER", description: "Duration in minutes" },
        dateStr: { type: "STRING", description: "YYYY-MM-DD format date" },
        keywords: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Keywords extracted from task for goal matching"
        }
      },
      required: ['task', 'activity', 'category', 'startTime', 'endTime', 'durationMinutes', 'dateStr', 'keywords']
    }
  };

  const responseText = await callGeminiAPI(prompt, responseSchema);
  const rawEntries = JSON.parse(responseText || "[]");

  // Hydrate with IDs and Timestamps
  return rawEntries.map((entry: any) => ({
    ...entry,
    id: uuidv4(),
    timestamp: new Date(entry.startTime).getTime()
  }));
};

export const generateAiReport = async (entries: TimeEntry[], period: string): Promise<string> => {
  const context = getCategoryContext();

  // Summarize data for the AI to reduce token usage
  const summary = entries.map(e => `${e.dateStr} ${e.startTime.split('T')[1].substring(0,5)}-${e.endTime.split('T')[1].substring(0,5)}: ${e.task} [${e.activity}] (${e.category}) - ${e.durationMinutes}分钟`).join('\n');

  const prompt = `
    You are a high-level productivity consultant.
    Analyze the following time logs for a ${period} period.

    The Philosophy:
    - Investment: Improves quality of life long-term.
    - Production: Creates direct value.
    - Expense: Maintenance costs of living.

    Data:
    ${summary}

    ${context}

    Task:
    Provide a concise but deep analysis in Markdown format.
    1. **Overview**: Brief summary of how time was spent.
    2. **Balance Analysis**: Are they spending too much on Expense? Is Investment sufficient?
    3. **Pattern Recognition**: Point out any good or bad habits visible in the logs.
    4. **Recommendations**: Give 3 specific, actionable tips to improve their structure based on this data.

    Keep the tone professional, encouraging, and insightful. Use Chinese language for the response.
  `;

  return await callGeminiAPI(prompt);
};
