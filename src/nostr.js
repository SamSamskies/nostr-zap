import {
  nip19,
  nip57,
  generatePrivateKey,
  finishEvent,
  SimplePool,
} from "nostr-tools";

export const decodeNpub = (npub) => nip19.decode(npub).data;

const decodeNoteId = (noteId) => nip19.decode(noteId).data;

let cachedProfileMetadata = {};

export const getProfileMetadata = async (authorId) => {
  if (cachedProfileMetadata[authorId]) {
    return cachedProfileMetadata[authorId];
  }

  const pool = new SimplePool();
  const relays = [
    "wss://relay.nostr.band",
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

const signEvent = async (zapEvent) => {
  if (isNipO7ExtAvailable()) {
    try {
      return await window.nostr.signEvent(zapEvent);
    } catch (e) {
      // fail silently and sign event as an anonymous user
    }
  }

  return finishEvent(zapEvent, generatePrivateKey());
};

const makeZapEvent = async ({ profile, event, amount, relays, comment }) => {
  const zapEvent = nip57.makeZapRequest({
    profile,
    event,
    amount,
    relays,
    comment,
  });

  return signEvent(zapEvent);
};

export const fetchInvoice = async ({
  zapEndpoint,
  amount,
  comment,
  authorId,
  noteId,
  normalizedRelays,
}) => {
  const zapEvent = await makeZapEvent({
    profile: authorId,
    event: noteId ? decodeNoteId(noteId) : undefined,
    amount,
    relays: normalizedRelays,
    comment,
  });
  let url = `${zapEndpoint}?amount=${amount}&nostr=${encodeURIComponent(
    JSON.stringify(zapEvent)
  )}`;

  if (comment) {
    url = `${url}&comment=${encodeURIComponent(comment)}`;
  }

  const res = await fetch(url);
  const { pr: invoice } = await res.json();

  return invoice;
};

export const isNipO7ExtAvailable = () => {
  return window !== undefined && window.nostr !== undefined;
};

export const listenForZapReceipt = ({ relays, invoice, onSuccess }) => {
  const pool = new SimplePool();
  const normalizedRelays = Array.from(
    new Set([...relays, "wss://relay.nostr.band"])
  );
  const closePool = () => {
    if (pool) {
      pool.close(normalizedRelays);
    }
  };
  const since = Math.round(Date.now() / 1000);

  // check for zap receipt every 5 seconds
  const intervalId = setInterval(() => {
    const sub = pool.sub(normalizedRelays, [
      {
        kinds: [9735],
        since,
      },
    ]);

    sub.on("event", (event) => {
      if (event.tags.find((t) => t[0] === "bolt11" && t[1] === invoice)) {
        onSuccess();
        closePool();
        clearInterval(intervalId);
      }
    });
  }, 5000);

  return () => {
    closePool();
    clearInterval(intervalId);
  };
};
