// Traccia stile elettrocardiogramma: una linea di base tenue + un impulso
// luminoso che scorre. Il colore segue currentColor (usa text-*).
const POINTS =
  "0,20 26,20 32,15 38,20 48,20 52,26 56,4 60,33 64,20 74,20 82,14 90,20 120,20 " +
  "146,20 152,15 158,20 168,20 172,26 176,4 180,33 184,20 194,20 202,14 210,20 240,20";

export default function EcgLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <polyline
        points={POINTS}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={POINTS}
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="ecg-sweep"
      />
    </svg>
  );
}
