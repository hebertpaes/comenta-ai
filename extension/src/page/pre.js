/*
 * Roda no contexto da página (world MAIN) antes da wa-js.
 * Guarda um WPP já existente (de outra extensão) para restaurá-lo depois
 * e configura a wa-js sem Google Analytics.
 */
(() => {
  if (window.__cmtPreLoaded) return;
  window.__cmtPreLoaded = true;
  window.__cmtPrevWPP = window.WPP;
  try {
    delete window.WPP;
  } catch (e) {
    window.WPP = undefined;
  }
  const cfg = window.WPPConfig || {};
  cfg.disableGoogleAnalytics = true;
  window.WPPConfig = cfg;
})();
