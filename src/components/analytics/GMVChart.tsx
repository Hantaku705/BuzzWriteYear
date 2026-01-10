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

interface GMVDataPoint {
  date: string
  gmv: number
  orders: number
  views: number
  clicks: number
}

interface GMVChartProps {
  data: GMVDataPoint[]
  metric?: 'gmv' | 'orders' | 'views' | 'clicks'
  chartType?: 'line' | 'area'
}

const metricConfig = {
  gmv: {
    label: 'GMV (売上貢献額)',
    color: '#10b981',
    formatter: (value: number) => `¥${value.toLocaleString()}`,
  },
  orders: {
    label: '注文数',
    color: '#3b82f6',
    formatter: (value: number) => `${value}件`,
  },
  views: {
    label: '視聴回数',
    color: '#8b5cf6',
    formatter: (value: number) => `${value.toLocaleString()}回`,
  },
  clicks: {
    label: '商品クリック',
    color: '#f59e0b',
    formatter: (value: number) => `${value.toLocaleString()}回`,
  },
}

export function GMVChart({
  data,
  metric = 'gmv',
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
              metric === 'gmv' ? `¥${(value / 1000).toFixed(0)}k` : value.toLocaleString()
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
            metric === 'gmv' ? `¥${(value / 1000).toFixed(0)}k` : value.toLocaleString()
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
export function MultiMetricChart({ data }: { data: GMVDataPoint[] }) {
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
          tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
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
          dataKey="gmv"
          name="GMV"
          stroke="#10b981"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="orders"
          name="注文数"
          stroke="#3b82f6"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="clicks"
          name="クリック"
          stroke="#f59e0b"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
