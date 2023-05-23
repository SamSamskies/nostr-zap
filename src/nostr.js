import {
  nip19,
  nip57,
  relayInit,
  generatePrivateKey,
  finishEvent,
} from "nostr-tools";

export const decodeNpub = (npub) => nip19.decode(npub).data;

let cachedProfileMetadata = {};

export const getProfileMetadata = async (authorId) => {
  if (cachedProfileMetadata[authorId]) {
    return cachedProfileMetadata[authorId];
  }

  const metadata = await new Promise((resolve, reject) => {
    const relay = relayInit("wss://relay.nostr.band");

    relay.on("connect", async () => {
      console.log(`connected to ${relay.url}`);

      const metadata = await relay.get({
        authors: [authorId],
        kinds: [0],
      });

      cachedProfileMetadata[authorId] = metadata;
      resolve(metadata);
      relay.close();
    });

    relay.on("error", () => {
      reject(`failed to connect to ${relay.url}`);
      relay.close();
    });

    relay.connect();
  });

  if (!metadata) {
    throw new Error("failed to fetch user profile :(");
  }

  return metadata;
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

const makeZapEvent = async ({ profile, amount, relays, comment }) => {
  const zapEvent = nip57.makeZapRequest({
    profile,
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
  normalizedRelays,
}) => {
  const zapEvent = await makeZapEvent({
    profile: authorId,
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
