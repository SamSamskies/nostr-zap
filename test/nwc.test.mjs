import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nip04,
  generatePrivateKey,
  getPublicKey,
  verifySignature,
} from "nostr-tools";
import {
  parseNwcUri,
  makePayInvoiceRequest,
  readPayInvoiceResponse,
  setNwcConnection,
  hasNwcConnection,
} from "../src/nwc.js";

const walletSecret = generatePrivateKey();
const walletPubkey = getPublicKey(walletSecret);
const clientSecret = generatePrivateKey();
const clientPubkey = getPublicKey(clientSecret);
const uri = `nostr+walletconnect://${walletPubkey}?relay=wss%3A%2F%2Frelay.example.com&relay=wss://relay2.example.com&secret=${clientSecret}`;

test("parses a connection string", () => {
  const conn = parseNwcUri(uri);
  assert.equal(conn.walletPubkey, walletPubkey);
  assert.deepEqual(conn.relays, [
    "wss://relay.example.com",
    "wss://relay2.example.com",
  ]);
  assert.equal(conn.secret, clientSecret);
  assert.equal(parseNwcUri(uri.replace("://", ":")).walletPubkey, walletPubkey);
});

test("rejects malformed connection strings", () => {
  for (const bad of [
    "",
    "lightning:lnbc1",
    `nostr+walletconnect://${walletPubkey}?secret=${clientSecret}`,
    `nostr+walletconnect://${walletPubkey}?relay=wss://r.example.com`,
    `nostr+walletconnect://nothex?relay=wss://r.example.com&secret=${clientSecret}`,
  ]) {
    assert.throws(() => parseNwcUri(bad), /invalid NWC/);
  }
});

test("the connection is held in memory and can be cleared", () => {
  setNwcConnection(uri);
  assert.equal(hasNwcConnection(), true);
  setNwcConnection(null);
  assert.equal(hasNwcConnection(), false);
  assert.throws(() => setNwcConnection("nope"));
  assert.equal(hasNwcConnection(), false);
});

test("the wallet can read the pay_invoice request", async () => {
  const conn = parseNwcUri(uri);
  const event = await makePayInvoiceRequest(conn, "lnbc1test");
  assert.equal(event.kind, 23194);
  assert.equal(event.pubkey, clientPubkey);
  assert.ok(verifySignature(event));
  assert.deepEqual(event.tags, [["p", walletPubkey]]);
  const body = JSON.parse(
    await nip04.decrypt(walletSecret, clientPubkey, event.content),
  );
  assert.deepEqual(body, {
    method: "pay_invoice",
    params: { invoice: "lnbc1test" },
  });
});

test("reads the wallet's preimage, and its errors", async () => {
  const conn = parseNwcUri(uri);
  const reply = async (body) => ({
    content: await nip04.encrypt(
      walletSecret,
      clientPubkey,
      JSON.stringify(body),
    ),
  });

  const ok = await readPayInvoiceResponse(
    conn,
    await reply({
      result_type: "pay_invoice",
      result: { preimage: "ab".repeat(32) },
    }),
  );
  assert.equal(ok.preimage, "ab".repeat(32));

  await assert.rejects(
    readPayInvoiceResponse(
      conn,
      await reply({
        result_type: "pay_invoice",
        error: { code: "INSUFFICIENT_BALANCE", message: "not enough" },
      }),
    ),
    /INSUFFICIENT_BALANCE: not enough/,
  );
});
