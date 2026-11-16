// Run in the app's tab (scripts/cdp.py eval scripts/photo-eval.js) once the
// on-device model is ready. Draws each sample letter onto a page-sized canvas,
// hands the picture to the same code the "Read a photo" button uses
// (prepareImage, then Firebase AI Logic only_on_device with image input) and
// keeps what came back in window.__photo. Two pictures per letter:
//   clean   black text on white, straight
//   rough   grey paper, turned 2 degrees, slightly blurred and darker at one side
// These are drawn pictures, not phone photos of paper.
(() => {
  const P = window.__plainLetter;
  const draw = (text, rough) => {
    const W = 1240, H = 1754, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = rough ? '#d9d6cf' : '#fff'; x.fillRect(0, 0, W, H);
    if (rough) { x.translate(W / 2, H / 2); x.rotate((2 * Math.PI) / 180); x.translate(-W / 2, -H / 2); x.filter = 'blur(0.6px)'; x.fillStyle = '#f1efe9'; x.fillRect(40, 40, W - 80, H - 80); }
    x.fillStyle = rough ? '#2a2a2a' : '#000'; x.font = '21px Georgia, "Times New Roman", serif'; x.textBaseline = 'top';
    let y = 90; const left = 110, max = W - 220, lh = 29;
    for (const para of text.split('\n')) {
      if (!para.trim()) { y += lh * 0.7; continue; }
      let line = '';
      for (const word of para.split(' ')) {
        const t = line ? line + ' ' + word : word;
        if (x.measureText(t).width > max && line) { x.fillText(line, left, y); y += lh; line = word; } else line = t;
      }
      x.fillText(line, left, y); y += lh;
    }
    if (rough) { x.setTransform(1, 0, 0, 1, 0, 0); x.filter = 'none'; const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    return { canvas: c, overflow: y > H - 60 };
  };
  const toFile = (canvas) => new Promise((res) => canvas.toBlob((b) => res(new File([b], 'letter.png', { type: 'image/png' })), 'image/png'));
  window.__photo = { done: false, letters: {} };
  (async () => {
    for (const l of P.letters) {
      const rec = (window.__photo.letters[l.id] = {});
      for (const kind of ['clean', 'rough']) {
        const t = performance.now();
        try {
          const d = draw(l.text, kind === 'rough');
          const image = await P.prepareImage(await toFile(d.canvas));
          const r = await P.ai.transcribe(image);
          rec[kind] = { ms: Math.round(performance.now() - t), width: image.width, height: image.height, overflow: d.overflow, source: r.source, text: r.text };
        } catch (e) {
          rec[kind] = { ms: Math.round(performance.now() - t), error: String(e) };
        }
      }
    }
    window.__photo.done = true;
  })();
  return 'started';
})();
