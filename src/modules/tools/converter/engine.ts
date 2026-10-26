// Port of the [mustang_converter] script (WPCode snippet 2748). Same constants, formulas,
// formatting and localStorage keys as the live site; scoped to a root element.

export const UNITS: Record<string, number> = {
  Hundred: 1e2,
  Thousand: 1e3,
  Lakh: 1e5,
  Million: 1e6,
  Crore: 1e7,
  Billion: 1e9,
  Arab: 1e9, // alias to Billion in practice
  Kharab: 1e11,
  Trillion: 1e12,
};
const UNIT_ORDER_WEST = ["Trillion", "Billion", "Million", "Thousand", "Hundred"];
const UNIT_ORDER_IND = ["Kharab", "Arab", "Crore", "Lakh", "Thousand", "Hundred"];
const ALL_UNITS = ["Hundred", "Thousand", "Lakh", "Million", "Crore", "Billion", "Arab", "Kharab", "Trillion"];

export const AREA: Record<string, number> = {
  "Square meter (m²)": 1,
  "Square kilometer (km²)": 1_000_000,
  "Hectare (ha)": 10_000,
  Acre: 4046.8564224,
  "Square foot (ft²)": 0.09290304,
  "Square yard (yd²)": 0.83612736,
  "Square inch (in²)": 0.00064516,
  // Nepal – Hilly
  Ropani: 508.737,
  Aana: 508.737 / 16,
  Paisa: 508.737 / 64,
  Dam: 508.737 / 256,
  // Nepal – Terai
  Bigha: 6772.63,
  Kattha: 6772.63 / 20,
  Dhur: 6772.63 / 400,
};
const AREA_LIST = [
  "Square meter (m²)", "Square kilometer (km²)", "Hectare (ha)", "Acre",
  "Square foot (ft²)", "Square yard (yd²)", "Square inch (in²)",
  "Ropani", "Aana", "Paisa", "Dam",
  "Bigha", "Kattha", "Dhur",
];
const PREF_ORDER_AREA = [
  "Square kilometer (km²)", "Hectare (ha)", "Acre", "Square meter (m²)",
  "Bigha", "Ropani", "Kattha", "Aana", "Dhur", "Paisa", "Dam", "Square foot (ft²)", "Square yard (yd²)",
];

const LS = {
  round: "mmc_round",
  indian: "mmc_indian",
  rate: "mmc_rate",
  numFrom: "mmc_num_from",
  numTo: "mmc_num_to",
  curFromUnit: "mmc_cur_unit_from",
  curToUnit: "mmc_cur_unit_to",
  curFromCur: "mmc_cur_from",
  curToCur: "mmc_cur_to",
  areaFrom: "mmc_area_from",
  areaTo: "mmc_area_to",
};

