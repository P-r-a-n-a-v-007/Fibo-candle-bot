// sniffer.js — injected into MAIN world at document_start
// Hooks fetch() and XHR BEFORE Groww's own scripts run,
// so every single network call is captured from the first one.

(function () {
  if (window.__fiboBotSnifferActive) return;
  window.__fiboBotSnifferActive = true;
  window.__fiboBotCache   = null;
  window.__fiboBotAllUrls = [];

  const CHART_RE = /charting_service/i;

  function logUrl(url) {
    if (!url) return;
    window.__fiboBotAllUrls.push(String(url));
    if (window.__fiboBotAllUrls.length > 300) window.__fiboBotAllUrls.shift();
  }

  function tryCache(url, getJson) {
    logUrl(url);
    if (!CHART_RE.test(url)) return;

    console.log("[FiboBotSniffer] chart URL hit:", url);

    let symbol = null, exchange = null, segment = null, interval = null;
    try {
      const parsed = new URL(url, location.origin);
      const m = parsed.pathname.match(/exchange\/([^/]+)\/segment\/([^/]+)\/([^/]+)$/i);
      if (m) {
        exchange = decodeURIComponent(m[1]).toUpperCase();
        segment  = decodeURIComponent(m[2]).toUpperCase();
        symbol   = decodeURIComponent(m[3]).toUpperCase().trim();
      }
      interval = new URLSearchParams(parsed.search).get("intervalInMinutes");
    } catch(e) {}

    getJson().then(json => {
      if (!json) return;
      console.log("[FiboBotSniffer] keys:", Object.keys(json), "candles:", json.candles?.length);

      // Handle multiple possible response shapes
      let candles = null;
      if (Array.isArray(json.candles)        && json.candles.length)        candles = json.candles;
      else if (Array.isArray(json.data?.candles) && json.data.candles.length) candles = json.data.candles;
      else if (Array.isArray(json.ohlcData)  && json.ohlcData.length)       candles = json.ohlcData;
      else if (Array.isArray(json.data)      && json.data.length)           candles = json.data;
      if (!candles) return;

      const prev = window.__fiboBotCache;
      if (!prev || candles.length >= prev.candles.length) {
        window.__fiboBotCache = {
          symbol, exchange, segment, candles,
          interval: interval ? parseInt(interval) : null,
          ts: Date.now()
        };
        console.log("[FiboBotSniffer] ✓ cached", candles.length, "candles for", symbol);
      }
    }).catch(e => console.warn("[FiboBotSniffer] parse error:", e.message));
  }

  // ── Hook fetch ────────────────────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0]?.url || "");
    const resp = await _fetch.apply(this, args);
    tryCache(url, () => resp.clone().json());
    return resp;
  };

  // ── Hook XHR ──────────────────────────────────────────────────────────────
  const _XHR = window.XMLHttpRequest;
  class PatchedXHR extends _XHR {
    open(method, url, ...rest) {
      this.__fiboUrl = url;
      super.open(method, url, ...rest);
    }
    send(...args) {
      this.addEventListener("load", () => {
        try {
          if (this.__fiboUrl)
            tryCache(this.__fiboUrl, () => Promise.resolve(JSON.parse(this.responseText)));
        } catch(_) {}
      });
      super.send(...args);
    }
  }
  window.XMLHttpRequest = PatchedXHR;

  // ── Bridge to content.js via CustomEvents ────────────────────────────────
  document.addEventListener("__fiboBotGetCache__", () => {
    document.dispatchEvent(new CustomEvent("__fiboBotCacheReady__", {
      detail: window.__fiboBotCache
    }));
  });

  document.addEventListener("__fiboBotGetUrls__", () => {
    document.dispatchEvent(new CustomEvent("__fiboBotUrlsReady__", {
      detail: window.__fiboBotAllUrls
    }));
  });

  console.log("[FiboBotSniffer] v0.8 ready in MAIN world — fetch + XHR hooked");
})();
