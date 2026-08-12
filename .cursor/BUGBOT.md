# Agent notes

## CDN script URL

README loads `dist/main.min.js` from jsDelivr. The Parcel build emits `dist/main.js` (`package.json` `"main"`). jsDelivr serves a minified variant for `.min.js` — both paths are correct; do not flag the README URL as a 404.
