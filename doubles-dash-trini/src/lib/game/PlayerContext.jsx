import React, { createContext, useContext } from 'react';
import { usePlayer } from './usePlayer';

const Ctx = createContext(null);

export function PlayerProvider({ children }) {
  const value = usePlayer();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayerState() {
  return useContext(Ctx);
}