"use client"

import React, { useEffect, useState } from 'react'
import { formatAmount } from '@/lib/utils'

interface AnimatedCounterProps {
  amount: number | null | undefined;
  duration?: number;
}

export default function AnimatedCounter({ amount, duration = 1000 }: AnimatedCounterProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null;
    const target = Number(amount);
    const safeTarget = isNaN(target) ? 0 : target;

    if (safeTarget === 0) {
      const id = requestAnimationFrame(() => setCount(0));
      return () => cancelAnimationFrame(id);
    }

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // easeOutQuart
      const ease = 1 - Math.pow(1 - percentage, 4);
      
      setCount(safeTarget * ease);

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(safeTarget);
      }
    };

    requestAnimationFrame(animate);
  }, [amount, duration]);

  return <>{formatAmount(count)}</>
}
