const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
(async () => {
  for (const subset of [true, false]) {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const f = await doc.embedFont(fs.readFileSync('public/fonts/Tinos-Regular.ttf'), { subset });
    const p = doc.addPage([400, 200]);
    p.drawText('The quick brown fox jumps over lazy dogs 0123456789', { x: 20, y: 150, size: 11, font: f });
    p.drawText('GREEN VALLEY PUBLIC SCHOOL', { x: 20, y: 120, size: 11, font: f });
    const bytes = await doc.save();
    fs.writeFileSync(`/tmp/claude-1000/-home-digital-guru-ji/37cb2623-8232-469e-931a-4124cd2ce8a9/scratchpad/ft-${subset}.pdf`, bytes);
    console.log('subset', subset, bytes.length);
  }
})();
