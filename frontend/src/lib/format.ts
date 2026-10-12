/** Display all prices as Nigerian Naira; API prices are stored in kobo. */
export const money = (kobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(kobo / 100);
