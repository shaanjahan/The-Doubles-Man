import { Image } from '@/components/ui/image';

const LOGO_URL = '/game/6b677e427_A36ED237-6A52-436C-A969-12B05F2D0EFD.webp';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-doubles-night flex flex-col items-center justify-center px-6">
      <div className="animate-pop-in">
        <Image
          src={LOGO_URL}
          alt="The Doubles Man"
          fittingType="fit"
          className="w-72 h-72 sm:w-80 sm:h-80"
        />
      </div>
      <p className="mt-6 text-sm font-bold tracking-wide text-white/70 animate-fade-in">
        Powered By: <span className="text-tropic-gold">@shaanjahan</span>
      </p>
    </div>
  );
}