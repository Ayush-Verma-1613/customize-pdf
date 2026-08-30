/**
 * The decorative layer behind the whole app.
 *
 * Everything here is drawn with gradients, dot patterns and a few hand-written
 * SVG paths - no images - so it costs a couple of kilobytes, scales to any
 * screen without going soft, and can be re-tinted by changing one colour.
 *
 * The fills and strokes are named classes rather than attributes, so the whole
 * palette lives in one block of CSS: a presentation attribute cannot read a
 * custom property, and putting hex codes in the markup would scatter them.
 *
 * It is one fixed, non-interactive layer sitting behind the interface, and the
 * app container above it is transparent so all of this shows through. Nothing
 * in here may ever take a pointer event.
 */
export function BackgroundDecoration() {
  return (
    <div className="background-decoration" aria-hidden="true">
      <span className="gradient-top-left" />
      <span className="dots-left" />

      <svg className="leaf-top-right" viewBox="0 0 220 240" fill="none">
        {/* One leaf: two mirrored curves meeting at the tip, filled, with the
            midrib and three veins drawn over the top. */}
        <path
          className="leaf-blade"
          d="M150 26c34 44 30 104-6 140-30 30-70 36-96 30 4-40 18-84 44-112 18-20 40-40 58-58Z"
        />
        <path className="leaf-vein" d="M150 26c-24 52-42 110-102 170" />
        <path
          className="leaf-vein leaf-vein-fine"
          d="M138 74c-16 4-32 14-44 28M126 122c-14 4-28 12-40 24M116 164c-10 4-20 10-28 18"
        />
      </svg>

      <svg className="curved-lines-right" viewBox="0 0 180 420" fill="none">
        {/* Four arcs of the same family, each a little wider than the last. */}
        <path className="arc" d="M172 8C96 92 62 210 96 412" strokeWidth="1.35" />
        <path className="arc" d="M176 44C112 124 84 232 116 416" strokeWidth="1.15" />
        <path className="arc" d="M178 86C126 156 104 250 134 418" strokeWidth="1.05" />
        <path className="arc" d="M179 132C140 190 124 264 150 418" strokeWidth="0.95" />
      </svg>

      <svg className="plant-bottom-left" viewBox="0 0 260 300" fill="none">
        {/* A potted plant leaning in from off-screen: the pot is cropped by the
            edge of the window, which is what stops it looking like a sticker.
            Leaves first, then the pot over them, so the stems tuck inside. */}
        <path className="leaf-back" d="M126 52c20-18 46-20 64-6-14 22-42 30-62 16Z" />
        <path className="leaf-back" d="M114 60C92 40 66 38 48 52c14 22 42 28 62 14Z" />
        <path className="plant-stem" d="M109 190c0-52 4-100 14-140" />
        <path className="leaf-front" d="M123 96c26-14 52-10 66 8-18 20-46 24-66 10Z" />
        <path className="leaf-front" d="M118 138c-28-10-52-2-62 18 22 16 50 12 62-6Z" />

        <path
          className="pot-body"
          d="M34 196h150l-16 96a14 14 0 0 1-14 12H64a14 14 0 0 1-14-12l-16-96Z"
        />
        <path className="pot-rim" d="M26 178h166v18H26z" />
      </svg>

      <span className="gradient-bottom-right" />
      <span className="dots-bottom-right" />
    </div>
  );
}
