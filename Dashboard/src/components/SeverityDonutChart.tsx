import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SeverityChartProps {
  data: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const COLORS = {
  critical: '#EA384C',
  high: '#F97316',
  medium: '#FFC107',
  low: '#3B82F6',
};

const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, payload
}: any) => {
  if (value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if percent > 0
  return (
    <text
      x={x}
      y={y}
      fill={payload.color}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontWeight={600}
      fontSize={16}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const SeverityDonutChart = ({ data }: SeverityChartProps) => {
  // Only include slices with value > 0
  const chartData = [
    { name: 'Critical', value: data.critical, color: COLORS.critical },
    { name: 'High', value: data.high, color: COLORS.high },
    { name: 'Medium', value: data.medium, color: COLORS.medium },
    { name: 'Low', value: data.low, color: COLORS.low },
  ].filter(entry => entry.value > 0);

  // If all values are zero, show a placeholder
  if (chartData.length === 0) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center">
        <span className="text-muted-foreground">No data to display</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={renderCustomLabel}
            labelLine={false}
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} events`, '']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SeverityDonutChart;
