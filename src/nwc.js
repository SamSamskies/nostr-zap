import { nip04, finishEvent, getPublicKey, SimplePool } from "nostr-tools";

// NIP-47 Nostr Wallet Connect: pay the zap invoice from the user's own wallet.
// https://github.com/nostr-protocol/nips/blob/master/47.md
//
// The connection string can spend from the wallet, so this module never reads
// it from the page or stores it. The host app hands it over with
// setNwcConnection(), and it only lives in memory.

const REQUEST_KIND = 23194;
const RESPONSE_KIND = 23195;
const HEX64 = /^[0-9a-f]{64}$/;

let connection = null;

export const parseNwcUri = (uri) => {
  const match = String(uri)
    .trim()
    .match(/^nostr\+walletconnect:(?:\/\/)?([^?]+)\?(.*)$/i);

  if (!match) {
    throw new Error("invalid NWC connection string");
  }

  const walletPubkey = match[1].toLowerCase();
  const params = new URLSearchParams(match[2]);
  const relays = params.getAll("relay").filter((r) => /^wss?:\/\//.test(r));
  const secret = (params.get("secret") || "").toLowerCase();

  if (!HEX64.test(walletPubkey) || !HEX64.test(secret) || !relays.length) {
    throw new Error("invalid NWC connection string");
  }

  return { walletPubkey, relays, secret };
};

// Pass a nostr+walletconnect:// string to pay zaps with it, or null to stop.
export const setNwcConnection = (uri) => {
  connection = uri ? parseNwcUri(uri) : null;
};

export const hasNwcConnection = () => connection !== null;

// NIP-04, which every NIP-47 wallet accepts. A request without an
// "encryption" tag is read as NIP-04 by wallets that also speak NIP-44.
export const makePayInvoiceRequest = async (conn, invoice) => {
  const content = await nip04.encrypt(
    conn.secret,
    conn.walletPubkey,
    JSON.stringify({ method: "pay_invoice", params: { invoice } }),
  );

  return finishEvent(
    {
      kind: REQUEST_KIND,
      created_at: Math.round(Date.now() / 1000),
      tags: [["p", conn.walletPubkey]],
      content,
    },
    conn.secret,
  );
};

export const readPayInvoiceResponse = async (conn, event) => {
  const response = JSON.parse(
    await nip04.decrypt(conn.secret, conn.walletPubkey, event.content),
  );

  if (response.error) {
    throw new Error(
      `${response.error.code || "ERROR"}: ${
        response.error.message || "payment failed"
      }`,
    );
  }

  if (!response.result || !response.result.preimage) {
    throw new Error("wallet did not return a preimage");
  }

  return { preimage: response.result.preimage };
};

export const payWithNwc = async (invoice, { timeout = 60000, conn } = {}) => {
  conn = conn || connection;

  if (!conn) {
    throw new Error("no NWC connection set");
  }

  const pool = new SimplePool();
  const request = await makePayInvoiceRequest(conn, invoice);
  let sub = null;
  let timer = null;

  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error("NWC wallet did not answer in time")),
        timeout,
      );

      // Subscribe before publishing so a fast wallet's answer is not missed.
      sub = pool.sub(conn.relays, [
        {
          kinds: [RESPONSE_KIND],
          authors: [conn.walletPubkey],
          "#p": [getPublicKey(conn.secret)],
          "#e": [request.id],
        },
      ]);
      sub.on("event", (event) => {
        readPayInvoiceResponse(conn, event).then(resolve, reject);
      });

      pool.publish(conn.relays, request);
    });
  } finally {
    clearTimeout(timer);

    if (sub) {
      sub.unsub();
    }

    pool.close(conn.relays);
  }
};
