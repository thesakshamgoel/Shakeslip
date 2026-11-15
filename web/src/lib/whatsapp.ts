/* Phase 1 WhatsApp: opens WhatsApp with the number and message ready. One tap to send.
   Fully automatic sending needs the official WhatsApp Business Cloud API (later). */
export function whatsappUrl(phone: string, message: string): string {
  let d = phone.replace(/\D/g, '')
  if (d.length === 10) d = `91${d}`
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`
}
