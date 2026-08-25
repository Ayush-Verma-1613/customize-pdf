import { PDFDocument } from 'pdf-lib';
import * as fontkit from 'fontkit';
import fs from 'node:fs';

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const f = await doc.embedFont(fs.readFileSync('public/fonts/Tinos-Regular.ttf'), { subset: true });
const b = await doc.embedFont(fs.readFileSync('public/fonts/Inter-Bold.ttf'), { subset: true });
const p = doc.addPage([400, 200]);
p.drawText('The quick brown fox jumps over lazy dogs 0123456789', { x: 20, y: 150, size: 11, font: f });
p.drawText('GREEN VALLEY PUBLIC SCHOOL — Section A [8]', { x: 20, y: 120, size: 11, font: f });
p.drawText('Inter bold: Maximum Marks 80', { x: 20, y: 90, size: 11, font: b });
const bytes = await doc.save();
fs.writeFileSync('/tmp/claude-1000/-home-digital-guru-ji/37cb2623-8232-469e-931a-4124cd2ce8a9/scratchpad/ft-modern.pdf', bytes);
console.log('bytes', bytes.length);
