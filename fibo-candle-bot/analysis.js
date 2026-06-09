// analysis.js — Fibo Candle Bot v0.5

function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }

// ── EMAs ─────────────────────────────────────────────────────────────────────
function computeEMAs(candles) {
  const closes = candles.map(c => c.close);
  const n = closes.length;
  return {
    last:  closes[n - 1],
    ema10: avg(closes.slice(-10)),
    ema30: avg(closes.slice(-30)),
    ema60: avg(closes.slice(-Math.min(60, n))),
  };
}

// ── Swing High / Low ─────────────────────────────────────────────────────────
function findSwing(candles, lookback = 80) {
  const slice = candles.slice(-lookback);
  let hi = { price: -Infinity, index: -1 };
  let lo = { price:  Infinity, index: -1 };
  slice.forEach((c, i) => {
    if (c.high > hi.price) hi = { price: c.high, index: i };
    if (c.low  < lo.price) lo = { price: c.low,  index: i };
  });
  return { swingHigh: hi, swingLow: lo };
}

// ── Fibonacci ────────────────────────────────────────────────────────────────
function computeFibLevels(low, high) {
  const d = high - low;
  return {
    "23.6": +(high - d * 0.236).toFixed(2),
    "38.2": +(high - d * 0.382).toFixed(2),
    "50.0": +(high - d * 0.500).toFixed(2),
    "61.8": +(high - d * 0.618).toFixed(2),
    "78.6": +(high - d * 0.786).toFixed(2),
  };
}

function nearestFib(price, levels) {
  let best = null, bestD = Infinity;
  for (const [name, lvl] of Object.entries(levels)) {
    const d = Math.abs(price - lvl);
    if (d < bestD) { bestD = d; best = { name, price: lvl }; }
  }
  return best;
}

// ── Candle Patterns ──────────────────────────────────────────────────────────
function detectPattern(candles) {
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2] || c;
  const body      = Math.abs(c.close - c.open);
  const range     = c.high - c.low || 0.0001;
  const upperWick = c.high - Math.max(c.close, c.open);
  const lowerWick = Math.min(c.close, c.open) - c.low;
  const br        = body / range;
  if (br < 0.1)                                                         return "doji";
  if (br < 0.35 && lowerWick >= body*2 && lowerWick > upperWick)       return "bullish_hammer";
  if (br < 0.35 && upperWick >= body*2 && upperWick > lowerWick)       return "bearish_shooting_star";
  if (p.close < p.open && c.close > c.open
      && c.open <= p.close && c.close >= p.open)                        return "bullish_engulfing";
  if (p.close > p.open && c.close < c.open
      && c.open >= p.close && c.close <= p.open)                        return "bearish_engulfing";
  if (c.close > c.open && br > 0.6)                                     return "strong_bullish";
  if (c.close < c.open && br > 0.6)                                     return "strong_bearish";
  return "neutral";
}

// ── Time context from interval ───────────────────────────────────────────────
function timeContext(intervalUsed) {
  const iv = parseInt(intervalUsed) || 15;
  if (iv <= 5)  return { label: "Intraday",   short: "today or tomorrow",  long: "2–3 days"    };
  if (iv <= 15) return { label: "Short-term", short: "2–4 days",           long: "1–2 weeks"   };
  if (iv <= 60) return { label: "Swing",      short: "1–2 weeks",          long: "3–6 weeks"   };
  return           { label: "Positional",  short: "1–3 months",         long: "3–6 months"  };
}

// ── Price targets ────────────────────────────────────────────────────────────
function priceTargets(price, fibLevels, bullish) {
  const sorted = Object.entries(fibLevels)
    .map(([k, v]) => ({ name: k, price: v }))
    .sort((a, b) => a.price - b.price);
  if (bullish) {
    const above = sorted.filter(l => l.price > price);
    return { t1: above[0] || null, t2: above[1] || null };
  } else {
    const below = sorted.filter(l => l.price < price).reverse();
    return { t1: below[0] || null, t2: below[1] || null };
  }
}

