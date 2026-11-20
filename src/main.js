// The screen. All decisions about what may be sent live in core/pipeline.js;
// this file only draws state and wires buttons.

import { createSession, LeakError } from './core/pipeline.js';
import { fillBack } from './core/fillback.js';
import { deadlineLabel, daysUntil } from './core/dates.js';
import { createFirebaseAI } from './ai/firebase.js';
import { createMockAI } from './ai/mock.js';
import { LETTERS } from '../eval/letters.js';

const env = import.meta.env;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function readConfig() {
  if (!env.VITE_FIREBASE_CONFIG) return null;
  try {
    return JSON.parse(env.VITE_FIREBASE_CONFIG);
  } catch {
    console.error('VITE_FIREBASE_CONFIG is not valid JSON; running without the cloud step.');
    return null;
  }
}

const config = readConfig();
const ai = createFirebaseAI({
  config,
  appCheck: {
    siteKey: env.VITE_APPCHECK_SITE_KEY || '',
    enterprise: env.VITE_APPCHECK_ENTERPRISE === '1',
    debugToken: env.VITE_APPCHECK_DEBUG_TOKEN || (env.DEV && config ? true : ''),
  },
  cloudModel: env.VITE_CLOUD_MODEL || '',
  cloudStandIn: config ? null : createMockAI({ source: 'demo' }),
});
const session = createSession(ai);
let showPlaceholders = false;

// For automated checks of this page (tests drive it from outside).
window.__plainLetter = { ai, session, letters: LETTERS, prepareImage: (f) => prepareImage(f) };

// ---------- status ----------

async function drawStatus() {
  const s = await ai.onDeviceStatus();
  const device = {
    available: ['ok', 'On-device model: ready'],
    downloadable: ['mid', 'On-device model: not downloaded yet (about 4 GB, once)'],
    downloading: ['mid', 'On-device model: downloading'],
    unavailable: ['mid', 'On-device model: not in this browser (basic hiding only)'],
  }[s] || ['mid', `On-device model: ${s}`];
  const cloud = ai.hasCloud ? ['ok', 'Cloud step: connected'] : ['mid', 'Cloud step: not connected (demo answer)'];
  $('status').innerHTML = [device, cloud].map(([c, t]) => `<span class="pill ${c}">${esc(t)}</span>`).join('');
  return s;
}

// ---------- step 1 ----------

// A photo is read into text by the on-device model and by nothing else. With
// no on-device model the button is switched off: there is no cloud path for a
// photo, because a photo cannot have its details hidden first.
const PHOTO_MAX_SIDE = 1600;

/** Scale a chosen image down in this browser and return it as base64 JPEG. */
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return { mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.92).split(',')[1], width: canvas.width, height: canvas.height };
}

async function downloadModel() {
  $('download').hidden = false;
  $('downloadText').textContent = 'Getting the on-device model. This happens once.';
  try {
    await ai.prepare((p) => {
      $('downloadBar').value = p;
      $('downloadText').textContent = `Getting the on-device model: ${Math.round(p * 100)}%`;
    });
  } catch (e) {
    console.warn('On-device model could not be prepared', e);
  }
  $('download').hidden = true;
  await drawStatus();
}

async function drawPhoto() {
  const s = await ai.photoStatus();
  const off = s === 'unavailable';
  $('photoButton').disabled = off;
  $('photoButton').classList.toggle('off', off);
  if (off) $('photoNote').textContent = 'Photos need the on-device model, which this browser does not have. A photo is never sent to the cloud, so type or paste the text instead.';
}

$('photoButton').onclick = () => $('photo').click();
$('photo').onchange = () =>
  busy($('photoButton'), 'Reading on this device…', async () => {
    const file = $('photo').files[0];
    $('photo').value = '';
    if (!file) return;
    $('photoNote').className = 'note';
    $('photoNote').textContent = '';
    try {
      if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error('Choose a JPEG or PNG picture.');
      const status = await ai.onDeviceStatus();
      if (status === 'downloadable' || status === 'downloading') await downloadModel();
      const image = await prepareImage(file);
      const t0 = performance.now();
      const text = await session.readPhoto(image);
      $('letter').value = text;
      $('photoNote').textContent = `Read on this device in ${((performance.now() - t0) / 1000).toFixed(1)} s. The photo was not sent anywhere. Check the text against the paper, numbers above all, and correct it before you go on.`;
      $('letter').focus();
    } catch (e) {
      $('photoNote').className = 'err';
      $('photoNote').textContent = `The photo could not be read (${e.message}). Nothing was sent. You can type or paste the text instead.`;
    }
    drawLedger();
  });

for (const l of LETTERS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = l.title;
  b.dataset.sample = l.id;
  b.onclick = () => {
    $('letter').value = l.text;
    $('letter').focus();
  };
  $('samples').append(b);
}

async function busy(button, label, fn) {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = old;
    // Disabling a focused button drops keyboard focus to <body>; give it back unless fn moved it on purpose.
    if (!document.activeElement || document.activeElement === document.body) button.focus();
  }
}

