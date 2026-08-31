import styles from './onboarding.module.css';

/**
 * The decorative layer behind the onboarding page.
 *
 * Gradients, border-radius blobs, dot fields and a handful of hand-written SVG
 * paths - no images - so the whole thing costs a couple of kilobytes and stays
 * crisp on any screen.
 *
 * The composition is a frame rather than a scene: everything sits in the four
 * corners, and the middle is left alone for the content above it. Nothing in
 * here may ever take a pointer event.
 */

/** One contour line repeated into a bundle. The offset is what makes it read
 *  as a drawn contour rather than a single stray stroke. */
function Bundle({ href, count, dx = 0, dy = 0, grow = 0 }: {
  href: string;
  count: number;
  dx?: number;
  dy?: number;
  grow?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <use
          key={i}
          href={href}
          transform={
            grow
              ? `scale(${(1 + grow * i).toFixed(3)})`
              : `translate(${dx * i} ${dy * i})`
          }
        />
      ))}
    </>
  );
}

/** A pinnate branch: one stem with leaflets splayed off both sides of it. */
function Branch({
  className,
  viewBox,
  stems,
  leaves,
}: {
  className: string;
  viewBox: string;
  stems: string[];
  leaves: { x: number; y: number; angle: number; scale: number }[];
}) {
  return (
    <svg className={className} viewBox={viewBox} fill="none" aria-hidden="true">
      {stems.map((d, i) => (
        <path key={i} className={styles.stem} d={d} />
      ))}
      {leaves.map((leaf, i) => (
        <use
          key={i}
          href="#ob-leaflet"
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.scale})`}
        />
      ))}
    </svg>
  );
}

const TOP_RIGHT_LEAVES = [
  { x: 243, y: 20, angle: 72, scale: 0.78 },
  { x: 236, y: 26, angle: 198, scale: 0.72 },
  { x: 208, y: 51, angle: 76, scale: 0.92 },
  { x: 200, y: 58, angle: 202, scale: 0.86 },
  { x: 172, y: 86, angle: 74, scale: 1 },
  { x: 164, y: 93, angle: 199, scale: 0.94 },
  { x: 138, y: 122, angle: 78, scale: 0.9 },
  { x: 130, y: 129, angle: 204, scale: 0.82 },
  { x: 104, y: 160, angle: 76, scale: 0.76 },
  { x: 82, y: 196, angle: 133, scale: 0.72 },
];

const BOTTOM_LEFT_LEAVES = [
  { x: 22, y: 268, angle: 254, scale: 0.82 },
  { x: 30, y: 262, angle: 16, scale: 0.88 },
  { x: 52, y: 226, angle: 251, scale: 0.98 },
  { x: 60, y: 220, angle: 14, scale: 1.04 },
  { x: 84, y: 182, angle: 256, scale: 1 },
  { x: 92, y: 176, angle: 18, scale: 0.96 },
  { x: 116, y: 138, angle: 252, scale: 0.9 },
  { x: 124, y: 132, angle: 15, scale: 0.84 },
  { x: 148, y: 94, angle: 254, scale: 0.76 },
  { x: 162, y: 70, angle: 314, scale: 0.74 },
  // The short second stem, kept smaller so it reads as behind the first.
  { x: 74, y: 288, angle: 292, scale: 0.66 },
  { x: 104, y: 254, angle: 300, scale: 0.6 },
];

export function OnboardingBackground() {
  return (
    <>
      <div className={styles.ground} aria-hidden="true" />

      <div className={styles.decor} aria-hidden="true">
        {/* Shared definitions. The leaflet is drawn once and stamped wherever a
            branch needs one, which is what keeps two full sprays under a
            kilobyte of markup. */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <linearGradient id="ob-leaf-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7d8968" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#5c6749" stopOpacity="0.86" />
            </linearGradient>

            <g id="ob-leaflet">
              <path
                className={styles.blade}
                d="M0 0C14-26 50-36 80-18 54 6 16 12 0 0Z"
              />
              <path className={styles.midrib} d="M4-1C26-8 56-14 77-17" />
            </g>

            {/* One curve per bundle, stamped repeatedly by <Bundle>. */}
            <path id="ob-line-tl" d="M150 0C154 54 132 96 92 122 48 150 20 194 10 258" />
            <path id="ob-line-r" d="M170 0C96 74 66 168 118 246c50 76 54 126 14 174" />
            <path id="ob-line-b" d="M0 118C84 118 116 34 202 34s116 78 200 78" />
            <path
              id="ob-line-br"
              d="M0 150C70 150 96 74 176 74s104 54 174 54c42 0 60-24 70-40"
            />
          </defs>
        </svg>

        <span className={styles.blobTopLeft} />
        <span className={styles.blobTopRight} />
        <span className={styles.blobBottomLeft} />
        <span className={styles.blobBottomRight} />

        {/* Top right: a pale beige shape the branch and the lines sit against. */}
        <svg className={styles.shapeTopRight} viewBox="-40 -60 440 480" aria-hidden="true">
          <path
            className={styles.shapeFillBeige}
            d="M70-52c104-6 196 44 244 138 48 94 30 200-38 258-68 58-176 62-244 12C-36 306-64 202-38 116-12 30 6-46 70-52Z"
          />
        </svg>

        {/* Bottom right: the peach shape the composition settles onto. */}
        <svg className={styles.shapeBottomRight} viewBox="-40 -40 480 420" aria-hidden="true">
          <path
            className={styles.shapeFillPeach}
            d="M18 128C62 52 156 8 244 22c88 14 158 84 174 168 16 84-22 172-98 202-76 30-190 12-256-46C-2 288-26 204 18 128Z"
          />
        </svg>

        <svg className={`${styles.lines} ${styles.linesTopLeft}`} viewBox="0 0 300 300" aria-hidden="true">
          <Bundle href="#ob-line-tl" count={9} grow={0.075} />
        </svg>

        <svg className={`${styles.lines} ${styles.linesRight}`} viewBox="0 0 200 420" aria-hidden="true">
          <Bundle href="#ob-line-r" count={10} dx={-15} />
        </svg>

        <svg className={`${styles.lines} ${styles.linesBottom}`} viewBox="0 0 420 140" aria-hidden="true">
          <Bundle href="#ob-line-b" count={9} dy={-11} />
        </svg>

        <svg
          className={`${styles.lines} ${styles.linesBottomRight}`}
          viewBox="0 0 420 180"
          aria-hidden="true"
        >
          <Bundle href="#ob-line-br" count={10} dy={-12} />
        </svg>

        <Branch
          className={styles.branchTopRight}
          viewBox="0 0 270 240"
          stems={['M258 4C216 42 170 90 124 146c-20 24-34 46-46 70']}
          leaves={TOP_RIGHT_LEAVES}
        />

        <Branch
          className={styles.sprayBottomLeft}
          viewBox="0 0 260 300"
          stems={[
            'M8 298C32 252 64 202 98 158c22-28 44-56 66-84',
            'M60 300C78 284 96 266 114 246',
          ]}
          leaves={BOTTOM_LEFT_LEAVES}
        />

        <span className={`${styles.dots} ${styles.dotsTopLeft}`} />
        <span className={`${styles.dots} ${styles.dotsBottomRight}`} />
      </div>
    </>
  );
}
