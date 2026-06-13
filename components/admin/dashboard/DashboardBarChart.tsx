"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface ChartDataItem {
  label: string;
  value: number;
}

interface DashboardBarChartProps {
  data: ChartDataItem[];
  colorTheme?: "emerald" | "amber";
}

const themeColors = {
  emerald: "#059669", // emerald-600
  amber: "#d97706",   // amber-600
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-2.5 shadow-md text-left">
        <p className="text-xs font-semibold text-neutral-800 max-w-[200px] break-words">
          {payload[0].payload.label}
        </p>
        <p className="text-[11px] text-neutral-500 mt-1">
          Searches: <span className="font-semibold text-neutral-800">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardBarChart({ data, colorTheme = "emerald" }: DashboardBarChartProps) {
  // Sort data so the highest values are at the top of the horizontal bar chart
  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 5);

  const barColor = themeColors[colorTheme];

  const truncateLabel = (value: string) => {
    if (value.length > 15) {
      return value.slice(0, 13) + "...";
    }
    return value;
  };

  if (!sortedData || sortedData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-center">
        <p className="text-xs text-neutral-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={110}
            tickFormatter={truncateLabel}
            tick={{ fontSize: 11, fill: "#525252", fontFamily: "monospace" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(0, 0, 0, 0.02)", radius: 4 }}
            content={<CustomTooltip />}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Bar
            dataKey="value"
            fill={barColor}
            radius={[0, 4, 4, 0]}
            barSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
