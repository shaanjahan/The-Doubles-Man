// True when running inside an embedded iOS web view (the native shell's
// WKWebView) rather than a real browser. Embedded views omit the "Safari/"
// UA token that every full browser carries. Google OAuth refuses embedded
// web views (403 disallowed_useragent), so auth UIs use this — alongside the
// window.NativeIAP marker the shell injects — to hide flows that cannot
// complete in-app.
export const isEmbeddedIOSWebView =
  typeof navigator !== 'undefined' &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Safari\//.test(navigator.userAgent) &&
  !/(Chrome|CriOS|FxiOS|EdgiOS)/.test(navigator.userAgent);
