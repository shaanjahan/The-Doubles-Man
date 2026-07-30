import React from 'react';
import { Image } from '@/components/ui/image';

const GEM_URL =
  '/game/622437699_generated_image.webp';

export default function GemIcon({ className = '', fittingType = 'fit' }) {
  return (
    <Image
      src={GEM_URL}
      alt="Gems"
      className={className}
      fittingType={fittingType}
    />
  );
}