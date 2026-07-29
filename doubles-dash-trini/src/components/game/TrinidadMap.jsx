import React from 'react';
import { Image } from '@/components/ui/image';
import { LOCATIONS } from '@/lib/game/catalog';
import CoinIcon from '@/components/CoinIcon';
import LocationPicker from '@/components/game/LocationPicker';

// Real lat/lng for each in-game location — used to place the pins on the photo.
const COORDS = {
  0: [10.2796, -61.4677], // San Fernando
  1: [10.5167, -61.4167], // Chaguanas
  2: [10.6559, -61.5711], // Port of Spain
  3: [10.8289, -61.4247], // Maracas Beach
  4: [10.0968, -61.4491], // Debe
  5: [10.685, -61.5051], // Queen's Park Savannah
  6: [11.167, -60.74], // Caribbean Empire Hub (Tobago)
  7: [10.2667, -61.3833], // Princes Town
};

// Bounding box used to normalize lat/lng → x/y % on the image.
const [MIN_LAT, MIN_LNG] = [10.02, -62.0];
const [MAX_LAT, MAX_LNG] = [11.36, -60.0];

// AI-generated scenery for each location — the backdrop swaps to match the
// currently selected location (high-resolution photos, not a tile server).
const LOCATION_IMAGES = {
  0: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/213bc8392_ChatGPTImageJul222026at07_26_37AM.png', // San Fernando
  2: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/4433d69fa_ChatGPTImageJul222026at07_39_54AM.png', // Port of Spain
  3: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/a75fa861c_ChatGPTImageJul222026at07_42_41AM.png', // Maracas Beach
  4: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/baf1ba7ae_ChatGPTImageJul222026at08_28_02AM.png', // Debe
  5: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/c7d5f4af7_ChatGPTImageJul222026at08_32_42AM.png', // Queen's Park Savannah
  6: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/44af1a612_ChatGPTImageJul222026at08_35_58AM.png', // Caribbean Empire Hub
  7: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/3eca7944b_55566235-dd03-4817-aa5b-e7ccaad34af8.png', // Princes Town
};
const DEFAULT_IMG = LOCATION_IMAGES[0];

function posOf(lat, lng) {
  const x = (lng - MIN_LNG) / (MAX_LNG - MIN_LNG) * 100;
  const y = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT) * 100;
  return { left: Math.max(2, Math.min(98, x)), top: Math.max(6, Math.min(94, y)) };
}

export default function TrinidadMap({ value, onChange, businessTier = 0 }) {
  const current = LOCATIONS.find((l) => l.id === value) || LOCATIONS[0];
  const backdrop = LOCATION_IMAGES[current.id] || DEFAULT_IMG;

  return (
    <div className="bg-fire-tile rounded-3xl p-3 shadow border border-white/10">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-white/10"
        style={{ aspectRatio: '4 / 3' }}
      >
        <Image
          key={backdrop}
          src={backdrop}
          fittingType="fill"
          alt={`${current.name}, Trinidad and Tobago`}
          className="absolute inset-0 w-full h-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
      </div>

      <div className="mt-3 text-center">
        <div className="font-heading text-2xl tracking-wide text-tropic-gold drop-shadow uppercase">
          {current.name}
        </div>
        <div className="text-xs text-white/70 mt-0.5">
          Base reward {current.baseReward} <CoinIcon className="w-3.5 h-3.5 inline-block align-middle" /> per order · Arrives ~{current.arriveSec}s
        </div>
      </div>

      <LocationPicker
        locations={LOCATIONS.filter((l) => l.unlockTier <= businessTier)}
        value={value}
        onChange={(id) => onChange(Number(id))}
      />
    </div>
  );
}