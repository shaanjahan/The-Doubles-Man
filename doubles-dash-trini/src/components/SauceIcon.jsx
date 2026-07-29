import React from 'react';
import { Image } from '@/components/ui/image';

// Renders a magic sauce. If the sauce defines an `image` it is shown (covered)
// so branded assets like Golden Tamarind replace the generic emoji everywhere.
export default function SauceIcon({ sauce, sizeClass = 'w-9 h-9', emojiClass = 'text-2xl', className = '' }) {
  if (!sauce) return null;
  if (sauce.image) {
    return (
      <div className={`rounded-xl overflow-hidden shrink-0 ${sizeClass} ${className}`}>
        <Image src={sauce.image} alt={sauce.name} fittingType="fill" className="w-full h-full" />
      </div>
    );
  }
  return (
    <div className={`shrink-0 leading-none ${emojiClass} ${className}`}>{sauce.emoji}</div>
  );
}