// Show a step: scroll to it (no smooth scroll when reduced motion is asked for) and move keyboard and
// screen-reader focus to its heading, so the next Tab continues inside the new step.
function reveal(stepId) {
  const step = $(stepId);
  step.hidden = false;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  step.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  const heading = step.querySelector('h2');
  if (heading) heading.focus({ preventScroll: true });
}

$('analyse').onclick = () =>
  busy($('analyse'), 'Working on this device…', async () => {
    const letter = $('letter').value.trim();
    $('analyseNote').textContent = '';
    if (letter.length < 40) {
      $('analyseNote').textContent = 'Paste the letter first (or pick a made-up one above).';
      return;
    }
    const status = await ai.onDeviceStatus();
    if (status === 'downloadable' || status === 'downloading') await downloadModel();
    const t0 = performance.now();
    await session.analyse(letter);
    session.state.ms = Math.round(performance.now() - t0);
    $('step3').hidden = true;
    drawStep2();
    reveal('step2');
  });

// ---------- step 2 ----------

function chips(text, map) {
  const keys = Object.keys(map);
  if (!keys.length) return esc(text);
  const re = new RegExp('(' + keys.map((k) => k.replace(/[[\]]/g, '\\$&')).join('|') + ')', 'g');
  return text
    .split(re)
    .map((part) => (map[part] !== undefined ? `<span class="ph">${esc(part)}</span>` : esc(part)))
    .join('');
}

const SOURCE_LABEL = { model: 'on-device model', pattern: 'pattern check', you: 'you' };

function drawStep2() {
  const st = session.state;
  const r = st.redaction;
  const secs = st.ms ? ` in ${(st.ms / 1000).toFixed(1)} s` : '';
  if (st.level === 'model+patterns') {
    $('level').className = 'level';
    $('level').textContent = `Checked on this device${secs} by the on-device model and by the pattern check. Nothing has been sent.`;
  } else {
    $('level').className = 'level basic';
    $('level').textContent = `Basic hiding only: this browser has no on-device model, so only the pattern check ran${secs}. It finds reference numbers, postcodes and titled names, but can miss a name or an address line. Read the text below before you send it. Nothing has been sent.`;
  }

  const f = st.facts;
  const facts = [];
  if (f) {
    if (f.letter_type) facts.push(['What it is', f.letter_type]);
    if (f.sender) facts.push(['From', f.sender]);
    if (f.amount) facts.push(['Amount', f.amount]);
    if (f.deadline) {
      const label = deadlineLabel(f.deadline);
      const n = daysUntil(f.deadline);
      facts.push(['Key date', f.deadline, label, n !== null && n > 14]);
    }
  }
  $('facts').innerHTML = facts.map(([k, v, extra, calm]) => `<div class="fact"><b>${esc(k)}</b><span>${esc(v)}</span>${extra ? `<em class="${calm ? 'calm' : ''}">${esc(extra)}</em>` : ''}</div>`).join('');

  $('redacted').innerHTML = chips(r.redacted, r.map);
  $('foundCount').textContent = `${r.entities.length} detail${r.entities.length === 1 ? '' : 's'} hidden (the list stays on this device)`;
  $('entities').innerHTML = r.entities
    .map((e) => `<tr><td><span class="ph">${esc(e.placeholder)}</span></td><td>${esc(e.text)}${e.count > 1 ? ` <small>×${e.count}</small>` : ''}</td><td>${esc(e.sources.map((s) => SOURCE_LABEL[s] || s).join(' + '))}</td></tr>`)
    .join('');
  const un = r.unlocated;
  $('unlocated').hidden = !un.length;
  $('unlocated').textContent = un.length ? `Listed but not found word for word in the letter, so not hidden: ${un.map((u) => `"${u.text}"`).join(', ')}. If you can see it in the text above, type it in the box below.` : '';
  const noModel = st.level !== 'model+patterns';
  $('explainLocal').disabled = noModel;
  $('explainLocal').classList.toggle('off', noModel);
  $('explainLocal').title = noModel ? 'Needs the on-device model, which did not run in this browser.' : '';
  $('explain').textContent = ai.hasCloud ? 'Explain it and draft a reply' : 'Explain it and draft a reply (demo answer)';
  $('explainNote').textContent = ai.hasCloud
    ? 'The first button sends the text above, and only that text, to the cloud model.'
    : 'No cloud model is connected in this build. The first button shows a fixed demo answer; the text above is not sent anywhere.';
  drawLedger();
}

$('addForm').onsubmit = (ev) => {
  ev.preventDefault();
  const term = $('addTerm').value.trim();
  if (!term) return;
  session.addTerm(term);
  $('addTerm').value = '';
  $('step3').hidden = true;
  drawStep2();
};

