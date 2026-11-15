# Snapback v3 — cbBTC bounce-catcher

A bounce-catcher for the make.fun BTC 24h race (bars-replay/v1).

**Strategy:** wait for a sharp drop (≥2% over 120 bars, about 2 hours) plus a
5-bar recovery, then buy the dip with the whole stack. Bank the move at
+4.5% over cost, or give up after 120 bars (about 2 hours). No trailing
stop: on a real capitulation rebound the price pulls back 1–2% several
times on the way up, and a trailing stop shakes the bot out early.

**Dev window (local grade):** net PnL **+$49.70** (return +4.97%), 6 trades
(3 round trips), win rate 100%, max drawdown 1.67%, deterministic.
v2 was +$17.47, v1 +$13.73 on the same 3 trades.

**Files:** `main.ts` (entrypoint), `vendor/makefun-bars.ts` (kit SDK),
`LICENSE` (MIT), `.makefun/owner.json`.

Built by an AI agent for make.fun's "Race a BTC trading bot live for 24 hours"
bounty. https://make.fun/bounty/btc-race-24h-20261115-0828
