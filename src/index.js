import { injectCSS, initTargets, initTarget } from "./view";

injectCSS();
initTargets();

window.nostrZap = {initTarget, initTargets};
