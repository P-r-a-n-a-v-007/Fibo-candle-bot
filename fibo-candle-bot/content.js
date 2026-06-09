// content.js — runs in ISOLATED world, bridges to sniffer.js in MAIN world

console.log("Fibo Candle Bot v0.8 content.js loaded");

// sniffer.js already runs in MAIN world and has hooked fetch/XHR.
// We communicate with it via CustomEvents on the shared document object.

function readCache() {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(null), 1000);
    document.addEventListener("__fiboBotCacheReady__", e => {
      clearTimeout(t);
      resolve(e.detail || null);
    }, { once: true });
    document.dispatchEvent(new Event("__fiboBotGetCache__"));
  });
}

function readAllUrls() {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve([]), 600);
    document.addEventListener("__fiboBotUrlsReady__", e => {
      clearTimeout(t);
      resolve(e.detail || []);
    }, { once: true });
    document.dispatchEvent(new Event("__fiboBotGetUrls__"));
  });
}

function parseRaw(rawCandles) {
  return rawCandles
    .filter(Array.isArray)
    .map(([time, open, high, low, close, volume = 0]) => ({
      time: Number(time), open: Number(open), high: Number(high),
      low: Number(low), close: Number(close), volume: Number(volume)
    }))
    .filter(c => [c.time,c.open,c.high,c.low,c.close].every(isFinite)
              && c.high >= c.low && c.open > 0);
}

function displayName() {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return (parts[parts.length-1]||"")
      .replace(/-/g," ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .slice(0, 40);
  } catch(_) { return ""; }
}

async function getRealGrowwCandles() {
  // Poll for up to 5 seconds waiting for sniffer to capture a chart call
  let cached = null;
  for (let i = 0; i < 10; i++) {
    cached = await readCache();
    if (cached?.candles?.length) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (!cached?.candles?.length) {
    const urls  = await readAllUrls();
    const chart = urls.filter(u => /charting/i.test(u));
    const debug = chart.length
      ? `Chart URLs seen:\n` + chart.slice(-5).map(u => "• " + u.split("?")[0]).join("\n")
      : urls.length
        ? `No chart URLs found. Recent URLs:\n` + urls.slice(-8).map(u => "• " + u.split("?")[0]).join("\n")
        : `No URLs captured at all — sniffer may not be active.\nTry: refresh the Groww tab fully (Ctrl+R), then click Analyze.`;
    return { symbol: displayName(), candles: null, log: debug };
  }

  const candles = parseRaw(cached.candles);
  if (!candles.length) {
    return { symbol: cached.symbol || displayName(), candles: null,
             log: "Candles captured but all had invalid OHLC values." };
  }

  return {
    symbol: cached.symbol || displayName(),
    candles,
    intervalUsed: cached.interval || "sniffer",
    log: null
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PING") {
    sendResponse({ pong: true, version: "0.8" });
    return true;
  }
  if (msg?.type === "GET_CANDLES_AND_CONTEXT") {
    (async () => {
      const { symbol, candles, intervalUsed, log } = await getRealGrowwCandles();
      if (!candles?.length)
        sendResponse({ candles: [], symbol, error: "NO_REAL_DATA", log });
      else
        sendResponse({ candles, symbol, intervalUsed });
    })();
    return true;
  }
  return false;
});
