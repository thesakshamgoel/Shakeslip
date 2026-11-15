/* Mirrors the server's rules so the editor can explain tax before saving. */
export const STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
}
const CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export function gstinValid(g: string): boolean {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g) || !STATES[g.slice(0, 2)]) return false
  let sum = 0
  for (let i = 0; i < 14; i++) { const p = CH.indexOf(g[i]) * (i % 2 ? 2 : 1); sum += Math.floor(p / 36) + (p % 36) }
  return CH[(36 - (sum % 36)) % 36] === g[14]
}
export const stateOf = (gstin?: string, fallback?: string) => (gstin && gstin.length >= 2 ? gstin.slice(0, 2) : fallback || '')
export const isInterState = (a: string, b: string) => !!a && !!b && a !== b
export const stateName = (code: string) => STATES[code] ?? ''
/* "Maharashtra (27)" style label, used for place of supply. */
export const supplyLabel = (code: string) => (STATES[code] ? `${STATES[code]} (${code})` : '')

export const STATE_OPTIONS = [{ value: '', label: 'Choose a state' }, ...Object.entries(STATES).map(([value, label]) => ({ value, label, hint: `GST code ${value}` }))]
