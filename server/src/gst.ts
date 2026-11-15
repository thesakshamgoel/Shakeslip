/* GST helpers: state codes, GSTIN check digit, and place-of-supply logic. */
export const STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
}
const CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/* Official GSTIN checksum (base-36, alternating weights). Catches most typos. */
export function gstinValid(g: string): boolean {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g) || !STATES[g.slice(0, 2)]) return false
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const p = CH.indexOf(g[i]) * (i % 2 ? 2 : 1)
    sum += Math.floor(p / 36) + (p % 36)
  }
  return CH[(36 - (sum % 36)) % 36] === g[14]
}

export const stateOf = (gstin: string | undefined, fallback: string | undefined) => (gstin && gstin.length >= 2 ? gstin.slice(0, 2) : fallback || '')

/* Inter-state supply takes IGST; same state takes CGST + SGST. Unknown means same state. */
export const isInterState = (fromState: string, toState: string) => !!fromState && !!toState && fromState !== toState
