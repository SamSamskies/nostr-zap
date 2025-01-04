import QRCode from "easyqrcodejs";
import {
  decodeNpub,
  extractProfileMetadataContent,
  fetchInvoice,
  getProfileMetadata,
  getZapEndpoint,
  listenForZapReceipt,
} from "./nostr";
import { getCachedLightningUri, cacheLightningUri } from "./cache";

let shadow = null;

const hexToRgb = (hex) => {
  hex = hex.replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
};
const getBrightness = ({ r, g, b }) => {
  return (r * 299 + g * 587 + b * 114) / 1000;
};

const getContrastingTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  const brightness = getBrightness(rgb);
  return brightness < 128 ? "#fff" : "#000";
};

const renderDialog = (htmlStrTemplate) => {
  const dialog = document.createElement("dialog");

  dialog.classList.add("nostr-zap-dialog");
  dialog.innerHTML = htmlStrTemplate;

  // close dialog on backdrop click
  dialog.addEventListener("click", function ({ clientX, clientY }) {
    const { left, right, top, bottom } = dialog.getBoundingClientRect();

    if (clientX === 0 && clientY === 0) {
      return;
    }

    if (
      clientX < left ||
      clientX > right ||
      clientY < top ||
      clientY > bottom
    ) {
      dialog.close();
    }
  });

  shadow.appendChild(dialog);

  return dialog;
};