// ── Signal strength 0–3 ──────────────────────────────────────────────────────
function signalStrength(isBullPat, isBearPat, isKeyFib, veryClose, bias) {
  let s = 0;
  if (bias !== "NEUTRAL") s++;
  if (isKeyFib && veryClose) s++;
  if ((bias === "BULLISH" && isBullPat) || (bias === "BEARISH" && isBearPat)) s++;
  return s;
}

// ── Plain-English sentence builders ─────────────────────────────────────────

function headline(bias, action) {
  if (bias === "BULLISH") {
    return action === "BUY_WINDOW"
      ? { emoji: "🟢", text: "Looks like a good time to BUY" }
      : { emoji: "📈", text: "Market is going UP — but wait for a better price" };
  }
  if (bias === "BEARISH") {
    return action === "SELL_WINDOW"
      ? { emoji: "🔴", text: "Good time to SELL or Exit" }
      : { emoji: "📉", text: "Market is going DOWN — avoid buying now" };
  }
  return { emoji: "⚪", text: "No clear direction — best to wait and watch" };
}

function holdCard(bias, action, tc, strength) {
  if (bias === "NEUTRAL")
    return { icon: "🕐", title: "What to do", body: "The price is moving sideways with no clear direction. It's best to sit on the sidelines and wait for a clearer trend before investing." };

  if (bias === "BULLISH") {
    if (action === "BUY_WINDOW") {
      const body = strength === 3
        ? `This looks like a strong buying opportunity. If you buy now, consider holding for ${tc.long} to get the most out of this upward move.`
        : `This could be a decent entry point. Consider holding for at least ${tc.short}. If the uptrend continues, you could stay in for ${tc.long}.`;
      return { icon: "✅", title: "Suggested action", body };
    }
    return {
      icon: "⏳", title: "Suggested action",
      body: `The stock is trending upward, but the price hasn't reached an ideal buy zone yet. Consider waiting ${tc.short} for a small pullback in price before buying. Once you buy, you could hold for ${tc.long}.`
    };
  }

  // BEARISH
  if (action === "SELL_WINDOW") {
    return {
      icon: "⚠️", title: "Suggested action",
      body: `If you currently hold this stock or fund, this may be a good time to sell or reduce your position. The downward pressure could last ${tc.short} or more. Avoid buying until the trend reverses.`
    };
  }
  return {
    icon: "🔒", title: "Suggested action",
    body: `The price is falling. If you already hold this, consider waiting ${tc.short} to see if it stabilizes. If it keeps falling, cutting losses may be wiser than holding long-term.`
  };
}

function priceCard(price, targets, bias, intervalUsed) {
  const iv = parseInt(intervalUsed) || 15;
  const timeWord = iv <= 5  ? "by end of day"
                 : iv <= 15 ? "over the next few days"
                 : iv <= 60 ? "over the next 1–2 weeks"
                 :            "over the next few weeks";

  if (!targets.t1) return null;

  const fmt  = v => `₹${v.toFixed(2)}`;
  const diff = v => `₹${Math.abs(price - v).toFixed(2)}`;
  const pct  = v => `${(Math.abs(price - v) / price * 100).toFixed(1)}%`;

  if (bias === "BULLISH") {
    let body = `You can expect the price to move up toward ${fmt(targets.t1.price)} ${timeWord} — that's about ${diff(targets.t1.price)} (${pct(targets.t1.price)}) above current price.`;
    if (targets.t2) body += ` If the buying continues strongly, it could go even higher to around ${fmt(targets.t2.price)} (${pct(targets.t2.price)} up).`;
    body += ` These are estimated levels, not guarantees.`;
    return { icon: "🎯", title: "Where the price could go", body };
  } else {
    let body = `The price may slide down toward ${fmt(targets.t1.price)} ${timeWord} — roughly ${diff(targets.t1.price)} (${pct(targets.t1.price)}) below current price.`;
    if (targets.t2) body += ` If selling pressure increases, it could fall further to around ${fmt(targets.t2.price)} (${pct(targets.t2.price)} lower).`;
    body += ` These are estimated levels, not guarantees.`;
    return { icon: "🎯", title: "Where the price could go", body };
  }
}

