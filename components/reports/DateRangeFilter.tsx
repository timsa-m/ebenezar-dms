"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Filter } from "lucide-react";
import DatePickerInput from '@/components/ui/DatePickerInput';

interface DateRangeFilterProps {
  label?: string;
}

export default function DateRangeFilter({ label = "Filter by Date" }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clear = () => {
    setFrom("");
    setTo("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilter = !!(searchParams.get("from") || searchParams.get("to"));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-12 font-bold text-gray-500 uppercase tracking-widest">
        <Filter className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-[150px]">
          <DatePickerInput
            value={from}
            onChange={setFrom}
            placeholder="From Date"
          />
        </div>
        <span className="text-gray-400 text-12">to</span>
        <div className="relative w-[150px]">
          <DatePickerInput
            value={to}
            onChange={setTo}
            placeholder="To Date"
          />
        </div>
        <button onClick={apply} className="btn-primary h-9 px-4 text-13">
          Apply
        </button>
        {hasFilter && (
          <button onClick={clear} className="btn-ghost h-9 px-3 text-12">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
