"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendDataPoint {
  date: string;
  severity: number;
  notes: string | null;
}

const severityLabels: Record<number, string> = {
  1: "Minimal",
  2: "Mild",
  3: "Moderate",
  4: "Severe",
  5: "Very Severe",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

interface TooltipPayloadItem {
  value: number;
  payload: TrendDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0];
  const severity = point.value;
  const label = severityLabels[severity] ?? String(severity);
  const notes = point.payload.notes;
  const date = formatDate(point.payload.date);

  return (
    <div className="bg-background border border-border rounded-md p-3 shadow-sm text-sm">
      <p className="font-medium">{date}</p>
      <p className="text-muted-foreground">
        Severity: {severity} — {label}
      </p>
      {notes && (
        <p className="text-foreground mt-1 max-w-[200px] break-words">
          {notes}
        </p>
      )}
    </div>
  );
}

export function SymptomTrendChart() {
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/patient/journal/trends");
        if (res.ok) {
          const data: TrendDataPoint[] = await res.json();
          setTrendData(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Symptom Trends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="w-full h-full animate-pulse bg-muted rounded-md" />
          </div>
        ) : trendData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center px-4">
              Log symptoms in your journal to see trends over time
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={trendData}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tickFormatter={(v: number) => severityLabels[v] ?? String(v)}
                tick={{ fontSize: 11 }}
                width={72}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="severity"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <p className="text-xs text-muted-foreground border-t pt-3">
          This chart shows self-reported symptom data for informational purposes
          only. It is not a medical diagnosis.
        </p>
      </CardContent>
    </Card>
  );
}
