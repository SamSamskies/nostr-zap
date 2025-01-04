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
    data-relays="wss://relay.damus.io,wss://relay.snort.social,wss://nostr.wine,wss://relay.nostr.band"
>
  Zap Me ⚡️
</button>
```

Add this script tag right before the bottom closing body tag.
```js
<script src="https://cdn.jsdelivr.net/npm/nostr-zap@latest"></script>
```

Example Sandbox with 1 button: https://codesandbox.io/s/nostr-zap-from-anywhere-poc-wiyzgm

Example Sandbox with multiple buttons: https://codesandbox.io/s/nostr-zap-from-anywhere-multiple-buttons-6qp79r

Example Sandbox with note ID: https://codesandbox.io/s/nostr-zap-note-from-anywhere-bugme4

![nostr-zap demo](https://nostr.build/p/nb8670.gif)
