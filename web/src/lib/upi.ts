/* UPI deep link. On a phone it opens GPay, PhonePe, Paytm or any UPI app with the amount filled in. */
export function upiLink(upiId: string, name: string, paise: number, note: string): string {
  const q = new URLSearchParams({ pa: upiId, pn: name.slice(0, 40), am: (paise / 100).toFixed(2), cu: 'INR', tn: note.slice(0, 60) })
  return `upi://pay?${q.toString()}`
}
