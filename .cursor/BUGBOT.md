# Agent notes

## CDN script URL

README loads the published `dist/main.js` from jsDelivr with an SRI hash. Prefer that over jsDelivr's on-demand `main.min.js`, which is not safe to pin with `integrity`.
