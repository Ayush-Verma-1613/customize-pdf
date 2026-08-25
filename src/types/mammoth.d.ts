/**
 * mammoth ships no type declarations for its browser entry point. Only the one
 * call the importer makes is described here.
 */
declare module 'mammoth/mammoth.browser' {
  export interface ConvertResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
}
