import { CategoryType } from "./types";

// Matches Notion formula exactly for "性质" field
export const CATEGORY_DEFINITIONS = {
  [CategoryType.PRODUCTION]: {
    label: '生产 (Production)',
    color: '#8b5cf6', // Violet
    description: '创造价值',
    activities: [
      '沟通', '管理', '输出', '总结', '目标', '吉他', '家庭', '助人',
      '分享', '商业', '写作', '组织', '执行', '创新', '规划'
    ]
  },
  [CategoryType.INVESTMENT]: {
    label: '投资 (Investment)',
    color: '#10b981', // Emerald
    description: '让生命有更多质量',
    activities: [
      '健康', '旅行', '人脉', '交易', '运动', '冥想', '阅读', '恋爱',
      '学习', '朋友', '播客', '健身'
    ]
  },
  [CategoryType.EXPENSE]: {
    label: '支出 (Expense)',
    color: '#f59e0b', // Amber
    description: '为了维持生命需要付出的',
    activities: [
      '休息', '睡觉', '吃饭', '购物', '娱乐', '社交', '视频', '游戏',
      '通勤', '杂事', '情绪', '无意识'
    ]
  }
};

// Build activity to category mapping
export const ACTIVITY_TO_CATEGORY: Record<string, CategoryType> = {};
Object.entries(CATEGORY_DEFINITIONS).forEach(([category, def]) => {
  def.activities.forEach(activity => {
    ACTIVITY_TO_CATEGORY[activity] = category as CategoryType;
  });
});

// Helper function to get category by activity
export const getCategoryByActivity = (activity: string): CategoryType => {
  return ACTIVITY_TO_CATEGORY[activity] || CategoryType.EXPENSE;
};

export const ALL_ACTIVITIES = [
  ...CATEGORY_DEFINITIONS[CategoryType.PRODUCTION].activities,
  ...CATEGORY_DEFINITIONS[CategoryType.INVESTMENT].activities,
  ...CATEGORY_DEFINITIONS[CategoryType.EXPENSE].activities,
];