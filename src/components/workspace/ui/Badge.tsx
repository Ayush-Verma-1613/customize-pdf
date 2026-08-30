/**
 * The card's tagline, tinted with the template's own accent colour rather than
 * a hue picked in the UI - so a template added later arrives already dressed.
 */
export function Badge({ accent, children }: { accent: string; children: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-[3px] text-[11px] font-medium"
      style={{ backgroundColor: `${accent}1F`, color: accent }}
    >
      {children}
    </span>
  );
}
