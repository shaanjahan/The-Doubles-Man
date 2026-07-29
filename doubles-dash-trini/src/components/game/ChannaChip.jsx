import React from 'react';
import { Image } from '@/components/ui/image';

const CHANNA_IMG = 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/d2ad2ce82_D24158B8-5444-462D-AAF4-8D28CD0594FA.png';

export default function ChannaChip({ className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md bg-yellow-200 ring-1 ring-yellow-500 overflow-hidden w-6 h-6 ${className}`}>
      <Image src={CHANNA_IMG} alt="Channa" className="w-full h-full object-cover" fittingType="fill" />
    </span>
  );
}