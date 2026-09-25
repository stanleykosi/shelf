import { logoWidth, shelfSymbolPath, shelfWordmark, wordmarkScale } from "@/brand/identity";

/** The enclosing link supplies the accessible name, so this artwork is decorative. */
export function ShelfLogo({ className = "shelf-logo" }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${logoWidth} 64`} width={logoWidth} height="64" aria-hidden="true" focusable="false">
      <path className="shelf-logo-symbol" d={shelfSymbolPath} fill="currentColor" />
      <path d={shelfWordmark.path} transform={`translate(78 10) scale(${wordmarkScale})`} fill="currentColor" />
    </svg>
  );
}
