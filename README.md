# 🕯️ Fibo Candle Bot
Wanna trade stocks but don't know how to read candle graphs!? DW I gotchu...

A free Chrome/Edge browser extension that plugs into **Groww** and analyzes any stock, ETF, or index chart in real time — using the same  mathematical tools professional traders use, explained so anyone can understand.

## 🤔 The Problem

Millions of Indians invest through Groww every day.
But staring at a candlestick chart with no idea what it means?
That's most of us.

Professional traders use tools like Fibonacci retracement, EMA analysis, and candlestick pattern recognition to make decisions. These aren't secrets,they're just math. But the learning curve is steep, and most tools that implement them are either expensive, complicated, or full of jargon.

**Fibo Candle Bot fixes that.**
## ✅ What It Does

Sit on any Groww chart page, click the extension, and get:

- 📊 **Trend direction** — is this stock going up or down right now?
- 🤔 **Plain English action** — should you buy, sell, hold short-term, or wait?
- 🎯 **Price targets** — where could the price realistically move next?
- ⚠️  **Honest caveats** — how strong is the signal, and what to watch out for?

No jargon. No "resistance levels" or "EMA crossovers" in the output.
Just answers a regular person can act on.
---
## 📈 How It Works

Under the hood, the bot uses three layers of analysis:

### 1. Trend Detection
Compares a 10-candle average against a 30-candle average (EMA).
If the short-term average is above the long-term → uptrend.
If below → downtrend.

### 2. Fibonacci Retracement
Finds the most recent swing high and swing low in the chart data.
Calculates the five key Fibonacci levels between them:
- 23.6% — shallow pullback zone
- 38.2% — common support/resistance
- 50.0% — mid-point
- 61.8% — golden ratio (strongest level)
- 78.6% — deep pullback zone

Checks how close the current price is to these levels.

### 3. Candlestick Pattern Recognition
Detects the following patterns on the latest candles:
- Bullish Hammer
- Bearish Shooting Star
- Bullish Engulfing
- Bearish Engulfing
- Strong Bullish / Strong Bearish candles
- Doji (indecision)

When trend + Fibonacci level + candlestick pattern all align →
that's a high-confidence signal.

---

## 🛠️ Tech Stack

| Layer | Technology |
| Extension framework | Chrome Manifest V3 |
| Language | Vanilla JavaScript (zero dependencies) |
| Data source | Groww's own chart API (intercepted via fetch hook) |
| Analysis | Custom Fibonacci + EMA + pattern logic |
| UI | Plain HTML/CSS — no frameworks |

**No backend. No server. No subscription. No data leaves your browser.**
Everything runs locally on your machine.

---

## 📦 Installation

This extension is not on the Chrome Web Store yet.
Install it manually in Developer Mode:

1. Download or clone this repository
2. Or click **Code → Download ZIP** and extract it

2. Open your browser and go to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

3. Enable **Developer Mode** (toggle, top right)

4. Click **Load Unpacked**

5. Select the `fibo-candle-bot` folder

6. The extension icon will appear in your toolbar

---

## 🚀 How To Use

1. Open **groww.in** and navigate to any chart:
   - Stock: `groww.in/stocks/reliance-industries-ltd`
   - Index: `groww.in/charts/indices/nifty`
   - ETF or Stock: any fund page with a chart

2. Wait for the chart to fully load on the page (2–3 seconds)

3. Click the **Fibo Candle Bot** icon in your browser toolbar

4. Click **Analyze current chart**

5. Read your plain-English signal

---

## 🗂️ File Structure
fibo-candle-bot/
│
├── manifest.json    — Extension config, permissions, script declarations
├── sniffer.js       — Runs in page world, hooks fetch() to capture chart data
├── content.js       — Bridges sniffer data to the popup
├── analysis.js      — All Fibonacci, EMA, and pattern logic
├── popup.html       — Extension UI layout
└── popup.js         — Renders analysis results as readable cards
## ⚠️ Disclaimer

This tool is built for **educational and informational purposes only**.
It is not financial advice.

Fibonacci analysis is a widely used technical analysis method, but no
chart-based tool can predict markets with certainty. Always do your own
research, consider your risk tolerance, and consult a financial advisor
before making investment decisions.

**Past chart patterns do not guarantee future results.**
