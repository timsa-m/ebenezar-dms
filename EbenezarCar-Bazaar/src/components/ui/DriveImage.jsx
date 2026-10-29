import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

const FALLBACK_SRC =
  'https://placehold.co/800x600/f1f5f9/94a3b8?text=Image+Unavailable';

/**
 * A drop-in replacement for <img> that:
 *  1. Converts Google Drive sharing URLs to embeddable direct-view URLs via getImageUrl().
 *  2. Falls back to a placeholder if the image fails to load.
 *  3. Lazy-loads by default so below-fold images don't block rendering.
 *
 * Accepts all standard <img> props (alt, className, loading, fetchPriority, etc.).
 * Pass loading="eager" or fetchPriority="high" to override for above-the-fold images.
 */
const DriveImage = ({ src, alt = '', loading = 'lazy', decoding = 'async', ...props }) => {
  const [imgSrc, setImgSrc] = useState(() => getImageUrl(src));

  const handleError = () => {
    if (imgSrc !== FALLBACK_SRC) {
      setImgSrc(FALLBACK_SRC);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      {...props}
    />
  );
};

export default DriveImage;
