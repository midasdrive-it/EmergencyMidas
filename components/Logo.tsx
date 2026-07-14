// Logo Midas. L'asset ufficiale è in public/midas-logo.png.
export default function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/midas-logo.png"
      alt="Midas"
      className={`object-contain ${className ?? ""}`}
    />
  );
}
