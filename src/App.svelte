<script>
  import { Calculator } from './lib/engine.js';
  import { History, Delete, X, Trash2 } from '@lucide/svelte';

  const calc = new Calculator();

  let display = $state('0');
  let expression = $state('');
  let preview = $state(null);
  let pendingOp = $state(null);
  let history = $state([]);
  let showHistory = $state(false);

  function sync() {
    display = calc.display;
    expression = calc.expression;
    preview = calc.preview;
    pendingOp = calc.pendingOp;
    history = calc.history;
  }

  function act(fn) {
    fn();
    sync();
  }

  const KEYS = [
    { label: 'C', kind: 'util', run: () => calc.clear() },
    { label: '±', kind: 'util', run: () => calc.toggleSign() },
    { label: '%', kind: 'util', run: () => calc.percent() },
    { label: '÷', kind: 'op', op: '/', run: () => calc.inputOp('/') },
    { label: '7', kind: 'num', run: () => calc.inputDigit('7') },
    { label: '8', kind: 'num', run: () => calc.inputDigit('8') },
    { label: '9', kind: 'num', run: () => calc.inputDigit('9') },
    { label: '×', kind: 'op', op: '*', run: () => calc.inputOp('*') },
    { label: '4', kind: 'num', run: () => calc.inputDigit('4') },
    { label: '5', kind: 'num', run: () => calc.inputDigit('5') },
    { label: '6', kind: 'num', run: () => calc.inputDigit('6') },
    { label: '−', kind: 'op', op: '-', run: () => calc.inputOp('-') },
    { label: '1', kind: 'num', run: () => calc.inputDigit('1') },
    { label: '2', kind: 'num', run: () => calc.inputDigit('2') },
    { label: '3', kind: 'num', run: () => calc.inputDigit('3') },
    { label: '+', kind: 'op', op: '+', run: () => calc.inputOp('+') },
    { label: '0', kind: 'num', span: true, run: () => calc.inputDigit('0') },
    { label: '.', kind: 'num', run: () => calc.inputDot() },
    { label: '=', kind: 'eq', run: () => calc.equals() },
  ];

  const KEY_CLASS = {
    num: 'bg-white/[0.06] text-white hover:bg-white/[0.1] border-white/[0.07]',
    util: 'bg-white/[0.12] text-white hover:bg-white/[0.16] border-white/[0.09]',
    op: 'bg-amber-400/[0.12] text-amber-300 hover:bg-amber-400/[0.2] border-amber-300/[0.16]',
    eq: 'bg-amber-400 text-black hover:bg-amber-300 border-amber-300 font-bold',
  };

  function keyClass(k) {
    let c = KEY_CLASS[k.kind];
    if (k.kind === 'op' && pendingOp === k.op) c = 'bg-amber-400 text-black border-amber-300 font-bold';
    return c;
  }

  // Display font shrinks as the number grows so it never overflows.
  let displaySize = $derived(
    display.length > 14 ? 'text-[2rem]' :
    display.length > 10 ? 'text-[2.75rem]' :
    display.length > 7 ? 'text-[3.75rem]' : 'text-[5.25rem]'
  );

  function onKeyDown(e) {
    const k = e.key;
    if (/^[0-9]$/.test(k)) { act(() => calc.inputDigit(k)); }
    else if (k === '.') { act(() => calc.inputDot()); }
    else if (k === '+' || k === '-' || k === '*' || k === '/') { e.preventDefault(); act(() => calc.inputOp(k)); }
    else if (k === 'Enter' || k === '=') { e.preventDefault(); act(() => calc.equals()); }
    else if (k === 'Backspace') { act(() => calc.backspace()); }
    else if (k === 'Escape' || k === 'Delete') { act(() => calc.clear()); }
    else if (k === '%') { act(() => calc.percent()); }
    else return;
  }

  function recall(item) {
    act(() => calc.recall(item.result));
    showHistory = false;
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="app-shell">
  <div class="calc">
    <!-- top bar -->
    <div class="flex items-center justify-between px-1 pt-2">
      <button
        class="icon-btn"
        onclick={() => (showHistory = !showHistory)}
        aria-label="History"
      >
        <History size={20} strokeWidth={1.8} />
      </button>
      <button class="icon-btn" onclick={() => act(() => calc.backspace())} aria-label="Backspace">
        <Delete size={20} strokeWidth={1.8} />
      </button>
    </div>

    <!-- display -->
    <div class="display" aria-live="polite">
      <div class="expr">{expression || ' '}</div>
      <div class="preview">{preview ?? ' '}</div>
      <div class="value {displaySize}">{display}</div>
    </div>

    <!-- keys -->
    <div class="keys">
      {#each KEYS as k}
        <button
          class="key {keyClass(k)} {k.span ? 'col-span-2' : ''}"
          onclick={() => act(k.run)}
          aria-label={k.label === '=' ? 'Equals' : k.label}
        >
          {k.label}
        </button>
      {/each}
    </div>

    <!-- badge -->
    <div class="badge-row">
      <a href="https://wearedogs.net" target="_blank" rel="noopener" aria-label="Made by DOGS">
        <img src="badge/made-by-dogs.webp" alt="Made by DOGS" class="h-6 w-auto opacity-80" />
      </a>
    </div>
  </div>

  <!-- history sheet -->
  {#if showHistory}
    <button class="sheet-backdrop" onclick={() => (showHistory = false)} aria-label="Close history"></button>
    <div class="sheet" role="dialog" aria-label="Calculation history">
      <div class="flex items-center justify-between px-5 pt-4 pb-2">
        <span class="text-sm font-semibold tracking-wide text-white/70">History</span>
        <div class="flex gap-1">
          <button
            class="icon-btn"
            onclick={() => act(() => { calc.history = []; })}
            aria-label="Clear history"
          >
            <Trash2 size={18} strokeWidth={1.8} />
          </button>
          <button class="icon-btn" onclick={() => (showHistory = false)} aria-label="Close">
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <div class="history-list">
        {#if !history.length}
          <p class="empty">Nothing here yet.</p>
        {:else}
          {#each history as item}
            <button class="history-item" onclick={() => recall(item)}>
              <span class="history-expr">{item.expr}</span>
              <span class="history-result">{item.result}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .app-shell {
    height: 100vh;
    height: 100dvh;
    display: flex;
    justify-content: center;
    background:
      radial-gradient(120% 60% at 50% -10%, rgba(245, 165, 36, 0.07), transparent 60%),
      #0a0a0f;
    overflow: hidden;
  }
  .calc {
    width: 100%;
    max-width: 430px;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: calc(env(safe-area-inset-top, 0px) + 8px) 16px calc(env(safe-area-inset-bottom, 0px) + 10px);
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    color: rgba(255, 255, 255, 0.55);
    transition: background 120ms, color 120ms, transform 80ms;
    -webkit-tap-highlight-color: transparent;
  }
  .icon-btn:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  .icon-btn:active { transform: scale(0.92); }
  .display {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    text-align: right;
    padding: 8px 4px 12px;
    min-height: 0;
    overflow: hidden;
  }
  .expr {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.42);
    min-height: 1.5rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .preview {
    font-size: 1.35rem;
    color: rgba(252, 211, 77, 0.75);
    min-height: 2rem;
    font-variant-numeric: tabular-nums;
  }
  .value {
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.05;
    color: #fff;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    transition: font-size 120ms ease;
  }
  .keys {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .key {
    aspect-ratio: 1 / 0.92;
    border-radius: 20px;
    font-size: 1.65rem;
    border: 1px solid;
    display: grid;
    place-items: center;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: transform 70ms ease, background 120ms ease;
    animation: key-in 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
    font-variant-numeric: tabular-nums;
  }
  .key:active { transform: scale(0.93); }
  .keys .key:nth-child(1) { animation-delay: 0ms; }
  .keys .key:nth-child(2) { animation-delay: 25ms; }
  .keys .key:nth-child(3) { animation-delay: 50ms; }
  .keys .key:nth-child(4) { animation-delay: 75ms; }
  .keys .key:nth-child(n + 5) { animation-delay: 110ms; }
  @keyframes key-in {
    from { opacity: 0; transform: translateY(14px) scale(0.96); }
    to { opacity: 1; transform: none; }
  }
  .badge-row {
    display: flex;
    justify-content: center;
    padding-top: 12px;
  }
  .sheet-backdrop {
    position: fixed;
    inset: 0;
    border: none;
    padding: 0;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
    animation: fade-in 160ms ease;
  }
  .sheet {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 0;
    width: 100%;
    max-width: 430px;
    max-height: 62dvh;
    display: flex;
    flex-direction: column;
    background: #14141b;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    animation: sheet-up 220ms cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 10;
  }
  @keyframes sheet-up {
    from { transform: translate(-50%, 40px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  .history-list {
    overflow-y: auto;
    padding: 4px 12px calc(env(safe-area-inset-bottom, 0px) + 16px);
  }
  .empty {
    text-align: center;
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.9rem;
    padding: 28px 0;
  }
  .history-item {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    padding: 12px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    text-align: right;
    transition: background 120ms;
    border-radius: 8px;
  }
  .history-item:hover { background: rgba(255, 255, 255, 0.05); }
  .history-item:active { transform: scale(0.99); }
  .history-expr { font-size: 0.8rem; color: rgba(255, 255, 255, 0.42); font-variant-numeric: tabular-nums; }
  .history-result { font-size: 1.3rem; font-weight: 600; color: #fff; font-variant-numeric: tabular-nums; }
  @media (prefers-reduced-motion: reduce) {
    .key, .sheet, .sheet-backdrop { animation: none; }
  }
</style>
