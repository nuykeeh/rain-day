// 튜닝 패널 — F3 또는 ?tune=1. 디자이너가 코드를 안 열고 수치를 바꾼다. (PRD 8.2)
// 캔버스가 아니라 DOM 으로 만든다. 슬라이더 조작이 훨씬 정확하다.

import { CFG, DEFAULTS, TUNABLES, getByPath, setByPath, saveTuning, resetTuning, collectOverrides } from '../config.js';
import { S } from '../strings.js';

const CSS = `
.rain-tune{position:absolute;top:0;right:0;width:392px;height:100%;overflow-y:auto;
  background:rgba(12,12,16,.92);color:#C0C0C6;font:13px/1.45 system-ui,-apple-system,sans-serif;
  padding:14px 16px 40px;box-sizing:border-box;backdrop-filter:blur(6px);
  border-left:1px solid rgba(95,217,206,.25);z-index:20;cursor:auto}
.rain-tune h2{margin:0 0 10px;font-size:15px;color:#5FD9CE;font-weight:800}
.rain-tune .note{font-size:11px;color:#6E6E78;margin:0 0 14px;line-height:1.5}
.rain-tune h3{margin:16px 0 6px;font-size:12px;color:#E8B04B;font-weight:700;
  border-bottom:1px solid rgba(232,176,75,.2);padding-bottom:4px}
.rain-tune .row{margin:7px 0}
.rain-tune .lab{display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px}
.rain-tune .val{color:#F2F2F5;font-weight:700;font-variant-numeric:tabular-nums}
.rain-tune input[type=range]{width:100%;accent-color:#5FD9CE;height:18px;margin:0}
.rain-tune .btns{display:flex;gap:8px;margin-top:16px;position:sticky;bottom:0;
  background:rgba(12,12,16,.95);padding:10px 0}
.rain-tune button{flex:1;padding:9px;border-radius:8px;border:1px solid rgba(95,217,206,.45);
  background:rgba(95,217,206,.12);color:#5FD9CE;font-weight:700;cursor:pointer;font-size:12px}
.rain-tune button.warn{border-color:rgba(232,176,75,.45);background:rgba(232,176,75,.12);color:#E8B04B}
.rain-tune button:hover{filter:brightness(1.3)}
`;

export class TunePanel {
  constructor(root, onChange = () => {}) {
    this.root = root;
    this.onChange = onChange;
    this.el = null;
    this.rows = [];
    this.visible = false;

    if (!document.getElementById('rain-tune-css')) {
      const st = document.createElement('style');
      st.id = 'rain-tune-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
  }

  toggle() { this.visible ? this.hide() : this.show(); }

  show() {
    if (!this.el) this.build();
    this.el.style.display = 'block';
    this.visible = true;
    this.sync();
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
    this.visible = false;
  }

  build() {
    const el = document.createElement('div');
    el.className = 'rain-tune';
    el.innerHTML = `<h2>${S.tune.title}</h2><p class="note">${S.tune.note}</p>`;

    for (const g of TUNABLES) {
      const h = document.createElement('h3');
      h.textContent = g.group;
      el.appendChild(h);
      for (const item of g.items) {
        const row = document.createElement('div');
        row.className = 'row';
        const lab = document.createElement('div');
        lab.className = 'lab';
        const name = document.createElement('span');
        name.textContent = item.label;
        const val = document.createElement('span');
        val.className = 'val';
        lab.append(name, val);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = item.min;
        input.max = item.max;
        input.step = item.step;
        input.value = getByPath(CFG, item.path);

        const show = () => {
          const v = Number(input.value);
          val.textContent = `${Number.isInteger(item.step) ? v : v.toFixed(2)}${item.unit ? ` ${item.unit}` : ''}`;
        };
        input.addEventListener('input', () => {
          setByPath(CFG, item.path, Number(input.value));
          show();
          saveTuning();
          this.onChange(item.path);
        });
        show();

        row.append(lab, input);
        el.appendChild(row);
        this.rows.push({ item, input, show });
      }
    }

    const btns = document.createElement('div');
    btns.className = 'btns';
    const copy = document.createElement('button');
    copy.textContent = S.tune.copy;
    copy.addEventListener('click', async () => {
      const json = JSON.stringify(collectOverrides(), null, 2);
      try { await navigator.clipboard.writeText(json); } catch { console.log(json); }
      copy.textContent = S.tune.copied;
      setTimeout(() => { copy.textContent = S.tune.copy; }, 1200);
    });
    const reset = document.createElement('button');
    reset.className = 'warn';
    reset.textContent = S.tune.reset;
    reset.addEventListener('click', () => {
      resetTuning();
      this.sync();
      this.onChange('*');
    });
    btns.append(copy, reset);
    el.appendChild(btns);

    // 패널 위에서는 게임 키가 먹지 않게 한다
    el.addEventListener('keydown', (e) => e.stopPropagation());
    this.root.appendChild(el);
    this.el = el;
  }

  sync() {
    for (const r of this.rows) {
      r.input.value = getByPath(CFG, r.item.path);
      r.show();
    }
  }
}

export { DEFAULTS };
