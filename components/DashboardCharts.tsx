"use client"

import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { formatKES } from '@/src/lib/financial-engine'
import type { DmsExecutiveMetrics } from '@/lib/actions/dms.actions'

interface DashboardChartsProps {
  metrics: DmsExecutiveMetrics;
}

const COLORS = {
  performing: '#10b981', // emerald-500
  earlyStage: '#fbbf24', // amber-400
  highRisk: '#f97316', // orange-500
  criticalDefault: '#e11d48', // rose-600
  
  // Portfolio Mix
  active: '#3b82f6', // blue-500
  cashSales: '#8b5cf6', // violet-500
  fullyPaid: '#10b981', // emerald-500
  writtenOff: '#64748b' // slate-500
}

export default function DashboardCharts({ metrics }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bar Chart Data: Balance Exposure by Risk Bucket
  const barData = [
    { name: '0-30 Days', balance: metrics?.agingBuckets?.performing?.balance || 0, fill: COLORS.performing },
    { name: '31-60 Days', balance: metrics?.agingBuckets?.earlyStage?.balance || 0, fill: COLORS.earlyStage },
    { name: '61-90 Days', balance: metrics?.agingBuckets?.highRisk?.balance || 0, fill: COLORS.highRisk },
    { name: '90+ Days', balance: metrics?.agingBuckets?.criticalDefault?.balance || 0, fill: COLORS.criticalDefault }
  ];

  // Pie Chart Data: Portfolio Mix
  const mixData = [
    { name: 'Active Financing', value: metrics?.portfolioMix?.active || 0, color: COLORS.active },
    { name: 'Cash Sales', value: metrics?.portfolioMix?.cashSales || 0, color: COLORS.cashSales },
    { name: 'Fully Paid', value: metrics?.portfolioMix?.fullyPaid || 0, color: COLORS.fullyPaid },
    { name: 'Written Off', value: metrics?.portfolioMix?.writtenOff || 0, color: COLORS.writtenOff }
  ].filter(item => item.value > 0);

  // Cash Flow Trend Data: Reverse the array so it goes from oldest month to newest
  const flowData = [...(metrics?.cashFlow || [])].reverse();

  const CustomBarCursor = (props: any) => {
    const { x, y, width, height } = props;
    if (x == null || y == null || width == null || height == null || width <= 0 || height <= 0) {
      return null;
    }
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        className="fill-slate-100/70 dark:fill-white/[0.06] pointer-events-none transition-colors"
      />
    );
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && payload[0]) {
      return (
        <div className="bg-white dark:bg-[#1D2920] p-3 rounded-xl shadow-xl border border-gray-100 dark:border-[#29352D] transition-colors">
          <p className="font-semibold text-slate-800 dark:text-[#F4F7F4] mb-2">{label}</p>
          <p style={{ color: payload[0].payload?.fill || payload[0].color }} className="text-sm font-bold tabular-nums">
            {payload[0].name === 'amount' ? 'Collected: ' : 'Exposure: '} 
            {formatKES(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] flex flex-col p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F7F4]">Cash Collection Trend</h3>
            <p className="text-xs text-slate-500 dark:text-[#A1ADA4]">Total monthly revenue collected over the last 6 months</p>
          </div>
          <div className="h-[300px] w-full animate-pulse bg-slate-50/50 dark:bg-white/5 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary/40 border-t-transparent animate-spin" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] flex flex-col p-6 shadow-sm">
          <div className="mb-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F7F4]">Portfolio Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-[#A1ADA4]">All historical agreements</p>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center animate-pulse bg-slate-50/50 dark:bg-white/5 rounded-lg">
            <div className="w-8 h-8 rounded-full border-2 border-primary/40 border-t-transparent animate-spin" />
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] flex flex-col p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F7F4]">Capital Exposure by Aging Bucket</h3>
            <p className="text-xs text-slate-500 dark:text-[#A1ADA4]">Outstanding portfolio balance distributed by delinquency status</p>
          </div>
          <div className="h-[300px] w-full animate-pulse bg-slate-50/50 dark:bg-white/5 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary/40 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      {/* Area Chart: Cash Flow Trend */}
      <div className="lg:col-span-2 bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] flex flex-col p-6 shadow-sm min-w-0">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F7F4]">Cash Collection Trend</h3>
          <p className="text-xs text-slate-500 dark:text-[#A1ADA4]">Total monthly revenue collected over the last 6 months</p>
        </div>
        <div className="h-[300px] w-full min-w-0 relative">
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300} debounce={50}>
            <AreaChart data={flowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-[#29352D]" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => `KES ${value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000) + 'k' : value}`}
              />
              <RechartsTooltip content={<CustomBarTooltip />} />
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Portfolio Mix */}
      <div className="bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] flex flex-col p-6 shadow-sm min-w-0">
        <div className="mb-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F7F4]">Portfolio Distribution</h3>
          <p className="text-xs text-slate-500 dark:text-[#A1ADA4]">All historical agreements</p>
        </div>
        <div className="h-[300px] w-full min-w-0 relative flex items-center justify-center">
          {mixData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300} debounce={50}>
              <PieChart>
                <Pie
                  data={mixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {mixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any, name: any) => [`${value} Deals`, name]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-primary, #29352D)', backgroundColor: 'var(--bg-elevated, #1D2920)', color: 'var(--text-primary, #F4F7F4)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={40} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 500 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-[#29352D] mb-3 border-dashed"></div>
              <p className="text-sm font-medium">No accounts yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart: Arrears Exposure */}
      <div className="lg:col-span-3 bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] flex flex-col p-6 shadow-sm min-w-0">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F7F4]">Capital Exposure by Aging Bucket</h3>
          <p className="text-xs text-slate-500 dark:text-[#A1ADA4]">Outstanding portfolio balance distributed by delinquency status</p>
        </div>
        <div className="h-[300px] w-full min-w-0 relative">
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300} debounce={50}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-[#29352D]" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => `KES ${value >= 1000 ? (value / 1000) + 'k' : value}`}
              />
              <RechartsTooltip content={<CustomBarTooltip />} cursor={<CustomBarCursor />} />
              <Bar 
                dataKey="balance" 
                radius={[6, 6, 0, 0]} 
                barSize={60}
              >
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
