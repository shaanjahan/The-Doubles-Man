import React from 'react';
import { Image } from '@/components/ui/image';

const GEM_URL =
  'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/622437699_generated_image.png';

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