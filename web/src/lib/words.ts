/* Amount in words. Rupees use Indian grouping (lakh, crore); other currencies use million and billion. */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const two = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`)
const three = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : '', two(n % 100)].filter(Boolean).join(' ')

function indian(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000); if (crore) parts.push(`${indian(crore)} Crore`)
  n %= 10_000_000
  const lakh = Math.floor(n / 100_000); if (lakh) parts.push(`${two(lakh)} Lakh`)
  n %= 100_000
  const th = Math.floor(n / 1000); if (th) parts.push(`${two(th)} Thousand`)
  n %= 1000
  if (n) parts.push(three(n))
  return parts.join(' ')
}
function western(n: number): string {
  if (n === 0) return 'Zero'
  const units = ['', 'Thousand', 'Million', 'Billion']
  const parts: string[] = []
  for (let i = 0; n > 0 && i < units.length; i++, n = Math.floor(n / 1000)) {
    const c = n % 1000
    if (c) parts.unshift(`${three(c)}${units[i] ? ' ' + units[i] : ''}`)
  }
  return parts.join(' ')
}
const NAMES: Record<string, [string, string]> = {
  INR: ['Rupees', 'Paise'], USD: ['US Dollars', 'Cents'], GBP: ['Pounds', 'Pence'], EUR: ['Euros', 'Cents'], AED: ['UAE Dirhams', 'Fils'], AUD: ['Australian Dollars', 'Cents'],
  CAD: ['Canadian Dollars', 'Cents'], SGD: ['Singapore Dollars', 'Cents'], SAR: ['Saudi Riyals', 'Halalas'], ZAR: ['Rand', 'Cents'], JPY: ['Yen', ''], CHF: ['Swiss Francs', 'Centimes'],
}
export function amountInWords(minor: number, cur = 'INR'): string {
  const [big, small] = NAMES[cur] ?? [cur, 'Cents']
  const whole = Math.floor(minor / 100), frac = minor % 100
  const w = cur === 'INR' ? indian(whole) : western(whole)
  return `${big} ${w}${frac && small ? ` and ${two(frac)} ${small}` : ''} Only`
}
