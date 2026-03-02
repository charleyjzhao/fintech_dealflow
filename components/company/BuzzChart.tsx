'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { SocialSignal } from '@/types/database'

interface BuzzChartProps {
  signals: SocialSignal[]
}

interface ChartDataPoint {
  date: string
  bluesky: number
  news: number
  total: number
}

function buildChartData(signals: SocialSignal[]): ChartDataPoint[] {
  // Group signals by day
  const byDay: Record<string, Record<string, number>> = {}

  for (const signal of signals) {
    const day = signal.sampled_at.split('T')[0]
    if (!byDay[day]) byDay[day] = { bluesky: 0, news: 0 }
    byDay[day][signal.platform] = (byDay[day][signal.platform] ?? 0) + signal.mention_count
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, platforms]) => ({
      date: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bluesky: platforms.bluesky ?? 0,
      news: platforms.news ?? 0,
      total: (platforms.bluesky ?? 0) + (platforms.news ?? 0),
    }))
}

export function BuzzChart({ signals }: BuzzChartProps) {
  const data = buildChartData(signals)

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No social signal data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorBsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorNews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Area type="monotone" dataKey="bluesky" name="Bluesky" stroke="#8b5cf6" fill="url(#colorBsky)" strokeWidth={2} />
        <Area type="monotone" dataKey="news" name="Web Articles" stroke="#10b981" fill="url(#colorNews)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
