import React from 'react';
import { Image } from '@/components/ui/image';
import { isAvatarUrl } from '@/lib/game/characters';

// Renders the player vendor wherever their avatar appears. Supports both the
// new character-art URLs and legacy emoji strings for older player records.
export default function PlayerAvatar({ avatarEmoji, sizeClass = 'w-10 h-10', emojiClass = 'text-2xl', className = '' }) {
  if (isAvatarUrl(avatarEmoji)) {
    return (
      <div className={`rounded-2xl overflow-hidden ring-2 ring-amber-300 shrink-0 bg-amber-100 ${sizeClass} ${className}`}>
        <Image src={avatarEmoji} alt="Vendor" fittingType="fill" className="w-full h-full" />
      </div>
    );
  }
  return (
    <div className={`rounded-2xl bg-amber-200/70 ring-2 ring-amber-300 flex items-center justify-center shrink-0 ${sizeClass} ${emojiClass} ${className}`}>
      {avatarEmoji || '🧑‍🍳'}
    </div>
  );
}