function cautionCard(strength, pattern, bias) {
  const lines = [];
  if (strength <= 1) lines.push("The signal is weak right now — don't make large financial moves based on this alone.");
  if (pattern === "doji") lines.push("The latest candle shows the market is undecided. Wait for the next candle (next day or session) to confirm which way it goes.");
  if (pattern === "neutral" && bias !== "NEUTRAL") lines.push("The trend is forming, but no strong confirming candle yet. Watch for a clear breakout move.");
  lines.push("This analysis is based on price charts only. Always check latest news and company reports before investing real money.");
  return { icon: "💡", title: "Keep in mind", body: lines.join(" ") };
}

// ── Main ─────────────────────────────────────────────────────────────────────
function analyzeCandles(candles, intervalUsed) {
  if (!candles || candles.length < 30) {
    return {
      status: "INSUFFICIENT_DATA",
      message: `Only ${candles?.length ?? 0} data points loaded — need at least 30.\n\nOpen the chart, switch to a longer time period (1 Month or 3 Months), wait for it to load, then click Analyze again.`
    };
  }

  const emas = computeEMAs(candles);
  const { swingHigh, swingLow } = findSwing(candles, 80);

  if (!isFinite(swingHigh.price) || !isFinite(swingLow.price) || swingHigh.price === swingLow.price) {
    return { status: "INSUFFICIENT_CONTEXT", message: "Not enough price variation to calculate levels. Try a longer time period." };
  }

  const uptrend   = swingHigh.index > swingLow.index;
  const fibLevels = uptrend
    ? computeFibLevels(swingLow.price, swingHigh.price)
    : computeFibLevels(swingHigh.price, swingLow.price);

  const price      = emas.last;
  const nearFib    = nearestFib(price, fibLevels);
  const pattern    = detectPattern(candles);
  const nearFibPct = Math.abs(price - nearFib.price) / price * 100;
  const veryClose  = nearFibPct < 1.5;
  const isKeyFib   = new Set(["38.2","50.0","61.8"]).has(nearFib.name);
  const isBullPat  = new Set(["bullish_hammer","bullish_engulfing","strong_bullish"]).has(pattern);
  const isBearPat  = new Set(["bearish_shooting_star","bearish_engulfing","strong_bearish"]).has(pattern);

  let bias = "NEUTRAL", action = "HOLD";
  if (uptrend && emas.ema10 > emas.ema30) {
    bias   = "BULLISH";
    action = (isKeyFib && veryClose && isBullPat) ? "BUY_WINDOW" : "HOLD_OR_BUY_ON_DIP";
  } else if (!uptrend && emas.ema10 < emas.ema30) {
    bias   = "BEARISH";
    action = (isKeyFib && veryClose && isBearPat) ? "SELL_WINDOW" : "HOLD_OR_SELL_ON_RISE";
  }

  const strength = signalStrength(isBullPat, isBearPat, isKeyFib, veryClose, bias);
  const tc       = timeContext(intervalUsed);
  const targets  = priceTargets(price, fibLevels, bias === "BULLISH");

  return {
    status: "OK",
    bias, action, price, strength,
    swingHigh: swingHigh.price,
    swingLow:  swingLow.price,
    fibLevels, nearFib, pattern, tc, targets,
    // card data
    headlineCard: headline(bias, action),
    holdCard:     holdCard(bias, action, tc, strength),
    priceCard:    priceCard(price, targets, bias, intervalUsed),
    cautionCard:  cautionCard(strength, pattern, bias),
    strengthLabel: ["Weak","Moderate","Good","Strong"][strength],
  };
}

if (typeof window !== "undefined") window.FiboBotAnalysis = { analyzeCandles };
