// Fill-back: put the real details back into text that came from the cloud.
// Runs on the device; the map never leaves it.

/**
 * Cloud models do not always copy a placeholder exactly: [name_1], [NAME 1],
 * {NAME_1} and **[NAME_1]** all happen. Accept those, and report any
 * placeholder-looking token that is not in the map so the user can see it.
 * `wrap` lets the screen mark each restored value (it gets the value and its placeholder).
 * @returns {{text:string, used:string[], unknown:string[]}}
 */
export function fillBack(text, map, { wrap = (v) => v } = {}) {
  const lookup = new Map();
  for (const [ph, value] of Object.entries(map)) lookup.set(keyOf(ph), { ph, value });
  const used = new Set();
  const unknown = new Set();
  const out = String(text ?? '').replace(/[\[{<]\s*([A-Za-z][A-Za-z _-]*?)[ _-]?(\d+)\s*[\]}>]/g, (whole, kind, n) => {
    const hit = lookup.get(keyOf(`${kind}_${n}`));
    if (hit) {
      used.add(hit.ph);
      return wrap(hit.value, hit.ph);
    }
    if (/^[A-Z][A-Z _-]*$/.test(kind)) unknown.add(whole);
    return whole;
  });
  return { text: out, used: [...used], unknown: [...unknown] };
}

function keyOf(s) {
  return s.replace(/[\[\]{}<>]/g, '').replace(/[\s-]+/g, '_').replace(/_+/g, '_').toUpperCase();
}

/** Apply fillBack to every string inside a JSON-like value. */
export function fillBackDeep(value, map) {
  const unknown = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      const r = fillBack(v, map);
      r.unknown.forEach((u) => unknown.add(u));
      return r.text;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(value), unknown: [...unknown] };
}
