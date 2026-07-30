// Looping theme music for The Doubles Man — a single <audio> element shared
// app-wide via context. Browsers block autoplay, so music starts on the first
// user gesture and remembers the mute choice for that session.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const THEME_TRACK =
  '/game/3e77bec34_Calypso_Raga_2026-07-22T011610.mp3';

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);

  // Create the audio element once.
  useEffect(() => {
    const a = new Audio(THEME_TRACK);
    a.loop = true;
    a.volume = 0.5;
    a.preload = 'auto';
    audioRef.current = a;
    return () => { a.pause(); audioRef.current = null; };
  }, []);

  // Start music on the first user gesture (pointerdown / keydown), then stop
  // listening so we don't repeatedly resume.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let started = false;
    function start() {
      if (started || !audioRef.current || muted) return;
      started = true;
      audioRef.current.play().catch(() => {});
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    }
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [muted]);

  // Apply mute / volume changes.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = muted;
  }, [muted]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      const a = audioRef.current;
      if (a && !next && a.paused) a.play().catch(() => {});
      return next;
    });
  }

  return (
    <MusicContext.Provider value={{ muted, toggleMute }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}