import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

const FALLBACK_SRC =
  'https://placehold.co/800x600/f1f5f9/94a3b8?text=Image+Unavailable';

/**
 * A drop-in <img> replacement that:
 *  1. Resolves Cloudflare R2 URLs (full URLs pass through; bare keys are
 *     prefixed with VITE_R2_PUBLIC_BASE_URL).
 *  2. Falls back to a placeholder if the image fails to load.
 *
 * Accepts all standard <img> props (alt, className, loading, fetchPriority, etc.).
 */
const CloudImage = ({ src, alt = '', ...props }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  const targetSrc = hasError ? FALLBACK_SRC : getImageUrl(src);

  return (
    <img
      src={targetSrc}
      alt={alt}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};

export default CloudImage;
