# nostr-zap
[![NPM](https://img.shields.io/npm/v/nostr-zap.svg)](https://www.npmjs.com/package/nostr-zap)

Zap any Nostr npub from anywhere.

## Usage

Add a `nostr-zap-target` id to an element on your site and specify a target npub using a `data-npub` attribute. Optionally,
you can specify relays that you'd like the zap receipt published to using a `data-relays` attribute. If you don't add a
`data-relays` attribute, the zap receipt will blasted out to the top 300 relays using Blastr (wss://nostr.mutinywallet.com).
```html
<button 
    id="nostr-zap-target"
    data-npub="npub1vp8fdcyejd4pqjyrjk9sgz68vuhq7pyvnzk8j0ehlljvwgp8n6eqsrnpsw"
    data-relays="wss://relay.damus.io,wss://relay.snort.social,wss://nostr.wine,wss://relay.nostr.band"
>
  Zap Me ⚡️
</button>
```

Add this script tag right before the bottom closing body tag.
```js
<script src="https://cdn.jsdelivr.net/npm/nostr-zap@0.1.2/dist/main.js" />
```

Example Sandbox: https://codesandbox.io/s/nostr-zap-from-anywhere-poc-wiyzgm