export function formatIndian(x: number, dp: number) {
  const parts = Number(x).toFixed(dp).split(".");
  const n = parts[0];
  const dec = parts[1] ? "." + parts[1] : "";
  const last3 = n.slice(-3);
  const rest = n.slice(0, -3);
  const restFmt = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (rest ? restFmt + "," : "") + last3 + dec;
}
export function formatWestern(x: number, dp: number) {
  return Number(x).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
const formatAuto = (x: number, dp: number, indianPrefer: boolean) => (indianPrefer ? formatIndian(x, dp) : formatWestern(x, dp));

function saveLS(k: string, v: unknown) {
  try {
    localStorage.setItem(k, String(v));
  } catch {}
}
function readLS(k: string, f: string) {
  try {
    const v = localStorage.getItem(k);
    return v === null ? f : v;
  } catch {
    return f;
  }
}

/** Wires up the converter inside `root` (markup from CONVERTER_HTML). Returns a cleanup fn. */
export function initConverter(root: HTMLElement): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const inp = (sel: string) => $<HTMLInputElement>(sel);
  const sel = (sel: string) => $<HTMLSelectElement>(sel);
  const ac = new AbortController();
  const on = (el: EventTarget | null, ev: string, fn: (e: Event) => void) => el?.addEventListener(ev, fn, { signal: ac.signal });
  const timers: ReturnType<typeof setTimeout>[] = [];

  const result = (id: string) => ({
    box: $(`#${id}`),
    primary: $(`#${id} .primary`),
    secondary: $(`#${id} .secondary`),
    formula: $(`#${id} .formula`),
    chips: $(`#${id} .chips`),
  });

  function fillUnitSelect(s: HTMLSelectElement, list: string[], defaultVal?: string) {
    s.innerHTML = list.map((u) => `<option>${u}</option>`).join("");
    if (defaultVal && list.includes(defaultVal)) s.value = defaultVal;
  }
  function bestUnit(value: number, preferIndian = false) {
    const order = preferIndian ? UNIT_ORDER_IND : UNIT_ORDER_WEST;
    for (const u of order) if (value >= UNITS[u]) return { unit: u, value: value / UNITS[u] };
    return { unit: "Hundred", value: value / UNITS.Hundred };
  }
  const getDp = () => Number(sel("#mmc-round")?.value || 2);
  function preferIndianFormat(target: string) {
    const isOn = inp("#mmc-indian")?.checked;
    if (!isOn) return false;
    return new Set(["Lakh", "Crore", "Arab", "Kharab", "NPR"]).has(target);
  }

  const num = {
    input: inp("#mmc-num-input"),
    from: sel("#mmc-num-from"),
    to: sel("#mmc-num-to"),
    swap: $("#mmc-num-swap"),
    convert: $("#mmc-num-convert"),
    copy: $("#mmc-num-copy"),
    reset: $("#mmc-num-reset"),
    ...result("mmc-num-result"),
  };
  const cur = {
    rate: inp("#mmc-rate"),
    amt: inp("#mmc-amt"),
    uf: sel("#mmc-curr-unit-from"),
    ut: sel("#mmc-curr-unit-to"),
    cf: sel("#mmc-curr-currency-from"),
    ct: sel("#mmc-curr-currency-to"),
    swap: $("#mmc-curr-swap"),
    convert: $("#mmc-curr-convert"),
    copy: $("#mmc-curr-copy"),
    reset: $("#mmc-curr-reset"),
    ...result("mmc-curr-result"),
  };
  const area = {
    amt: inp("#mmc-area-amt"),
    from: sel("#mmc-area-from"),
    to: sel("#mmc-area-to"),
    swap: $("#mmc-area-swap"),
    convert: $("#mmc-area-convert"),
    copy: $("#mmc-area-copy"),
    reset: $("#mmc-area-reset"),
    ...result("mmc-area-result"),
    rp: inp("#mmc-rp"),
    an: inp("#mmc-an"),
    pa: inp("#mmc-pa"),
    da: inp("#mmc-da"),
    bi: inp("#mmc-bi"),
    ka: inp("#mmc-ka"),
    dh: inp("#mmc-dh"),
    useHilly: $("#mmc-use-hilly"),
    useTerai: $("#mmc-use-terai"),
  };

  // INIT SELECTS + RESTORE STATE
  fillUnitSelect(num.from, ALL_UNITS, readLS(LS.numFrom, "Million"));
  fillUnitSelect(num.to, ALL_UNITS, readLS(LS.numTo, "Crore"));
  fillUnitSelect(cur.uf, ALL_UNITS, readLS(LS.curFromUnit, "Million"));
  fillUnitSelect(cur.ut, ALL_UNITS, readLS(LS.curToUnit, "Lakh"));
  cur.cf.value = readLS(LS.curFromCur, "AUD");
  cur.ct.value = readLS(LS.curToCur, "NPR");
  fillUnitSelect(area.from, AREA_LIST, readLS(LS.areaFrom, "Square meter (m²)"));
  fillUnitSelect(area.to, AREA_LIST, readLS(LS.areaTo, "Acre"));
  const savedRound = readLS(LS.round, "2");
  const savedIndian = readLS(LS.indian, "true") === "true";
  sel("#mmc-round").value = savedRound;
  inp("#mmc-indian").checked = savedIndian;
  const savedRate = readLS(LS.rate, "");
  if (savedRate) cur.rate.value = savedRate;

  // Persist
  on(sel("#mmc-round"), "change", (e) => saveLS(LS.round, (e.target as HTMLSelectElement).value));
  on(inp("#mmc-indian"), "change", (e) => saveLS(LS.indian, (e.target as HTMLInputElement).checked));
  on(cur.rate, "input", (e) => saveLS(LS.rate, (e.target as HTMLInputElement).value));
  // The original compared the Event with the <select> (always false), so every change was
  // persisted to the "to" key; fixed here so each select restores its own value.
  [num.from, num.to].forEach((el) => on(el, "change", (e) => saveLS(el === num.from ? LS.numFrom : LS.numTo, (e.target as HTMLSelectElement).value)));
  [cur.uf, cur.ut].forEach((el) => on(el, "change", (e) => saveLS(el === cur.uf ? LS.curFromUnit : LS.curToUnit, (e.target as HTMLSelectElement).value)));
  [cur.cf, cur.ct].forEach((el) => on(el, "change", (e) => saveLS(el === cur.cf ? LS.curFromCur : LS.curToCur, (e.target as HTMLSelectElement).value)));
  [area.from, area.to].forEach((el) => on(el, "change", (e) => saveLS(el === area.from ? LS.areaFrom : LS.areaTo, (e.target as HTMLSelectElement).value)));

  /* ===================== CORE: NUMBERING & CURRENCY ===================== */
  function convertNumbering() {
    const v = parseFloat(num.input.value);
    if (isNaN(v)) return;
    const from = num.from.value,
      to = num.to.value;
    const abs = v * (UNITS[from] || 1);
    const res = abs / (UNITS[to] || 1);
    const dp = getDp();
    const preferIndian = preferIndianFormat(to);
    const out = formatAuto(res, dp, preferIndian);
    num.primary.textContent = `${out} ${to}`;
    const best = bestUnit(abs, preferIndian);
    num.secondary.textContent = `≈ ${formatAuto(best.value, dp, preferIndian)} ${best.unit}`;
    num.formula.textContent = `Formula: ${v} × ${UNITS[from].toLocaleString("en-US")} ÷ ${UNITS[to].toLocaleString("en-US")} = ${res.toFixed(dp)}`;
    num.chips.innerHTML = `
        <span class="mm-chip">Base: ${formatAuto(abs, dp, preferIndian)} units</span>
        <span class="mm-chip">Best fit: ${best.unit}</span>
        <span class="mm-chip">Rounding: ${dp} dp</span>
        <span class="mm-chip">${preferIndian ? "Indian" : "Western"} grouping</span>`;
    num.box.style.display = "block";
  }
  function convertCurrency() {
    const rate = parseFloat(cur.rate.value),
      amt = parseFloat(cur.amt.value);
    if (isNaN(rate) || isNaN(amt)) return;
    const uf = cur.uf.value,
      ut = cur.ut.value,
      cf = cur.cf.value,
      ct = cur.ct.value;
    let base = amt * (UNITS[uf] || 1);
    if (cf === "AUD" && ct === "NPR") base *= rate;
    if (cf === "NPR" && ct === "AUD") base /= rate;
    const res = base / (UNITS[ut] || 1);
    const dp = getDp();
    const preferIndian = preferIndianFormat(ct) || preferIndianFormat(ut);
    const out = formatAuto(res, dp, preferIndian);
    cur.primary.textContent = `${out} ${ct} ${ut}`;
    const autoOrder = ct === "AUD" ? UNIT_ORDER_WEST : UNIT_ORDER_IND;
    const best = (() => {
      for (const u of autoOrder) if (base >= UNITS[u]) return { unit: u, value: base / UNITS[u] };
      return { unit: "Hundred", value: base / UNITS.Hundred };
    })();
    cur.secondary.textContent = `≈ ${formatAuto(best.value, dp, preferIndian)} ${ct} ${best.unit}`;
    cur.formula.textContent = `Formula: (${amt} × ${uf}) → ${cf} → ${ct} @ rate ${rate} → ÷ ${ut} = ${res.toFixed(dp)}`;
    cur.chips.innerHTML = `
        <span class="mm-chip">Rate: 1 AUD = ${formatWestern(rate, 4)} NPR</span>
        <span class="mm-chip">Best fit: ${best.unit}</span>
        <span class="mm-chip">Rounding: ${dp} dp</span>
        <span class="mm-chip">${preferIndian ? "Indian" : "Western"} grouping</span>`;
    cur.box.style.display = "block";
  }

  /* ===================== CORE: AREA ===================== */
  function areaBestFit(m2: number) {
    for (const u of PREF_ORDER_AREA) if (m2 >= AREA[u]) return { unit: u, value: m2 / AREA[u] };
    return { unit: "Square meter (m²)", value: m2 };
  }
  function breakdownHilly(m2: number) {
    const ro = Math.floor(m2 / AREA.Ropani);
    m2 -= ro * AREA.Ropani;
    const an = Math.floor(m2 / AREA.Aana);
    m2 -= an * AREA.Aana;
    const pa = Math.floor(m2 / AREA.Paisa);
    m2 -= pa * AREA.Paisa;
    const da = Math.round(m2 / AREA.Dam);
    return { ro, an, pa, da };
  }
  function breakdownTerai(m2: number) {
    const bi = Math.floor(m2 / AREA.Bigha);
    m2 -= bi * AREA.Bigha;
    const ka = Math.floor(m2 / AREA.Kattha);
    m2 -= ka * AREA.Kattha;
    const dh = Math.round(m2 / AREA.Dhur);
    return { bi, ka, dh };
  }
  function convertArea() {
    const amt = parseFloat(area.amt.value);
    if (isNaN(amt)) return;
    const from = area.from.value,
      to = area.to.value;
    const baseM2 = amt * (AREA[from] || 1);
    const res = baseM2 / (AREA[to] || 1);
    const dp = getDp();
    area.primary.textContent = `${formatWestern(res, dp)} ${to}`;
    const best = areaBestFit(baseM2);
    area.secondary.textContent = `≈ ${formatWestern(best.value, dp)} ${best.unit}`;
    area.formula.textContent = `Formula: ${amt} × ${from} → ${baseM2.toFixed(6)} m² → ÷ ${to} = ${res.toFixed(dp)} ${to}`;
    const h = breakdownHilly(baseM2),
      t = breakdownTerai(baseM2);
    area.chips.innerHTML = `
        <span class="mm-chip">Base: ${formatWestern(baseM2, 4)} m²</span>
        <span class="mm-chip">Hilly: ${h.ro} Ro ${h.an} Aa ${h.pa} Pa ${h.da} Dam</span>
        <span class="mm-chip">Terai: ${t.bi} Bi ${t.ka} Ka ${t.dh} Dh</span>
        <span class="mm-chip">Rounding: ${dp} dp</span>`;
    area.box.style.display = "block";
  }

  on(area.useHilly, "click", () => {
    const ro = +area.rp.value || 0,
      an = +area.an.value || 0,
      pa = +area.pa.value || 0,
      da = +area.da.value || 0;
    const totalM2 = ro * AREA.Ropani + an * AREA.Aana + pa * AREA.Paisa + da * AREA.Dam;
    area.amt.value = totalM2.toFixed(4);
    area.from.value = "Square meter (m²)";
    saveLS(LS.areaFrom, area.from.value);
    convertArea();
    updateFloat(area.amt);
  });
  on(area.useTerai, "click", () => {
    const bi = +area.bi.value || 0,
      ka = +area.ka.value || 0,
      dh = +area.dh.value || 0;
    const totalM2 = bi * AREA.Bigha + ka * AREA.Kattha + dh * AREA.Dhur;
    area.amt.value = totalM2.toFixed(4);
    area.from.value = "Square meter (m²)";
    saveLS(LS.areaFrom, area.from.value);
    convertArea();
    updateFloat(area.amt);
  });

  /* ===================== EVENTS / WIRING ===================== */
  function debounce(fn: () => void, ms: number) {
    let t: ReturnType<typeof setTimeout> | undefined;
    return () => {
      if (t) clearTimeout(t);
      t = setTimeout(fn, ms);
      timers.push(t);
    };
  }
  async function copyResult(r: { primary: HTMLElement; secondary: HTMLElement }, btn: HTMLElement) {
    const text = `${r.primary.textContent} | ${r.secondary.textContent}`;
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied!";
      timers.push(setTimeout(() => (btn.textContent = "Copy Result"), 1000));
    } catch {
      alert("Copy failed");
    }
  }
  const debNum = debounce(convertNumbering, 150),
    debCur = debounce(convertCurrency, 150),
    debArea = debounce(convertArea, 150);
  const enter = (fn: () => void) => (e: Event) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  // Numbering
  on(num.convert, "click", convertNumbering);
  on(num.swap, "click", () => {
    const a = num.from.value;
    num.from.value = num.to.value;
    num.to.value = a;
    saveLS(LS.numFrom, num.from.value);
    saveLS(LS.numTo, num.to.value);
    convertNumbering();
  });
  on(num.reset, "click", () => {
    num.input.value = "";
    num.box.style.display = "none";
    updateFloat(num.input);
  });
  on(num.copy, "click", () => void copyResult(num, num.copy));
  on(num.input, "input", debNum);
  [num.from, num.to].forEach((el) => on(el, "change", debNum));
  on(sel("#mmc-round"), "change", () => {
    debNum();
    debCur();
    debArea();
  });
  on(inp("#mmc-indian"), "change", () => {
    debNum();
    debCur();
  });
  on(num.input, "keydown", enter(convertNumbering));

  // Currency
  on(cur.convert, "click", convertCurrency);
  on(cur.swap, "click", () => {
    const cf = cur.cf.value,
      ct = cur.ct.value;
    cur.cf.value = ct;
    cur.ct.value = cf;
    const uf = cur.uf.value,
      ut = cur.ut.value;
    cur.uf.value = ut;
    cur.ut.value = uf;
    saveLS(LS.curFromCur, cur.cf.value);
    saveLS(LS.curToCur, cur.ct.value);
    saveLS(LS.curFromUnit, cur.uf.value);
    saveLS(LS.curToUnit, cur.ut.value);
    convertCurrency();
  });
  on(cur.reset, "click", () => {
    cur.amt.value = "";
    cur.box.style.display = "none";
    updateFloat(cur.amt);
  });
  on(cur.copy, "click", () => void copyResult(cur, cur.copy));
  on(cur.rate, "input", debCur);
  on(cur.amt, "input", debCur);
  [cur.uf, cur.ut, cur.cf, cur.ct].forEach((el) => on(el, "change", debCur));
  on(cur.amt, "keydown", enter(convertCurrency));

  // Area
  on(area.convert, "click", convertArea);
  on(area.swap, "click", () => {
    const a = area.from.value;
    area.from.value = area.to.value;
    area.to.value = a;
    saveLS(LS.areaFrom, area.from.value);
    saveLS(LS.areaTo, area.to.value);
    convertArea();
  });
  on(area.reset, "click", () => {
    area.amt.value = "";
    area.box.style.display = "none";
    updateFloat(area.amt);
  });
  on(area.copy, "click", () => void copyResult(area, area.copy));
  on(area.amt, "input", debArea);
  on(area.from, "change", debArea);
  on(area.to, "change", debArea);
  on(area.amt, "keydown", enter(convertArea));

  if (num.input.value) convertNumbering();
  if (cur.amt.value) convertCurrency();
  if (area.amt.value) convertArea();

  /* ===== floating labels (second script of the snippet) ===== */
  function updateFloat(i: HTMLInputElement) {
    const wrap = i.closest(".mm-field");
    if (!wrap) return;
    const hasVal = i.type === "number" ? i.value !== "" && !isNaN(Number(i.value)) : i.value.trim() !== "";
    wrap.classList.toggle("floated", hasVal || document.activeElement === i);
  }
  root.querySelectorAll<HTMLInputElement>(".mm-field .mm-input").forEach((i) => {
    ["input", "change", "blur", "focus"].forEach((evt) => on(i, evt, () => updateFloat(i)));
    updateFloat(i);
    timers.push(setTimeout(() => updateFloat(i), 250));
  });

  return () => {
    ac.abort();
    timers.forEach(clearTimeout);
  };
}
