"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

export function Sparkline({ data, color = "#2563eb" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