const renderInvoiceDialog = ({
  dialogHeader,
  invoice,
  relays,
  buttonColor,
}) => {
  const cachedLightningUri = getCachedLightningUri();
  const options = [
    { label: "Default Wallet", value: "lightning:" },
    { label: "Strike", value: "strike:lightning:" },
    { label: "Cash App", value: "https://cash.app/launch/lightning/" },
    { label: "Muun", value: "muun:" },
    { label: "Blue Wallet", value: "bluewallet:lightning:" },
    { label: "Wallet of Satoshi", value: "walletofsatoshi:lightning:" },
    { label: "Zebedee", value: "zebedee:lightning:" },
    { label: "Zeus LN", value: "zeusln:lightning:" },
    { label: "Phoenix", value: "phoenix://" },
    { label: "Breez", value: "breez:" },
    { label: "Bitcoin Beach", value: "bitcoinbeach://" },
    { label: "Blixt", value: "blixtwallet:lightning:" },
    { label: "River", value: "river://" },
  ];
  const invoiceDialog = renderDialog(`
        <button class="close-button">X</button>
        ${dialogHeader}
        <div class="qrcode">
          <div class="overlay">copied invoice to clipboard</div>
        </div>
        <p>click QR code to copy invoice</p>
        <select name="lightning-wallet">
          ${options
            .map(
              ({ label, value }) =>
                `<option value="${value}" ${
                  cachedLightningUri === value ? "selected" : ""
                }>${label}</option>`
            )
            .join("")}
        </select>
        <button class="cta-button"
          ${
            buttonColor
              ? `style="background-color: ${buttonColor}; color: ${getContrastingTextColor(
                  buttonColor
                )}"`
              : ""
          } 
        >Open Wallet</button>
      `);
  const qrCodeEl = invoiceDialog.querySelector(".qrcode");
  const lightningWalletEl = invoiceDialog.querySelector(
    'select[name="lightning-wallet"]'
  );
  const ctaButtonEl = invoiceDialog.querySelector(".cta-button");
  const overlayEl = qrCodeEl.querySelector(".overlay");
  const closePool = listenForZapReceipt({
    relays,
    invoice,
    onSuccess: () => {
      invoiceDialog.close();
    },
  });

  new QRCode(qrCodeEl, { text: invoice, quietZone: 10 });

  qrCodeEl.addEventListener("click", function () {
    navigator.clipboard.writeText(invoice);
    overlayEl.classList.add("show");
    setTimeout(() => overlayEl.classList.remove("show"), 2000);
  });

  ctaButtonEl.addEventListener("click", function () {
    cacheLightningUri(lightningWalletEl.value);
    window.location.href = `${lightningWalletEl.value}${invoice}`;
  });

  invoiceDialog.addEventListener("close", function () {
    closePool();
    invoiceDialog.remove();
  });

  invoiceDialog
    .querySelector(".close-button")
    .addEventListener("click", function () {
      invoiceDialog.close();
    });

  return invoiceDialog;
};

const renderAmountDialog = async ({
  npub,
  noteId,
  relays,
  buttonColor,
  anon,
}) => {
  const truncateNip19Entity = (hex) =>
    `${hex.substring(0, 12)}...${hex.substring(npub.length - 12)}`;
  const normalizedRelays = relays
    ? relays.split(",")
    : ["wss://relay.nostr.band", "wss://relay.damus.io", "wss://nos.lol"];

  const authorId = decodeNpub(npub);
  const metadataPromise = getProfileMetadata(authorId);
  const nostrichAvatar =
    "https://pbs.twimg.com/profile_images/1604195803748306944/LxHDoJ7P_400x400.jpg";

  const getDialogHeader = async () => {
    const { picture, display_name, name } = extractProfileMetadataContent(
      await metadataPromise
    );
    const userAvatar = picture || nostrichAvatar;

    return `
      <h2>${display_name || name}</h2>
        <img
          src="${userAvatar}"
          width="80"
          height="80"
          alt="nostr user avatar"
        />
      <p>${noteId ? truncateNip19Entity(noteId) : truncateNip19Entity(npub)}</p>
    `;
  };
  const amountDialog = renderDialog(`
      <button class="close-button">X</button>
      <div class="dialog-header-container">
        <h2 class="skeleton-placeholder"></h2>
          <img
            src="${nostrichAvatar}"
            width="80"
            height="80"
            alt="placeholder avatar"
          />
        <p class="skeleton-placeholder"></p>
      </div>
      <div class="preset-zap-options-container">
        <button data-value="21">21 ⚡️</button>
        <button data-value="69">69 ⚡️</button>
        <button data-value="420">420 ⚡️</button>
        <button data-value="1337">1337 ⚡️</button>
        <button data-value="5000">5k ⚡️</button>
        <button data-value="10000">10k ⚡️</button>
        <button data-value="21000">21k ⚡️</button>
        <button data-value="1000000">1M ⚡️</button>
      </div>
      <form>
        <input name="amount" type="number" placeholder="amount in sats" required />
        <input name="comment" placeholder="optional comment" />
        <button class="cta-button" 
          ${
            buttonColor
              ? `style="background-color: ${buttonColor}; color: ${getContrastingTextColor(
                  buttonColor
                )}"`
              : ""
          } 
          type="submit" disabled>Zap</button>
      </form>
    `);

  const presetButtonsContainer = amountDialog.querySelector(
    ".preset-zap-options-container"
  );
  const form = amountDialog.querySelector("form");
  const amountInput = amountDialog.querySelector('input[name="amount"]');
  const commentInput = amountDialog.querySelector('input[name="comment"]');
  const zapButtton = amountDialog.querySelector('button[type="submit"]');
  const dialogHeaderContainer = amountDialog.querySelector(
    ".dialog-header-container"
  );
  const handleError = (error) => {
    amountDialog.close();

    const errorDialog = renderErrorDialog(error, npub);

    errorDialog.showModal();
  };

  getDialogHeader()
    .then((htmlString) => {
      dialogHeaderContainer.innerHTML = htmlString;
      zapButtton.disabled = false;
    })
    .catch(handleError);

  const setZapButtonToLoadingState = () => {
    zapButtton.disabled = true;
    zapButtton.innerHTML = `<div class="spinner">Loading</div>`;
  };
  const setZapButtonToDefaultState = () => {
    zapButtton.disabled = false;
    zapButtton.innerHTML = "Zap";
  };
  const setAmountValue = (value) => {
    amountInput.value = value;
  };

  amountDialog.addEventListener("close", function () {
    setZapButtonToDefaultState();
    form.reset();
  });

  amountDialog
    .querySelector(".close-button")
    .addEventListener("click", function () {
      amountDialog.close();
    });

  presetButtonsContainer.addEventListener("click", function (event) {
    if (event.target.matches("button")) {
      setAmountValue(event.target.getAttribute("data-value"));
      amountInput.focus();
    }
  });

  const zapEndpoint = metadataPromise.then(getZapEndpoint);

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setZapButtonToLoadingState();

    const amount = Number(amountInput.value) * 1000;
    const comment = commentInput.value;

    try {
      const invoice = await fetchInvoice({
        zapEndpoint: await zapEndpoint,
        amount,
        comment,
        authorId,
        noteId,
        normalizedRelays,
        anon,
      });

      const showInvoiceDialog = async () => {
        const invoiceDialog = renderInvoiceDialog({
          dialogHeader: await getDialogHeader(),
          invoice,
          relays: normalizedRelays,
          buttonColor,
        });
        const openWalletButton = invoiceDialog.querySelector(".cta-button");

        amountDialog.close();
        invoiceDialog.showModal();
        openWalletButton.focus();
      };

      if (window.webln) {
        try {
          await window.webln.enable();
          await window.webln.sendPayment(invoice);
          amountDialog.close();
        } catch (e) {
          showInvoiceDialog();
        }
      } else {
        showInvoiceDialog();
      }
    } catch (error) {
      handleError(error);
    }
  });

  return amountDialog;
};

const renderErrorDialog = (message, npub) => {
  const errorDialog = renderDialog(`
    <button class="close-button">X</button>
    <p class="error-message">${message}</p>
    <a href="https://nosta.me/${npub}" target="_blank">
      <button class="cta-button">View Nostr Profile</button>
    </a>
  `);

  errorDialog.addEventListener("close", function () {
    errorDialog.remove();
  });

  errorDialog
    .querySelector(".close-button")
    .addEventListener("click", function () {
      errorDialog.close();
    });

  return errorDialog;
};

export const init = async ({
  npub,
  noteId,
  relays,
  cachedAmountDialog,
  buttonColor,
  anon,
}) => {
  let amountDialog = cachedAmountDialog;
  try {
    if (!amountDialog) {
      amountDialog = await renderAmountDialog({
        npub,
        noteId,
        relays,
        buttonColor,
        anon,
      });
    }
    amountDialog.showModal();

    if (!window.matchMedia("(max-height: 932px)").matches) {
      amountDialog.querySelector('input[name="amount"]').focus();
    }

    return amountDialog;
  } catch (error) {
    if (amountDialog) {
      amountDialog.close();
    }
    const errorDialog = renderErrorDialog(error, npub);
    errorDialog.showModal();
  }
};

export const initTarget = (targetEl) => {
  let cachedAmountDialog = null;
  let cachedParams = null;

  targetEl.addEventListener("click", async function () {
    const npub = targetEl.getAttribute("data-npub");
    const noteId = targetEl.getAttribute("data-note-id");
    const relays = targetEl.getAttribute("data-relays");
    const buttonColor = targetEl.getAttribute("data-button-color");
    const anon = targetEl.getAttribute("data-anon") === "true";

    if (cachedParams) {
      if (
        cachedParams.npub !== npub ||
        cachedParams.noteId !== noteId ||
        cachedParams.relays !== relays ||
        cachedParams.buttonColor !== buttonColor ||
        cachedParams.anon !== anon
      ) {
        cachedAmountDialog = null;
      }
    }

    cachedParams = { npub, noteId, relays, buttonColor, anon };

    cachedAmountDialog = await init({
      npub,
      noteId,
      relays,
      cachedAmountDialog,
      buttonColor,
      anon,
    });
  });
};

export const initTargets = (selector) => {
  document.querySelectorAll(selector || "[data-npub]").forEach(initTarget);
};

export const injectCSS = () => {
  const styleElement = document.createElement("style");

  styleElement.innerHTML = `
      .nostr-zap-dialog {
        width: 424px;
        min-width: 376px;
        margin: auto;
        box-sizing: content-box;
        border: none;
        border-radius: 10px;
        padding: 36px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        background-color: white;
      }
      .nostr-zap-dialog[open],
      .nostr-zap-dialog form {
        display: block;
        max-width: fit-content;
      }
      .nostr-zap-dialog form {
        padding: 0;
        width: 100%;
      }
      .nostr-zap-dialog img {
        display: inline;
        border-radius: 50%;
      }
      .nostr-zap-dialog h2 {
        font-size: 1.5em;
        font-weight: bold;
        color: black;
      }
      .nostr-zap-dialog p {
        font-size: 1em;
        font-weight: normal;
        color: black;
      }
      .nostr-zap-dialog h2,
      .nostr-zap-dialog p,
      .nostr-zap-dialog .skeleton-placeholder {
        margin: 4px;
        word-wrap: break-word;
      }
      .nostr-zap-dialog button {
        background-color: inherit;
        padding: 12px 0;
        border-radius: 5px;
        border: none;
        font-size: 16px;
        cursor: pointer;
        border: 1px solid rgb(226, 232, 240);
        width: 100px;
        max-width: 100px;
        max-height: 52px;
        white-space: nowrap;
        color: black;
        box-sizing: border-box;
      }
      .nostr-zap-dialog button:hover {
        background-color: #edf2f7;
      }
      .nostr-zap-dialog button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .nostr-zap-dialog .cta-button {
        background-color: #7f00ff;
        color: #fff;
        width: 100%;
        max-width: 100%;
        margin-top: 16px;
      }
      .nostr-zap-dialog .cta-button:hover {
        background-color: indigo;
      }
      .nostr-zap-dialog .close-button {
        background-color: inherit;
        color: black;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 12px;
        border: none;
      }
      .nostr-zap-dialog .preset-zap-options-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        margin: 24px 0 8px 0;
        height: 120px;
      }
      .nostr-zap-dialog input {
        padding: 12px;
        border-radius: 5px;
        border: none;
        font-size: 16px;
        width: 100%;
        max-width: 100%;
        background-color: #f7fafc;
        color: #1a202c;
        box-shadow: none;
        box-sizing: border-box;
        margin-bottom: 16px;
        border: 1px solid lightgray;
      }
      .nostr-zap-dialog .spinner {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .nostr-zap-dialog .spinner:after {
        content: " ";
        display: block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 4px solid #fff;
        border-color: #fff transparent #fff transparent;
        animation: nostr-zap-dialog-spinner 1.2s linear infinite;
        margin-left: 8px;
      }
      .nostr-zap-dialog .error-message {
        text-align: left;
        color: red;
        margin-top: 8px;
      }
      .nostr-zap-dialog .qrcode {
        position: relative;
        display: inline-block;
        margin-top: 24px;
      }
      .nostr-zap-dialog .qrcode .overlay {
        position: absolute;
        color: white;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(127, 17, 224, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
      }
      .nostr-zap-dialog .qrcode .overlay.show {
        opacity: 1;
      }
      @keyframes nostr-zap-dialog-spinner {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      @keyframes nostr-zap-dialog-skeleton-pulse {
        0% {
          opacity: 0.6;
        }
        50% {
          opacity: 0.8;
        }
        100% {
          opacity: 0.6;
        }
      }
      .nostr-zap-dialog .skeleton-placeholder {
        animation-name: nostr-zap-dialog-skeleton-pulse;
        animation-duration: 1.5s;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
        background-color: #e8e8e8;
        border-radius: 4px;
        margin: 4px auto;
      }
      .nostr-zap-dialog p.skeleton-placeholder {
        height: 20px;
        width: 200px;
      }
      .nostr-zap-dialog h2.skeleton-placeholder {
        height: 28px;
        width: 300px;
      }
      .nostr-zap-dialog select[name="lightning-wallet"] {
        appearance: none;
        background-color: white;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="%232D3748" width="24" height="24" viewBox="0 0 24 24"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" /></svg>');
        background-repeat: no-repeat;
        background-position: right 0.7rem center;
        background-size: 16px;
        border: 1px solid #CBD5E0;
        padding: 0.5rem 1rem;
        font-size: 1rem;
        border-radius: 0.25rem;
        width: 100%;
        margin-top: 24px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        cursor: pointer;
      }
      .nostr-zap-dialog select[name="lightning-wallet"]:focus {
        outline: none;
        border-color: #4FD1C5;
        box-shadow: 0 0 0 2px #4FD1C5;
      }
      @media only screen and (max-width: 480px) {
        .nostr-zap-dialog {
          padding: 18px;
        }

        .nostr-zap-dialog button {
          width: 92px;
          max-width: 92px;
        }
      }
      @media only screen and (max-width: 413px) {
        .nostr-zap-dialog {
          min-width: 324px;
        }
        .nostr-zap-dialog button {
          width: 78px;
          max-width: 78px;
        }
      }
  `;

  const host = document.createElement("div");
  document.body.appendChild(host);
  shadow = host.attachShadow({ mode: "open" });
  shadow.appendChild(styleElement);
};
