// Mobile-first modal-sheet location picker — replaces a native <select> so the
// dropdown reads as a clean bottom sheet on WebView/iOS rather than a system
// select that ignores the app's theme.
import React from 'react';
import { MapPin, Check, ChevronDown, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CoinIcon from '@/components/CoinIcon';
import { Image } from '@/components/ui/image';
import { LocationIcon } from '@/components/game/art/icons';
import { locationUnlockLevel } from '@/lib/game/catalog';

// Location art: scenic image thumbnail when the location has one (drawn icon
// otherwise). `size` matches the LocationIcon footprint it replaces.
function LocationArt({ location, size = 26, rounded = 'rounded-lg' }) {
  if (!location?.image) return <LocationIcon id={location.id} size={size} />;
  return (
    <Image
      src={location.image}
      alt={location.name}
      fittingType="cover"
      className={`${rounded} object-cover shrink-0`}
      style={{ width: size * 1.4, height: size }}
    />
  );
}

export default function LocationPicker({ locations, value, onChange, businessTier = 0 }) {
  const [open, setOpen] = React.useState(false);
  const unlocked = locations.filter((l) => (l.unlockTier || 0) <= businessTier);
  const current = unlocked.find((l) => l.id === value) || unlocked[0] || locations[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-1 w-full bg-black/40 rounded-xl border border-white/10 py-2 px-3 text-sm font-semibold text-foreground flex items-center justify-between gap-2 active:scale-[0.99] transition"
        >
          <span className="flex items-center gap-2 min-w-0">
            <LocationArt location={current} size={17} rounded="rounded" />
            <span className="truncate">{current.name}</span>
            <span className="text-tropic-gold font-bold flex items-center gap-0.5">({current.baseReward}<CoinIcon className="w-3.5 h-3.5 inline-block" />)</span>
          </span>
          <ChevronDown size={16} className="text-muted-foreground shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] p-0 gap-0 rounded-3xl overflow-hidden border-white/10 bg-zinc-900">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-center text-tropic-gold">Choose Location</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1.5">
          {locations.map((l) => {
            const active = l.id === value;
            const locked = (l.unlockTier || 0) > businessTier;
            return (
              <button
                key={l.id}
                disabled={locked}
                onClick={() => { if (!locked) { onChange(l.id); setOpen(false); } }}
                className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  locked
                    ? 'bg-white/5 text-zinc-500 border border-white/5 cursor-not-allowed'
                    : active
                    ? 'bg-tropic-magenta text-white'
                    : 'bg-white/10 text-zinc-100 hover:bg-white/20 border border-white/10'
                }`}
              >
                <span className={locked ? 'opacity-40 grayscale' : ''}><LocationArt location={l} size={30} /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate flex items-center gap-1">
                    <MapPin size={12} /> {l.name}
                  </div>
                  {locked ? (
                    <div className="text-xs text-zinc-500">Unlocks at Level {locationUnlockLevel(l)}</div>
                  ) : (
                    <div className={`text-xs ${active ? 'text-white/80' : 'text-muted-foreground'}`}>
                      Base {l.baseReward}{' '}
                      <CoinIcon className="w-3 h-3 inline-block align-middle" /> · ~{l.arriveSec}s
                    </div>
                  )}
                </div>
                {locked ? <Lock size={16} className="shrink-0" /> : active && <Check size={18} />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}