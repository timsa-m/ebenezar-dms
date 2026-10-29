'use client';

import React, { useState } from 'react';
import {
  Car,
  Armchair,
  Cog,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ConditionInspectionFormItem,
  ConditionRating,
  InspectionCategory,
  VehicleConditionInspection,
  HandoverType,
} from '@/src/types/handover.types';
import {
  INSPECTION_ITEMS,
  CONDITION_RATING_LABELS,
} from '@/src/types/handover.types';

interface ConditionInspectionFormProps {
  handoverType: HandoverType;
  items: ConditionInspectionFormItem[];
  onChange: (items: ConditionInspectionFormItem[]) => void;
  overallCondition: string;
  onOverallConditionChange: (val: string) => void;
  outstandingIssues: string;
  onOutstandingIssuesChange: (val: string) => void;
  incomingBaseline?: VehicleConditionInspection[];
  readOnly?: boolean;
}

const CATEGORY_CONFIG: Record<
  InspectionCategory,
  { label: string; icon: React.ElementType; description: string }
> = {
  exterior: {
    label: 'Exterior & Bodywork',
    icon: Car,
    description: 'Panels, paintwork, glass, lighting, bumpers, and structural integrity',
  },
  interior: {
    label: 'Interior & Cabin',
    icon: Armchair,
    description: 'Seats, dashboard, instrumentation, climate control, controls, and cleanliness',
  },
  mechanical: {
    label: 'Mechanical & Operational',
    icon: Cog,
    description: 'Engine, transmission, brakes, suspension, tyres, electrical, and warning lights',
  },
  other: {
    label: 'Additional Observations',
    icon: FileSpreadsheet,
    description: 'Existing damage, accident marks, missing components, and overall remarks',
  },
};

const RATING_BUTTONS: { rating: ConditionRating; label: string; colorClass: string; activeClass: string }[] = [
  {
    rating: 'good',
    label: 'Good',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
  },
  {
    rating: 'fair',
    label: 'Fair',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs',
  },
  {
    rating: 'poor',
    label: 'Poor',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs',
  },
  {
    rating: 'defective',
    label: 'Defective',
    colorClass: 'text-red-700 bg-red-50 border-red-200',
    activeClass: 'bg-red-600 text-white border-red-600 shadow-xs',
  },
  {
    rating: 'not_inspected',
    label: 'Not Inspected',
    colorClass: 'text-slate-600 bg-slate-50 border-slate-200',
    activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs',
  },
];

