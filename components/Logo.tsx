// Logo Midas. Sostituibile caricando il file ufficiale in
// public/midas-logo.svg (o .png, aggiornando il src qui sotto).
export default function Logo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/midas-logo.svg" alt="Midas" className={className} />;
}
