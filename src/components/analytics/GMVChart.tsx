'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

interface ViewsDataPoint {
  date: string
  views: number
  likes: number
  comments: number
  shares: number
}

interface GMVChartProps {
  data: ViewsDataPoint[]
  metric?: 'views' | 'likes' | 'shares' | 'comments'
  chartType?: 'line' | 'area'
}

const metricConfig = {
  views: {
    label: '再生数',
    color: '#8b5cf6',
    formatter: (value: number) => `${value.toLocaleString()}回`,
  },
  likes: {
    label: 'いいね',
    color: '#ec4899',
    formatter: (value: number) => `${value.toLocaleString()}`,
  },
  comments: {
    label: 'コメント',
    color: '#3b82f6',
    formatter: (value: number) => `${value.toLocaleString()}`,
  },
  shares: {
    label: 'シェア',
    color: '#10b981',
    formatter: (value: number) => `${value.toLocaleString()}`,
  },
}

export function GMVChart({
  data,
  metric = 'views',
  chartType = 'area',
}: GMVChartProps) {
  const config = metricConfig[metric]

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toLocaleString()
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value) => [config.formatter(value as number), config.label]}
          />
          <Legend />
          <defs>
            <linearGradient id={`color-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={metric}
            name={config.label}
            stroke={config.color}
            fill={`url(#color-${metric})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
        />
        <YAxis
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          tickFormatter={(value) =>
            value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toLocaleString()
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: 8,
          }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(value) => [config.formatter(value as number), config.label]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey={metric}
          name={config.label}
          stroke={config.color}
          strokeWidth={2}
          dot={{ fill: config.color, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// 複数指標を同時表示するチャート
export function MultiMetricChart({ data }: { data: ViewsDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
        />
        <YAxis
          yAxisId="left"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          tickFormatter={(value) =>
            value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toLocaleString()
          }
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: 8,
          }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="views"
          name="再生数"
          stroke="#8b5cf6"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="likes"
          name="いいね"
          stroke="#ec4899"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="shares"
          name="シェア"
          stroke="#10b981"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
