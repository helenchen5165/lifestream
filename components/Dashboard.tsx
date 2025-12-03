import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CATEGORY_DEFINITIONS } from '../constants';
import { CategoryType, TimeEntry } from '../types';

interface DashboardProps {
  entries: TimeEntry[];
}

export const Dashboard: React.FC<DashboardProps> = ({ entries }) => {
  const stats = useMemo(() => {
    const totalMinutes = entries.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const byCategory: Record<CategoryType, number> = {
      [CategoryType.INVESTMENT]: 0,
      [CategoryType.PRODUCTION]: 0,
      [CategoryType.EXPENSE]: 0,
    };
    const byActivity: Record<string, number> = {};

    entries.forEach(entry => {
      if (byCategory[entry.category] !== undefined) {
        byCategory[entry.category] += entry.durationMinutes;
      }
      byActivity[entry.activity] = (byActivity[entry.activity] || 0) + entry.durationMinutes;
    });

    return { totalMinutes, byCategory, byActivity };
  }, [entries]);

  const pieData = Object.entries(stats.byCategory).map(([key, value]) => ({
    name: CATEGORY_DEFINITIONS[key as CategoryType].label,
    value: value as number,
    color: CATEGORY_DEFINITIONS[key as CategoryType].color,
    rawKey: key
  })).filter(d => d.value > 0);

  const barData = Object.entries(stats.byActivity)
    .map(([name, value]) => ({ name, minutes: value as number }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10); // Top 10 activities

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400 border border-slate-100 mb-6">
        <p className="text-lg">暂无数据。开始记录你的时间吧！</p>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">时间分布 (Category)</h3>
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: number) => formatDuration(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="text-sm text-slate-400 font-medium">总计</span>
            <p className="text-xl font-bold text-slate-800">{formatDuration(stats.totalMinutes)}</p>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
              <span className="text-slate-600">{d.name.split(' ')[0]}</span>
              <span className="font-semibold text-slate-800">{Math.round((d.value / stats.totalMinutes) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Activities */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">热门活动 (Top Activities)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80} 
                tick={{fill: '#475569', fontSize: 12}}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip 
                cursor={{fill: '#f1f5f9'}}
                formatter={(value: number) => [formatDuration(value), '时长']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="minutes" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};