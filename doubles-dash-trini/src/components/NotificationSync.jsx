import { useEffect, useRef } from 'react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { maybeRequestPermission, syncNotifications, clearNotifications } from '@/lib/game/notifications';

// Invisible: wires the iOS local-notification bridge to app lifecycle.
// Background -> schedule comeback reminders from the freshest player state;
// foreground -> cancel everything so nothing fires mid-session. No-op outside
// the native shell (window.NativeNotify absent).
export default function NotificationSync() {
  const { player } = usePlayerState();
  const playerRef = useRef(player);
  playerRef.current = player;

  // Ask for permission once per session, a few seconds in, only for players
  // who are set up and engaged (see maybeRequestPermission).
  useEffect(() => {
    if (!player || player.needsSetup) return;
    const t = setTimeout(() => maybeRequestPermission(playerRef.current), 6000);
    return () => clearTimeout(t);
  }, [player?.userId, player?.needsSetup]);

  useEffect(() => {
    clearNotifications(); // app just opened — silence anything pending
    const onVisibility = () => {
      if (document.hidden) syncNotifications(playerRef.current);
      else clearNotifications();
    };
    const onPageHide = () => syncNotifications(playerRef.current);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  return null;
}
