'use client';

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ClientAvatarProps {
  firstName: string;
  lastName: string;
  /** Legacy: a direct public URL (old data). If provided, used immediately. */
  photoUrl?: string | null;
  /** Preferred: the private storage path. Component fetches a signed URL on mount. */
  photoPath?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function ClientAvatar({
  firstName,
  lastName,
  photoUrl,
  photoPath,
  size = "md",
  className,
}: ClientAvatarProps) {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(photoUrl ?? null);

  useEffect(() => {
    // If we already have a direct URL (legacy), use it immediately
    if (photoUrl) {
      const timer = setTimeout(() => setResolvedUrl(photoUrl), 0);
      return () => clearTimeout(timer);
    }

    // If we have a storage path, fetch a short-lived signed URL
    if (!photoPath) return;

    let cancelled = false;
    fetch(
      `/api/storage/signed-url?bucket=client-assets&path=${encodeURIComponent(photoPath)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.signedUrl) {
          setResolvedUrl(data.signedUrl);
        }
      })
      .catch(() => {/* silent — initials fallback */});

    return () => { cancelled = true; };
  }, [photoUrl, photoPath]);

  const sizeClasses = {
    sm: "size-8 text-10",
    md: "size-10 text-12",
    lg: "size-16 text-20",
    xl: "size-24 text-24",
  };

  return (
    <div
      className={cn(
        "relative flex-shrink-0 rounded-full flex items-center justify-center font-bold overflow-hidden border border-gray-100 bg-gray-50 text-gray-700",
        sizeClasses[size],
        className
      )}
    >
      {resolvedUrl ? (
        <Image
          src={resolvedUrl}
          alt={`${firstName} ${lastName}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized // signed URLs change on every mount — skip Next.js image cache
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
