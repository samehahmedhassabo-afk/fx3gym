export function FX3Logo({
  size = 56,
  showTagline = false,
  onDark = false,
  className,
}: {
  size?: number;
  showTagline?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const height = showTagline ? 1.55 * size : size;
  return (
    <img
      src="/logo.png"
      alt="FX3 — Fit. Fight. Flow."
      height={height}
      style={{ height, width: "auto" }}
      className={className}
      draggable={false}
    />
  );
}
