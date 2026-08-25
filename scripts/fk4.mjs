import { PDFDocument } from 'pdf-lib';
import * as fontkit from 'fontkit';
import fs from 'node:fs';

const streamify = (bytes) => ({
  on(event, cb) {
    if (event === 'data') queueMicrotask(() => cb(bytes));
    if (event === 'end') queueMicrotask(() => cb());
    return this;
  },
});
const shim = {
  create(bytes) {
    const font = fontkit.create(bytes);
    const make = font.createSubset.bind(font);
    font.createSubset = () => {
      const subset = make();
      subset.encodeStream = () => streamify(subset.encode());
      return subset;
    };
    return font;
  },
};

const doc = await PDFDocument.create();
doc.registerFontkit(shim);
const f = await doc.embedFont(fs.readFileSync('public/fonts/Tinos-Regular.ttf'), { subset: true });
const fi = await doc.embedFont(fs.readFileSync('public/fonts/Tinos-Italic.ttf'), { subset: true });
const b = await doc.embedFont(fs.readFileSync('public/fonts/Inter-Bold.ttf'), { subset: true });
const p = doc.addPage([420, 200]);
p.drawText('The quick brown fox jumps over lazy dogs 0123456789', { x: 20, y: 160, size: 11, font: f });
p.drawText('GREEN VALLEY PUBLIC SCHOOL — Section A [8] (a) ?!', { x: 20, y: 135, size: 11, font: f });
p.drawText('Italic: answer any four questions.', { x: 20, y: 110, size: 11, font: fi });
p.drawText('Inter bold: Maximum Marks 80 · ½ × ÷ é', { x: 20, y: 85, size: 11, font: b });
const bytes = await doc.save();
fs.writeFileSync('/tmp/claude-1000/-home-digital-guru-ji/37cb2623-8232-469e-931a-4124cd2ce8a9/scratchpad/ft-shim.pdf', bytes);
console.log('bytes', bytes.length);
