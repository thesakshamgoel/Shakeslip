/* Money is always stored in the smallest unit (paise, cents). Never floats. */
export const CURRENCIES = [
  { code: 'INR', label: '₹ Rupee' }, { code: 'USD', label: '$ US Dollar' }, { code: 'GBP', label: '£ Pound' }, { code: 'EUR', label: '€ Euro' },
  { code: 'AED', label: 'AED Dirham' }, { code: 'AUD', label: 'A$ Australian Dollar' }, { code: 'CAD', label: 'C$ Canadian Dollar' }, { code: 'SGD', label: 'S$ Singapore Dollar' },
  { code: 'SAR', label: 'SAR Riyal' }, { code: 'ZAR', label: 'R Rand' }, { code: 'JPY', label: '¥ Yen' }, { code: 'CHF', label: 'CHF Franc' },
] as const
const cache = new Map<string, Intl.NumberFormat>()
const f = (cur: string, frac: boolean) => {
  const k = cur + frac
  let x = cache.get(k)
  if (!x) { x = new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: frac ? 2 : 0 }); cache.set(k, x) }
  return x
}
export const money = (minor: number, cur = 'INR') => f(cur, cur !== 'JPY' && minor % 100 !== 0).format(minor / 100)
export const inr = (paise: number) => money(paise, 'INR')
export const toPaise = (rupees: string | number) => Math.round(Number(rupees) * 100) || 0
export const rupees = (paise: number) => String(paise / 100)
export const symbolOf = (cur: string) => f(cur, false).formatToParts(0).find((p) => p.type === 'currency')?.value ?? cur
