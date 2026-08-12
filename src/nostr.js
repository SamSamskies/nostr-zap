import {
  nip19,
  nip57,
  generatePrivateKey,
  finishEvent,
  SimplePool,
} from "nostr-tools";

export const decodeNpub = (npub) => nip19.decode(npub).data;

const decodeNip19Entity = (nip19Entity) => nip19.decode(nip19Entity).data;

let cachedProfileMetadata = {};

export const getProfileMetadata = async (authorId) => {
  if (cachedProfileMetadata[authorId]) {
    return cachedProfileMetadata[authorId];
  }

  const pool = new SimplePool();
  const relays = [
    "wss://relay.ditto.pub",
    "wss://purplepag.es",
    "wss://relay.damus.io",
    "wss://nostr.wine",
  ];

  try {
    return await pool.get(relays, {
      authors: [authorId],
      kinds: [0],
    });
  } catch (error) {
    throw new Error("failed to fetch user profile :(");
  } finally {
    pool.close(relays);
  }
};

export const extractProfileMetadataContent = (profileMetadata) =>
  JSON.parse(profileMetadata.content);

export const getZapEndpoint = async (profileMetadata) => {
  const zapEndpoint = await nip57.getZapEndpoint(profileMetadata);

  if (!zapEndpoint) {
    throw new Error("failed to retrieve zap endpoint :(");
  }

  return zapEndpoint;
};

const signEvent = async (zapEvent, anon) => {
  const wantsExtension = isNipO7ExtAvailable() && !anon;

  if (wantsExtension) {
    try {
      return {
        signedEvent: await window.nostr.signEvent(zapEvent),
        signedAnonymously: false,
        usedAnonymousFallback: false,
      };
    } catch (e) {
      // Extension prompt declined or failed — fall back to anonymous signing.
    }
  }

  if (!zapEvent.tags.some((tag) => tag[0] === "anon")) {
    zapEvent.tags.push(["anon"]);
  }

  return {
    signedEvent: finishEvent(zapEvent, generatePrivateKey()),
    signedAnonymously: true,
    usedAnonymousFallback: wantsExtension,
  };
};

const makeZapEvent = async ({
  profile,
  nip19Target,
  amount,
  relays,
  comment,
  anon,
}) => {
  const zapEvent = nip57.makeZapRequest({
    profile,
    event: nip19Target && nip19Target.startsWith("note") ? decodeNip19Entity(nip19Target) : undefined,
    amount,
    relays,
    comment,
  });

  const naddrData = nip19Target && nip19Target.startsWith("naddr") ? decodeNip19Entity(nip19Target) : undefined;
  if (naddrData) {
    const relays = naddrData.relays ? naddrData.relays.reduce((acc, r) => `${r},${acc}`, "") : "";
    zapEvent.tags.push(["a", `${naddrData.kind}:${naddrData.pubkey}:${naddrData.identifier}`, relays]);
  }

  // Prefer the anon tag before the first sign attempt when anonymity is intentional.
  if (!isNipO7ExtAvailable() || anon) {
    zapEvent.tags.push(["anon"]);
  }

  return signEvent(zapEvent, anon);
};

export const fetchInvoice = async ({
  zapEndpoint,
  amount,
  comment,
  authorId,
  nip19Target,
  normalizedRelays,
  anon,
}) => {
  const { signedEvent, signedAnonymously, usedAnonymousFallback } =
    await makeZapEvent({
      profile: authorId,
      nip19Target,
      amount,
      relays: normalizedRelays,
      comment,
      anon,
    });
  let url = `${zapEndpoint}?amount=${amount}&nostr=${encodeURIComponent(
    JSON.stringify(signedEvent)
  )}`;

  if (comment) {
    url = `${url}&comment=${encodeURIComponent(comment)}`;
  }

  const res = await fetch(url);
  const { pr: invoice, reason, status } = await res.json();

  if (invoice) {
    return { invoice, signedAnonymously, usedAnonymousFallback };
  } else if (status === "ERROR") {
    throw new Error(reason ?? "Unable to fetch invoice");
  } else {
    throw new Error("Unable to fetch invoice");
  }
};

export const isNipO7ExtAvailable = () => {
  return window !== undefined && window.nostr !== undefined;
};

export const listenForZapReceipt = ({
  relays,
  invoice,
  onSuccess,
  recipientPubkey,
}) => {
  const pool = new SimplePool();
  const normalizedRelays = Array.from(
    new Set([...relays, "wss://relay.ditto.pub"])
  );
  const since = Math.round(Date.now() / 1000);
  let closed = false;
  let sub = null;
  let intervalId = null;

  const cleanup = () => {
    if (closed) {
      return;
    }

    closed = true;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (sub) {
      sub.unsub();
      sub = null;
    }

    pool.close(normalizedRelays);
  };

  const filter = {
    kinds: [9735],
    since,
  };

  if (recipientPubkey) {
    filter["#p"] = [recipientPubkey];
  }

  // Resubscribe periodically so dropped relay sockets reconnect and the
  // invoice dialog can still close after a successful payment.
  const subscribe = () => {
    if (closed) {
      return;
    }

    if (sub) {
      sub.unsub();
      sub = null;
    }

    sub = pool.sub(normalizedRelays, [filter]);
    sub.on("event", (event) => {
      if (closed) {
        return;
      }

      if (event.tags.find((t) => t[0] === "bolt11" && t[1] === invoice)) {
        onSuccess();
        cleanup();
      }
    });
  };

  subscribe();
  intervalId = setInterval(subscribe, 5000);

  return cleanup;
};
