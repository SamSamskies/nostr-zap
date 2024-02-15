import { injectCSS, init, initTargets, initTarget } from "./view";

injectCSS();
initTargets();

window.nostrZap = {init, initTarget, initTargets};
