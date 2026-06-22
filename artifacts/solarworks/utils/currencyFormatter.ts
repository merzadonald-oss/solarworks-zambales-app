export function formatAmount(
  amountPhp: number,
  currency: string,
  usdRate: number
): string {
  if (currency === "USD") {
    const usd = amountPhp / usdRate;
    return `$${formatWithCommas(usd)}`;
  }
  return `₱${formatWithCommas(amountPhp)}`;
}

export function formatWithCommas(amount: number): string {
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPhp(amount: number): string {
  return `₱${formatWithCommas(amount)}`;
}