async function runExplain(button, neverSend) {
  await busy(button, neverSend ? 'Working on this device…' : 'Sending the hidden version…', async () => {
    $('explainNote').className = 'note';
    try {
      const t0 = performance.now();
      await session.explain({ neverSend });
      session.state.explanation.ms = Math.round(performance.now() - t0);
      drawStep3();
      reveal('step3');
    } catch (e) {
      $('explainNote').className = 'err';
      $('explainNote').textContent =
        e instanceof LeakError
          ? `Not sent. ${e.leaks.length} hidden detail(s) could still be read in the text: ${e.leaks.map((l) => l.placeholder).join(', ')}. Nothing left this device.`
          : neverSend
            ? `The on-device model could not answer (${e.message}). Nothing was sent.`
            : `No answer came back (${e.message}). You can try again, or stay on this device.`;
    }
    drawLedger();
  });
}
$('explain').onclick = () => runExplain($('explain'), false);
$('explainLocal').onclick = () => runExplain($('explainLocal'), true);

// ---------- step 3 ----------

const SOURCE_TEXT = {
  cloud: 'Written by the cloud model from the hidden version of your letter.',
  'on-device': 'Written by the on-device model. Nothing was sent. This is the basic answer: shorter and less thorough than the cloud one.',
  demo: 'Fixed demo answer (no cloud model connected). Nothing was sent.',
};

function drawStep3() {
  const ex = session.state.explanation;
  const map = session.state.redaction.map;
  const show = (s) => {
    const escaped = esc(s);
    if (showPlaceholders) return chips(s, map);
    return fillBack(escaped, map, { wrap: (v) => `<span class="back">${esc(v)}</span>` }).text;
  };
  const a = ex.redacted;
  const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${show(i)}</li>`).join('')}</ul>` : '<p class="note">Nothing listed.</p>');
  $('answer').innerHTML = `
    ${ex.source === 'demo' ? `<div class="demo">${esc(SOURCE_TEXT.demo)}</div>` : ''}
    <p class="summary">${show(a.summary)}</p>
    ${ex.source === 'demo' ? '' : `<p class="source">${esc(SOURCE_TEXT[ex.source] || ex.source)}${ex.ms ? ` ${(ex.ms / 1000).toFixed(1)} s.` : ''}</p>`}
    <h3>What it means</h3>${list(a.what_it_means)}
    <h3>If you do nothing</h3><p>${show(a.if_ignored)}</p>
    <h3>Your options</h3>${(a.options || []).map((o) => `<div class="option"><b>${show(o.title)}</b>${show(o.detail)}</div>`).join('')}
    <h3>Check before you reply</h3>${list(a.check_first)}
    <h3>Reply draft</h3>
    <pre class="letter" id="reply" tabindex="0">${show(a.reply_draft)}</pre>
    ${ex.unknownPlaceholders.length ? `<div class="warn">The answer used placeholder(s) that are not yours: ${esc(ex.unknownPlaceholders.join(', '))}. Fill those in yourself.</div>` : ''}
    <div class="tools">
      <button type="button" id="copy">Copy reply</button>
      <button type="button" data-rewrite="shorter">Shorter</button>
      <button type="button" data-rewrite="firmer">Firmer</button>
      <button type="button" data-rewrite="simpler">Simpler words</button>
      <label><input type="checkbox" id="togglePh" ${showPlaceholders ? 'checked' : ''}/> show what the cloud saw</label>
    </div>
    <p class="small" id="replyNote">Highlighted words were put back on this device. The cloud model only ever saw the placeholders.</p>`;
  $('copy').onclick = async () => {
    await navigator.clipboard.writeText(ex.filled.reply_draft);
    $('replyNote').textContent = 'Copied, with your details in.';
  };
  $('togglePh').onchange = (e) => {
    showPlaceholders = e.target.checked;
    drawStep3();
  };
  document.querySelectorAll('[data-rewrite]').forEach((b) => {
    b.onclick = () =>
      busy(b, 'Rewriting…', async () => {
        try {
          const r = await session.rewrite(b.dataset.rewrite);
          drawStep3();
          $('replyNote').textContent = r.source === 'on-device' ? 'Rewritten on this device. Nothing was sent.' : r.source === 'cloud' ? 'Rewritten by the cloud model from the placeholder version.' : 'Demo build: no model rewrote this.';
        } catch (e) {
          $('replyNote').textContent = `Could not rewrite (${e.message}).`;
        }
        drawLedger();
      });
  });
}

// ---------- ledger ----------

function drawLedger() {
  const out = session.outbound;
  const kept = session.state ? session.state.redaction.entities.length : 0;
  const entries = out
    .map(
      (o, i) => `<details class="entry"><summary>${i + 1}. ${esc(o.purpose)}: ${o.chars.toLocaleString('en-GB')} characters to ${esc(o.where === 'cloud' ? 'the cloud model' : o.where === 'demo' ? 'nowhere (demo build)' : 'the on-device model (cloud not reachable)')}</summary><div class="meta">${esc(new Date(o.at).toLocaleTimeString('en-GB'))}</div><pre>${esc(o.payload)}</pre></details>`
    )
    .join('');
  const sentAny = out.some((o) => o.where === 'cloud');
  $('ledger').innerHTML = `${sentAny ? '' : '<p class="none">Nothing.</p>'}${entries}${kept ? `<p class="kept">${kept} personal detail${kept === 1 ? '' : 's'} held on this device only.</p>` : ''}`;
}

drawStatus();
drawPhoto();
drawLedger();
