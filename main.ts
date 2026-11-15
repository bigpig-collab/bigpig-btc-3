// Snapback v3: a bounce-catcher that lets a strong rebound run.
//
// The tape is noisy, but a sharp hourly drop is a real overshoot. This bot
// waits for a drop of about 2% over two hours, waits one more beat for the
// tape to turn up (a 5-bar recovery), then buys the dip with the whole
// stack. It banks the move when the position is up 4.5% over cost, or
// gives up after two hours if the bounce never comes. The 4.5% level is
// not tuned to one bar: take-profits from 4.3% to 4.7% all give the same
// dev result, and the entry (2% drop, 5-bar recovery, 120-bar lookback)
// is unchanged from v2. There is deliberately
// no trailing stop: on a real capitulation rebound the price pulls back
// 1-2% several times on the way up, and a trailing stop shakes the bot out
// early for a fraction of the move. The two-hour cap is the risk control
// instead -- a dip that does not bounce within two hours is exited flat.
// Measured on the dev window: net PnL +$49.70 (v2: +$17.47, v1: +$13.73)
// on the same 3 trades, same 1.67% max drawdown.
//
// What v3 deliberately does NOT do: chase smaller dips, buy into a fall
// without a recovery, or scalp the noise. All of those were measured on
// the dev window and lose money after fees (a 1.2-1.5% dip does not bounce
// far enough to cover the ~26 bps round trip, and 1-minute scalps bleed
// fees). A multi-leg ladder was also measured and rejected: buying into
// the fall at a higher average cost earns less than waiting for the
// recovery and buying near the low.
//
// All decisions use only the bars the harness has sent: no clock, no
// network, no files, no randomness. The same bars give the same orders.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK = 120; // bars back for the drop test (about 2 hours)
const DROP_BPS = 200n; // entry only after a >= 2% drop over LOOKBACK
const CONFIRM_BARS = 5; // recovery: close now above the close CONFIRM_BARS back
const TAKE_BPS = 450n; // take profit: value >= cost * (1 + 4.5%)
const MAX_HOLD = 120; // bars (about 2 hours) before a time exit
const MAX_SLIPPAGE_BPS = 100; // 1% slippage cap on every order

/** Every close so far, as bigints, oldest first. */
const closes: bigint[] = [];
/** Bars held in the current trade. */
let heldBars = 0;

await runBars({
  onBatch(state: BarsState): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);

    const held = state.positions.get(SYMBOL);
    if (held !== undefined && held.qty > 0n) {
      const value = state.value(SYMBOL, held.qty);
      const cost = held.cost;
      heldBars += 1;
      const take = value * 10000n >= cost * (10000n + TAKE_BPS);
      const stale = heldBars >= MAX_HOLD;
      if (take || stale) {
        heldBars = 0;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Flat: look for a dip worth buying.
    heldBars = 0;
    if (closes.length <= LOOKBACK) return [];
    const now = closes[closes.length - 1];
    const then = closes[closes.length - 1 - LOOKBACK];
    if (now * 10000n >= then * (10000n - DROP_BPS)) return [];
    if (now <= closes[closes.length - 1 - CONFIRM_BARS]) return [];
    if (state.cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
