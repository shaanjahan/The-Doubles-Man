import React from 'react';
import { Image } from '@/components/ui/image';
import { isAvatarUrl } from '@/lib/game/characters';
import { IconChefHat } from '@/components/game/art/icons';

// Renders the player vendor wherever their avatar appears. Character-art URLs
// render as-is; anything else (including legacy emoji records) falls back to
// the drawn chef-hat badge so no platform emoji ever appears.
export default function PlayerAvatar({ avatarEmoji, sizeClass = 'w-10 h-10', emojiClass = 'text-2xl', className = '' }) {
  if (isAvatarUrl(avatarEmoji)) {
    return (
      <div className={`rounded-2xl overflow-hidden ring-2 ring-amber-300 shrink-0 bg-amber-100 ${sizeClass} ${className}`}>
        <Image src={avatarEmoji} alt="Vendor" fittingType="fill" className="w-full h-full" />
      </div>
    );
  }
  return (
    <div className={`rounded-2xl bg-amber-200/70 ring-2 ring-amber-300 flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
      <IconChefHat size="72%" />
    </div>
  );
}