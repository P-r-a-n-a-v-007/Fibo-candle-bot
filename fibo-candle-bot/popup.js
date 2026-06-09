// popup.js — Fibo Candle Bot v0.5
const btn        = document.getElementById("analyzeBtn");
const cards      = document.getElementById("cards");
const msgBox     = document.getElementById("msgBox");
const headerMeta = document.getElementById("headerMeta");

function showMsg(text, isError = false) {
  cards.style.display  = "none";
  msgBox.style.display = "block";
  msgBox.className     = "msg-card" + (isError ? " error" : "");
  msgBox.textContent   = text;
}

function showCards(r, symbol, intervalUsed) {
  msgBox.style.display = "none";
  cards.style.display  = "block";

  // Header meta
  const ivLabel = intervalUsed === "sniffer" ? "live data" : `${intervalUsed}m candles`;
  headerMeta.innerHTML = `<b>${symbol || "—"}</b><br>₹${r.price.toFixed(2)} · ${ivLabel}`;

  // Headline card
  const hCard = document.getElementById("headlineCard");
  hCard.className = "card " + (r.bias === "BULLISH" ? "bull" : r.bias === "BEARISH" ? "bear" : "neut");
  document.getElementById("hIcon").textContent  = r.headlineCard.emoji;
  document.getElementById("hText").textContent  = r.headlineCard.text;

  const pill = document.getElementById("strengthPill");
  const sc   = ["weak","moderate","good","strong"][r.strength];
  pill.className   = "pill " + sc;
  pill.textContent = r.strengthLabel + " signal";

  // Hold card
  document.getElementById("holdIcon").textContent  = r.holdCard.icon;
  document.getElementById("holdTitle").textContent = r.holdCard.title;
  document.getElementById("holdText").textContent  = r.holdCard.body;

  // Price card
  if (r.priceCard) {
    document.getElementById("priceCard").style.display = "";
    document.getElementById("priceIcon").textContent   = r.priceCard.icon;
    document.getElementById("priceTitle").textContent  = r.priceCard.title;
    document.getElementById("priceText").textContent   = r.priceCard.body;
  } else {
    document.getElementById("priceCard").style.display = "none";
  }

  // Caution card
  document.getElementById("cautionIcon").textContent  = r.cautionCard.icon;
  document.getElementById("cautionTitle").textContent = r.cautionCard.title;
  document.getElementById("cautionText").textContent  = r.cautionCard.body;
}

async function ensureContentScript(tabId) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { type: "PING" }, resp => {
      if (chrome.runtime.lastError || !resp) {
        chrome.scripting.executeScript(
          { target: { tabId }, files: ["content.js"] },
          () => setTimeout(resolve, 400)
        );
      } else resolve();
    });
  });
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  cards.style.display  = "none";
  msgBox.style.display = "none";
  headerMeta.textContent = "";
  btn.textContent = "Analyzing…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      showMsg("No active tab found. Open a Groww stock page and try again.", true);
      return;
    }
    if (!tab.url?.includes("groww.in")) {
      showMsg("Please open a Groww stock or index chart page first.\n\nExample: groww.in/stocks/infosys-ltd\nor: groww.in/charts/indices/nifty", true);
      return;
    }

    await ensureContentScript(tab.id);

    chrome.tabs.sendMessage(tab.id, { type: "GET_CANDLES_AND_CONTEXT" }, response => {
      btn.disabled = false;
      btn.textContent = "🔍 Analyze current chart";

      if (chrome.runtime.lastError) {
        showMsg("Could not connect to the page.\n\nFix: Refresh the Groww tab, then click Analyze again.", true);
        return;
      }
      if (!response) {
        showMsg("Page did not respond. Please refresh the Groww tab and try again.", true);
        return;
      }

      if (response.error === "NO_REAL_DATA" || !response.candles?.length) {
        const debug = response.log
          ? `\n\n── What the bot saw ──\n${response.log}`
          : "";
        showMsg(
          "Chart data not captured yet.\n\n" +
          "Please share a screenshot of the\n" +
          "'What the bot saw' section below\n" +
          "so we can diagnose the issue." +
          debug,
          true
        );
        return;
      }

      const { candles, symbol, intervalUsed } = response;
      const result = window.FiboBotAnalysis.analyzeCandles(candles, intervalUsed);

      if (result.status !== "OK") {
        showMsg(result.message, false);
        return;
      }

      showCards(result, symbol, intervalUsed);
    });

  } catch (err) {
    btn.disabled = false;
    btn.textContent = "🔍 Analyze current chart";
    showMsg("Unexpected error: " + err.message, true);
  }
});
