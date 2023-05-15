import { nip19, nip57, relayInit } from "nostr-tools";

export const decodeNpub = (npub) => nip19.decode(npub).data;

let cachedProfileMetadata = null;

export const getProfileMetadata = async (authorId) => {
  if (cachedProfileMetadata) {
    return cachedProfileMetadata;
  }

  const metadata = await new Promise((resolve, reject) => {
    if (window === undefined || window.nostr === undefined) {
      return reject("No extension that supports Nostr nip-07 detected.");
    }

    const relay = relayInit("wss://relay.nostr.band");

    relay.on("connect", async () => {
      console.log(`connected to ${relay.url}`);

      const metadata = await relay.get({
        authors: [authorId],
        kinds: [0],
      });

      cachedProfileMetadata = metadata;
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

export const makeZapEvent = async ({ profile, amount, relays, comment }) => {
  const zapEvent = nip57.makeZapRequest({
    profile,
    amount,
    relays,
    comment,
  });
  const signedEvent = await window.nostr.signEvent(zapEvent);
  const validateZapRequestResult = nip57.validateZapRequest(
    JSON.stringify(signedEvent)
  );

  if (validateZapRequestResult !== null) {
    throw new Error(validateZapRequestResult);
  }

  return signedEvent;
};

export const fetchInvoice = async ({
  zapEvent,
  zapEndpoint,
  amount,
  comment,
}) => {
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