export default function ConditionInspectionForm({
  handoverType,
  items,
  onChange,
  overallCondition,
  onOverallConditionChange,
  outstandingIssues,
  onOutstandingIssuesChange,
  incomingBaseline = [],
  readOnly = false,
}: ConditionInspectionFormProps) {
  // Collapsed section tracker (at most one category collapsed at a time; all open by default)
  const [collapsedCategory, setCollapsedCategory] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setCollapsedCategory(prev => (prev === cat ? null : cat));
  };

  const updateItem = (key: string, updates: Partial<ConditionInspectionFormItem>) => {
    if (readOnly) return;
    const next = items.map(item =>
      item.item_key === key ? { ...item, ...updates } : item
    );
    onChange(next);
  };

  const setCategoryAllGood = (category: InspectionCategory) => {
    if (readOnly || category === 'other') return;
    const next = items.map(item =>
      item.category === category && item.rating === 'not_inspected'
        ? { ...item, rating: 'good' as ConditionRating }
        : item
    );
    onChange(next);
  };

  const categories: InspectionCategory[] = ['exterior', 'interior', 'mechanical', 'other'];

  // Summary counts (excluding 'other' which only collects notes)
  const ratableItems = items.filter(i => i.category !== 'other');
  const ratedCount = ratableItems.filter(i => i.rating !== 'not_inspected').length;
  const defectiveCount = ratableItems.filter(i => i.rating === 'defective').length;
  const poorCount = ratableItems.filter(i => i.rating === 'poor').length;

  return (
    <div className="space-y-6">
      {/* Inspection Header & Progress Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Vehicle Condition Inspection & Assessment
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {handoverType === 'incoming'
              ? 'Document baseline physical and mechanical condition. Mark unverified items as Not Inspected.'
              : 'Assess final release condition and compare against baseline acquisition records.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-slate-700">
            {ratedCount} of {ratableItems.length} Assessed
          </span>
          {defectiveCount > 0 && (
            <span className="text-xs badge badge-primary font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
              <AlertTriangle className="size-3" />
              {defectiveCount} Defective
            </span>
          )}
          {poorCount > 0 && (
            <span className="text-xs badge badge-primary font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              {poorCount} Poor
            </span>
          )}
        </div>
      </div>
      <br />

      {/* Categories */}
      {categories.map(category => {
        const cfg = CATEGORY_CONFIG[category];
        const Icon = cfg.icon;
        const categoryItems = items.filter(i => i.category === category);
        const isCollapsed = collapsedCategory === category;

        return (
          <div key={category} className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
            {/* Category Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2.5 text-left font-semibold text-slate-900 text-sm hover:text-blue-600 transition cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
                  <Icon className="size-4" />
                </div>
                <span>{cfg.label}</span>
                <span className="text-xs font-normal text-slate-500">
                  {category === 'other'
                    ? `(${categoryItems.filter(i => (i.notes || '').trim().length > 0).length}/${categoryItems.length} noted)`
                    : `(${categoryItems.filter(i => i.rating !== 'not_inspected').length}/${categoryItems.length})`}
                </span>
              </button>

              {!readOnly && !isCollapsed && category !== 'other' && (
                <button
                  type="button"
                  onClick={() => setCategoryAllGood(category)}
                  className="text-[11px] badge badge-primary font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1"
                  title="Set all uninspected items in this category to Good"
                >
                  <span>Set uninspected to Good</span>
                </button>
              )}
            </div>

            {/* Category Body */}
            {!isCollapsed && (
              <div className="p-4 divide-y divide-slate-100">
                {categoryItems.map(item => {
                  const baseline = incomingBaseline.find(b => b.item_key === item.item_key);
                  const isDeteriorated =
                    handoverType === 'outgoing' &&
                    baseline &&
                    baseline.rating === 'good' &&
                    (item.rating === 'poor' || item.rating === 'defective');

                  return (
                    <div
                      key={item.item_key}
                      className={cn(
                        'py-3.5 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3',
                        isDeteriorated && 'bg-amber-50/40 p-2.5 rounded-lg border border-amber-200'
                      )}
                    >
                      {/* Item Label & Baseline Status (Beginning of item being inspected) */}
                      <div className="min-w-[220px] flex-1 ml-3 p-3">
                        <span className="text-sm font-medium text-slate-900 block">
                          {item.item_label}
                        </span>
                        {category === 'other' && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {item.item_key === 'missing_components'
                              ? 'Missing tools, spare wheel, manuals, or parts'
                              : item.item_key === 'existing_damage'
                              ? 'Scratches, dents, cracks, or structural defects'
                              : 'General vehicle observations & remarks'}
                          </span>
                        )}
                        {handoverType === 'outgoing' && (
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            {category !== 'other' && (
                              <>
                                <span className="text-slate-400">Baseline rating:</span>
                                {baseline ? (
                                  <span
                                    className={cn(
                                      'font-medium badge badge-primary capitalize',
                                      baseline.rating === 'good'
                                        ? 'text-emerald-700'
                                        : baseline.rating === 'defective'
                                          ? 'text-red-700'
                                          : 'text-slate-600'
                                    )}
                                  >
                                    {CONDITION_RATING_LABELS[baseline.rating] || baseline.rating}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Not recorded</span>
                                )}
                              </>
                            )}
                            {baseline?.notes && (
                              <div className="text-[11px] text-slate-600 w-full mt-0.5">
                                <span className="text-slate-400 font-medium">Acquisition note: </span>
                                <span className="italic">{baseline.notes}</span>
                              </div>
                            )}
                            {isDeteriorated && (
                              <span className="text-amber-700 font-semibold flex items-center gap-0.5 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                                <AlertTriangle className="size-3" />
                                Deteriorated since acquisition
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {category === 'other' ? (
                        /* Additional Observations: Only has notes field, no Good/Fair/Poor rating buttons */
                        <div className="flex-1 w-full lg:max-w-xl">
                          {!readOnly ? (
                            <textarea
                              rows={2}
                              value={item.notes || ''}
                              onChange={e => updateItem(item.item_key, { notes: e.target.value })}
                              placeholder={
                                item.item_key === 'missing_components'
                                  ? 'Detail any missing components (e.g. missing wheel caps, missing spare key)...'
                                  : item.item_key === 'existing_damage'
                                  ? 'Describe any pre-existing cosmetic or mechanical damage...'
                                  : 'Enter any additional observations or handover remarks...'
                              }
                              className="input-class text-xs w-full p-2.5 bg-slate-50/70 border-slate-200 focus:bg-white resize-y min-h-[50px]"
                            />
                          ) : (
                            <p className="text-xs text-slate-700 italic">
                              {item.notes || 'None recorded'}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Regular categories: Exterior, Interior, Mechanical */
                        <>
                          {/* Rating Selector */}
                          {!readOnly ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {RATING_BUTTONS.map(btn => {
                                const isSelected = item.rating === btn.rating;
                                return (
                                  <button
                                    key={btn.rating}
                                    type="button"
                                    onClick={() => updateItem(item.item_key, { rating: btn.rating })}
                                    className={cn(
                                      'text-xs px-2.5 py-1 badge badge-primary rounded-md border font-medium transition cursor-pointer',
                                      isSelected
                                        ? btn.activeClass
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    )}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span
                              className={cn(
                                'text-xs px-2.5 py-1 rounded-md border font-medium capitalize',
                                RATING_BUTTONS.find(b => b.rating === item.rating)?.colorClass ||
                                'bg-slate-100 text-slate-600 border-slate-200'
                              )}
                            >
                              {CONDITION_RATING_LABELS[item.rating] || item.rating}
                            </span>
                          )}

                          {/* Notes Input */}
                          {!readOnly ? (
                            <div className="w-full lg:w-64">
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={e => updateItem(item.item_key, { notes: e.target.value })}
                                placeholder="Observations / notes..."
                                className="input-class h-8 text-xs w-full bg-slate-50/60"
                              />
                            </div>
                          ) : (
                            item.notes && (
                              <span className="text-xs text-slate-500 italic max-w-xs truncate">
                                {item.notes}
                              </span>
                            )
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <br />
      {/* Overall Condition & Outstanding Repairs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="rounded-xl p-4  space-y-2">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
            Overall Condition Assessment Summary
          </label>
          <textarea
            disabled={readOnly}
            rows={3}
            value={overallCondition}
            onChange={e => onOverallConditionChange(e.target.value)}
            placeholder="Summarize the vehicle's overall cosmetic, mechanical, and operational state..."
            className="input-class text-xs w-full p-2.5"
          />
        </div>

        <div className="rounded-xl p-4  space-y-2">
          <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
            Outstanding Issues / Repairs Requiring Attention
          </label>
          <textarea
            disabled={readOnly}
            rows={3}
            value={outstandingIssues}
            onChange={e => onOutstandingIssuesChange(e.target.value)}
            placeholder="List any pending mechanical repairs, cosmetic fixes, or defects disclosed to management/buyer..."
            className="input-class text-xs w-full p-2.5 border-amber-200 focus:border-amber-400 bg-amber-50/20"
          />
        </div>
      </div>
    </div>
  );
}
