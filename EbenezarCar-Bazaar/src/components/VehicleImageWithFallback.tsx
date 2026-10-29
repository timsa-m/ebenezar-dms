import React, { useState } from 'react';
import { Car, Wrench, ShieldCheck } from 'lucide-react';

interface VehicleImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  make?: string;
  model?: string;
  bodyType?: string;
}

export const VehicleImageWithFallback: React.FC<VehicleImageWithFallbackProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  make = '',
  model = '',
  bodyType = 'Vehicle',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError || !src) {
    return (
      <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-slate-850 via-slate-800 to-slate-900 text-slate-100 p-6 relative overflow-hidden select-none">
        {/* Subtle background geometric pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-inner">
          {bodyType === 'Tractor' ? (
            <Wrench className="w-8 h-8 text-emerald-400" />
          ) : (
            <Car className="w-8 h-8 text-emerald-400" />
          )}
        </div>
        <p className="text-sm font-semibold tracking-wide uppercase text-white/90 text-center">
          {make} {model}
        </p>
        <span className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Showroom Stock
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <Car className="w-8 h-8 text-slate-400 animate-bounce" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};
