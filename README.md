# nostr-zap
[![NPM](https://img.shields.io/npm/v/nostr-zap.svg)](https://www.npmjs.com/package/nostr-zap)

Zap any Nostr npub or note from anywhere.

## Usage

Specify a target npub using a `data-npub` attribute on any HTML elements that you would like to turn into click targets. Optionally,
you can specify a note ID using a `data-note-id` attribute if you'd like to zap a specific note. You can also optionally specify relays 
that you'd like the zap receipt published to using a `data-relays` attribute. If you don't add a `data-relays` attribute, the zap 
receipt will be sent to a small set of default relays.

If the user doesn't have an ext that supports nip-07 installed or does not authorize signing the zap event, an anonymous zap will be sent.
```html
<button
    data-npub="npub1vp8fdcyejd4pqjyrjk9sgz68vuhq7pyvnzk8j0ehlljvwgp8n6eqsrnpsw"
    data-relays="wss://relay.damus.io,wss://nostr.wine,wss://relay.ditto.pub"
>
  Zap Me ⚡️
</button>
```

Add this script tag right before the bottom closing body tag. Pin a specific version and include the `integrity` hash so the browser rejects a tampered CDN response. When you upgrade, update both the version and the hash (for example with [`srihash.org`](https://www.srihash.org/)).
```html
<script
  src="https://cdn.jsdelivr.net/npm/nostr-zap@1.3.2/dist/main.js"
  integrity="sha384-bZNDKE3iPE9QLGZeDLZUj0wkPvMsYpKi44aumZMryoew3QXDvvmaGM3/H3CKlUNM"
  crossorigin="anonymous"
></script>
```

## Pay with Nostr Wallet Connect (NWC)

If your app already has the user's [NWC](https://github.com/nostr-protocol/nips/blob/master/47.md) connection, hand it to nostr-zap and zaps are paid from that wallet directly, without a QR code. If the NWC payment fails, nostr-zap falls back to WebLN and then to the invoice dialog, as before.

```js
window.nostrZap.setNwcConnection("nostr+walletconnect://...");
// or, when bundling: import { setNwcConnection } from "nostr-zap/src/view";

window.nostrZap.setNwcConnection(null); // stop using it
```

The connection string can spend from the user's wallet. nostr-zap keeps it in memory only and never reads it from the page, so do not put it in a `data-` attribute. Your app decides where to store it.

Example Sandbox with 1 button: https://codesandbox.io/s/nostr-zap-from-anywhere-poc-wiyzgm

Example Sandbox with multiple buttons: https://codesandbox.io/s/nostr-zap-from-anywhere-multiple-buttons-6qp79r

Example Sandbox with note ID: https://codesandbox.io/s/nostr-zap-note-from-anywhere-bugme4

![nostr-zap demo](https://nostr.build/p/nb8670.gif)
