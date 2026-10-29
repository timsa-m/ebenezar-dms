'use client'

import React from 'react';

export const SecurityWatermark: React.FC<{ opacity?: number }> = ({ opacity = 0.4 }) => {
  return (
    <div 
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Top right decorative security waves (Guilloche pattern) */}
      <svg
        className="absolute top-0 right-0 w-[500px] h-[340px] transform translate-x-12 -translate-y-8"
        viewBox="0 0 500 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="#f472b6" strokeWidth="0.8" strokeOpacity="0.45">
          {Array.from({ length: 24 }).map((_, i) => (
            <path
              key={`top-wave-${i}`}
              d={`M0 ${20 + i * 11} C 120 ${-10 + i * 9}, 240 ${80 + i * 12}, 500 ${10 + i * 13}`}
            />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`top-counter-${i}`}
              d={`M0 ${60 + i * 14} C 180 ${130 + i * 10}, 320 ${-20 + i * 12}, 500 ${80 + i * 11}`}
              stroke="#fb7185"
              strokeWidth="0.6"
              strokeOpacity="0.35"
            />
          ))}
        </g>
      </svg>

      {/* Bottom right subtle waves */}
      <svg
        className="absolute bottom-0 right-0 w-[420px] h-[280px] transform translate-x-16 translate-y-8"
        viewBox="0 0 420 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="#f472b6" strokeWidth="0.7" strokeOpacity="0.35">
          {Array.from({ length: 16 }).map((_, i) => (
            <path
              key={`bot-wave-${i}`}
              d={`M0 ${10 + i * 15} C 100 ${70 + i * 12}, 220 ${-10 + i * 10}, 420 ${50 + i * 14}`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};
