"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { price: number; scrapedAt: string };

export default function PriceHistoryChart({ history }: { history: Point[] }) {
  if (history.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted font-mono">
        недостатньо даних для графіка
      </div>
    );
  }

  const data = history.map((h) => ({
    date: new Date(h.scrapedAt).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }),
    price: h.price,
  }));

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={["dataMin - 20", "dataMax + 20"]} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--paper)",
            }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(value) => [`${value} ₴`, "ціна"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
