import React from 'react';
import { Image } from '@/components/ui/image';

const BARA_IMG = '/game/2fd0b78bb_33E8AE6E-167F-424E-8143-D57BA9D6E8D2.webp';

export default function BaraChip({ className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md bg-amber-200 ring-1 ring-amber-400 overflow-hidden w-6 h-6 ${className}`}>
      <Image src={BARA_IMG} alt="Bara" className="w-full h-full object-cover" fittingType="fill" />
    </span>
  );
}