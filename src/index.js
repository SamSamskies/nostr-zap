import { injectCSS, init, initTargets, initTarget } from "./view";

// Wait for <body> before mounting the shadow host. Scripts loaded from a CDN
// in <head> (common with unpkg/jsdelivr) otherwise crash with:
// Cannot read properties of null (reading 'appendChild')
const boot = () => {
  injectCSS();
  initTargets();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

window.nostrZap = { init, initTarget, initTargets };
