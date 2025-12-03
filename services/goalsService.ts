import { Goal, NotionConfig, TimeEntry } from '../types';

/**
 * Fetch active goals from Notion Goals database
 * Filters: Status != "Completed" AND Deadline >= record date
 */
export const fetchActiveGoals = async (
  config: NotionConfig,
  recordDate: string
): Promise<Goal[]> => {
  // Use proxy URL from config, environment variable, or direct API
  const proxyUrl = config.proxyUrl || import.meta.env.VITE_NOTION_PROXY_URL || '';

  const notionApiPath = `v1/databases/${config.goalsDatabaseId}/query`;
  let url: string;

  if (proxyUrl) {
    // If proxy URL includes /notion/, use local proxy format
    if (proxyUrl.includes('/notion/')) {
      url = `${proxyUrl}${notionApiPath}`;
    } else {
      // Old style proxy (like corsproxy.io)
      url = `${proxyUrl}https://api.notion.com/${notionApiPath}`;
    }
  } else {
    url = `https://api.notion.com/${notionApiPath}`;
  }

  const requestBody = {
    filter: {
      and: [
        {
          property: 'Status',
          status: {
            does_not_equal: 'Completed'
          }
        },
        {
          property: 'Deadline',
          date: {
            on_or_after: recordDate
          }
        }
      ]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch goals: ${response.statusText}`);
    }

    const data = await response.json();

    return data.results.map((page: any) => ({
      id: page.id,
      title: page.properties['Goal Title']?.title?.[0]?.plain_text || '',
      deadline: page.properties['Deadline']?.date?.start || '',
      priority: page.properties['Priority']?.select?.name,
      status: page.properties['Status']?.status?.name || 'Planned',
      estimatedTime: page.properties['Estimated Time']?.number,
      progress: page.properties['Progress']?.number,
      durationType: page.properties['Duration Type']?.select?.name
    }));
  } catch (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
};

/**
 * Match a time entry to a goal based on keywords
 * Returns the best matching goal or null if no match found
 */
export const matchGoalToEntry = (
  entry: TimeEntry,
  goals: Goal[]
): { goalId: string; goalTitle: string } | null => {
  if (!entry.keywords || entry.keywords.length === 0 || goals.length === 0) {
    return null;
  }

  let bestMatch: { goal: Goal; score: number } | null = null;

  goals.forEach(goal => {
    const goalTitleLower = goal.title.toLowerCase();
    let matchScore = 0;

    // Count how many keywords appear in the goal title
    entry.keywords!.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (goalTitleLower.includes(keywordLower)) {
        matchScore++;
      }
    });

    // Update best match if this goal has a higher score
    if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
      bestMatch = { goal, score: matchScore };
    }
  });

  if (bestMatch) {
    return {
      goalId: bestMatch.goal.id,
      goalTitle: bestMatch.goal.title
    };
  }

  return null;
};

/**
 * Process time entries and match them to goals
 */
export const processEntriesWithGoals = async (
  entries: TimeEntry[],
  config: NotionConfig
): Promise<TimeEntry[]> => {
  if (!config.goalsDatabaseId || entries.length === 0) {
    return entries;
  }

  try {
    // Get the earliest date from entries
    const earliestDate = entries.reduce((min, entry) => {
      return entry.dateStr < min ? entry.dateStr : min;
    }, entries[0].dateStr);

    // Fetch active goals
    const goals = await fetchActiveGoals(config, earliestDate);

    if (goals.length === 0) {
      console.log('No active goals found');
      return entries;
    }

    console.log(`Found ${goals.length} active goals`);

    // Match each entry to a goal
    return entries.map(entry => {
      const match = matchGoalToEntry(entry, goals);
      if (match) {
        console.log(`Matched "${entry.task}" to goal "${match.goalTitle}"`);
        return {
          ...entry,
          goalId: match.goalId,
          goalTitle: match.goalTitle
        };
      }
      return entry;
    });
  } catch (error) {
    console.error('Error processing entries with goals:', error);
    return entries;
  }
};
