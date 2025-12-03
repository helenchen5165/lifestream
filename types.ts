export enum CategoryType {
  INVESTMENT = 'INVESTMENT', // 投资类型：让生命有更多质量
  PRODUCTION = 'PRODUCTION', // 生产类型：创造价值
  EXPENSE = 'EXPENSE',       // 支出类型：为了维持生命
}

export interface TimeEntry {
  id: string;
  task: string; // Notion: Task field (title)
  activity: string; // Notion: 支出项 field (select)
  category: CategoryType; // Notion: 性质 (formula)
  durationMinutes: number; // Notion: Duration (Minutes)
  startTime: string; // Notion: Start Time (ISO datetime)
  endTime: string; // Notion: End Time (ISO datetime)
  timestamp: number; // Unix timestamp for sorting
  dateStr: string; // YYYY-MM-DD format
  keywords?: string[]; // Keywords for goal matching
  goalId?: string; // Notion: Goal (relation)
  goalTitle?: string; // For display
  notionPageId?: string; // ID of the created Notion page
}

export interface ReportData {
  totalMinutes: number;
  byCategory: Record<CategoryType, number>;
  byActivity: Record<string, number>;
  aiAnalysis: string;
}

export enum Period {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER'
}

export interface Goal {
  id: string; // Notion page ID
  title: string;
  deadline?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status: 'Planned' | 'In Progress' | 'Completed';
  estimatedTime?: number;
  progress?: number;
  durationType?: 'Week' | 'Month' | 'Quarter';
}

export interface NotionConfig {
  apiKey: string;
  recordsDatabaseId: string; // Records database ID
  goalsDatabaseId: string; // Goals database ID
  proxyUrl?: string; // Optional CORS proxy URL
}
