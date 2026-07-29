import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';

// Lightweight pub-sub so the persistent tab shell can trigger a per-page
// refresh when the user pulls to refresh. Pages register their reload
// function under their own route key; the shell calls trigger(path).
const RefreshCtx = createContext(null);

export function RefreshProvider({ children }) {
  const handlers = useRef({});

  const register = useCallback((key, fn) => {
    handlers.current[key] = fn;
    return () => { if (handlers.current[key] === fn) delete handlers.current[key]; };
  }, []);

  const trigger = useCallback((key) => handlers.current[key]?.(), []);

  return <RefreshCtx.Provider value={{ register, trigger }}>{children}</RefreshCtx.Provider>;
}

export function useRefreshCtx() {
  return useContext(RefreshCtx) || { register: () => () => {}, trigger: () => undefined };
}

export function useRefreshHandler(key, handler) {
  const { register } = useRefreshCtx();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const wrapper = (...args) => ref.current?.(...args);
    return register(key, wrapper);
  }, [key, register]);
}