"use client";

import { eventArtwork } from "@/lib/event-artwork";

export default function EventPhoto({ posterUrl, category, className, alt = "" }: {
  posterUrl?: string | null;
  category?: string;
  className: string;
  alt?: string;
}) {
  const fallback = eventArtwork(null, category);
  return (
    <img src={eventArtwork(posterUrl, category)} alt={alt} loading="lazy" decoding="async"
      className={className}
      onError={({ currentTarget }) => {
        if (!currentTarget.src.endsWith(fallback)) currentTarget.src = fallback;
      }}
    />
  );
}
