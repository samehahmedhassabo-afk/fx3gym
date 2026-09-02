"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  PieChart,
  Pie,
  Bar,
  Line,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#2563eb", "#dc2626", "#7c3aed", "#059669", "#d97706", "#db2777", "#0891b2", "#65a30d", "#e11d48", "#475569"];
const AXIS_STYLE = { tick: { fontSize: 12, fill: "#64748b" }, tickLine: false, axisLine: false };
const TOOLTIP_STYLE = { contentStyle: { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 } };

export function RevenueTrendChart({ data }: { data: { label: string; revenue: number; expense: number; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} width={48} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar name="الإيرادات" dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar name="المصروفات" dataKey="expense" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line name="الصافي" type="monotone" dataKey="net" stroke="#059669" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({
  data,
  dataKey = "count",
  name,
  color = "#2563eb",
  height = 260,
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  name?: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} width={40} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar name={name} dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
  dataKey = "amount",
  name,
  height = 260,
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  name?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} width={48} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar name={name} dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, dataKey = "count", height = 260 }: { data: Record<string, unknown>[]; dataKey?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={dataKey} nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
