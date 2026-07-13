const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatEuro(value: number | null | undefined): string {
  return eur.format(Number(value ?? 0));
}
