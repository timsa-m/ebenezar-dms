"use client"

import React from 'react'
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
  // Bar Chart Data: Balance Exposure by Risk Bucket
  const barData = [
    { name: '0-30 Days', balance: metrics.agingBuckets.performing.balance, fill: COLORS.performing },
    { name: '31-60 Days', balance: metrics.agingBuckets.earlyStage.balance, fill: COLORS.earlyStage },
    { name: '61-90 Days', balance: metrics.agingBuckets.highRisk.balance, fill: COLORS.highRisk },
    { name: '90+ Days', balance: metrics.agingBuckets.criticalDefault.balance, fill: COLORS.criticalDefault }
  ];

  // Pie Chart Data: Portfolio Mix
  const mixData = [
    { name: 'Active Financing', value: metrics.portfolioMix.active, color: COLORS.active },
    { name: 'Cash Sales', value: metrics.portfolioMix.cashSales, color: COLORS.cashSales },
    { name: 'Fully Paid', value: metrics.portfolioMix.fullyPaid, color: COLORS.fullyPaid },
    { name: 'Written Off', value: metrics.portfolioMix.writtenOff, color: COLORS.writtenOff }
  ].filter(item => item.value > 0);

  // Cash Flow Trend Data
  // Reverse the array so it goes from oldest month to newest
  const flowData = [...(metrics.cashFlow || [])].reverse();

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-semibold text-slate-800 mb-2">{label}</p>
          <p style={{ color: payload[0].payload.fill || payload[0].color }} className="text-sm font-bold">
            {payload[0].name === 'amount' ? 'Collected: ' : 'Exposure: '} 
            {formatKES(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      {/* Area Chart: Cash Flow Trend */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900">Cash Collection Trend</h3>
          <p className="text-xs text-slate-500">Total monthly revenue collected over the last 6 months</p>
        </div>
        <div className="flex-1 min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col p-6 shadow-sm">
        <div className="mb-2">
          <h3 className="text-base font-bold text-slate-900">Portfolio Distribution</h3>
          <p className="text-xs text-slate-500">All historical agreements</p>
        </div>
        <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
          {mixData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
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
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
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
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 mb-3 border-dashed"></div>
              <p className="text-sm font-medium">No accounts yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart: Arrears Exposure (Moved to bottom) */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 flex flex-col p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900">Capital Exposure by Aging Bucket</h3>
          <p className="text-xs text-slate-500">Outstanding portfolio balance distributed by delinquency status</p>
        </div>
        <div className="flex-1 min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
              <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
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
