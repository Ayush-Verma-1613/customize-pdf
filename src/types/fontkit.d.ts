/**
 * fontkit 2.x ships no type declarations. We only touch the sliver of the API
 * that pdf-lib drives, so declaring that surface is enough.
 */
declare module 'fontkit' {
  export interface FontkitSubset {
    encode(): Uint8Array;
    includeGlyph(glyph: unknown): number;
    encodeStream?: () => unknown;
  }

  export interface FontkitFont {
    createSubset(): FontkitSubset;
    [key: string]: unknown;
  }

  export function create(buffer: Uint8Array, postscriptName?: string): FontkitFont;
  export function open(filename: string, postscriptName?: string): FontkitFont;
}
