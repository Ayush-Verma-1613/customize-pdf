import * as fontkit from 'fontkit';

/**
 * pdf-lib ships against fontkit 1.x, whose subsetter drops glyphs for the
 * TrueType faces we embed - the exported PDF comes out with holes where most
 * lowercase letters should be. fontkit 2.x subsets these fonts correctly but
 * returns the subset as bytes from `encode()` instead of the `encodeStream()`
 * pdf-lib expects, so this adapter bridges the two.
 */

interface MinimalStream {
  on(event: 'data' | 'end', listener: (chunk?: Uint8Array) => void): MinimalStream;
}

const asStream = (bytes: Uint8Array): MinimalStream => ({
  on(event, listener) {
    // pdf-lib chains .on('data').on('end'); queueing preserves that order.
    if (event === 'data') queueMicrotask(() => listener(bytes));
    if (event === 'end') queueMicrotask(() => listener());
    return this;
  },
});

interface SubsetLike {
  encode(): Uint8Array;
  encodeStream?: () => MinimalStream;
}

interface FontLike {
  createSubset(): SubsetLike;
}

/** Drop-in replacement for the `@pdf-lib/fontkit` default export. */
export const pdfFontkit = {
  create(bytes: Uint8Array, postscriptName?: string) {
    const font = fontkit.create(bytes, postscriptName) as unknown as FontLike;
    const createSubset = font.createSubset.bind(font);
    font.createSubset = () => {
      const subset = createSubset();
      subset.encodeStream = () => asStream(subset.encode());
      return subset;
    };
    return font;
  },
};
