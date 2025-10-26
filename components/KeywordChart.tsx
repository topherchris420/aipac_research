import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { KeywordData } from '../utils/textUtils';

interface KeywordChartProps {
  data: KeywordData[];
  theme: 'light' | 'dark';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg">
        <p className="font-semibold text-black dark:text-slate-200">{label}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">{`Frequency: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};


const KeywordChart: React.FC<KeywordChartProps> = ({ data, theme }) => {
  if (!data || data.length === 0) {
    return null;
  }
  
  const tickColor = theme === 'dark' ? 'rgba(241, 245, 249, 0.8)' : 'rgba(15, 23, 42, 0.8)';

  return (
    <div className="h-80 p-4 bg-black/10 dark:bg-white/5 rounded-xl shadow-lg backdrop-blur-sm border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5, }}
          layout="vertical"
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
          <XAxis type="number" stroke={tickColor} allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={100} stroke={tickColor} tick={{ fontSize: 12 }} interval={0} />
          <Tooltip
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KeywordChart;