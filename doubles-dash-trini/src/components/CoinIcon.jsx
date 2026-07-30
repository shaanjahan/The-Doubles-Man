import { Image } from '@/components/ui/image';

// The blue Trinidad & Tobago $100 banknote — used everywhere the game's
// coin / dollar currency should appear (balances, costs, rewards, daily gifts).
const DOLLAR_IMG = '/game/e06f8f599_86517997-9684-4616-A23B-4A531A223BB7.webp';

export default function CoinIcon({ className = 'w-4 h-4', fittingType = 'fit' }) {
  return <Image src={DOLLAR_IMG} alt="dollars" className={className} fittingType={fittingType} />;
}