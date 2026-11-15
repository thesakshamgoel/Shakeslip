export type Status = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void'
export type FieldKind = 'text' | 'longtext' | 'number' | 'date' | 'select'
export type CustomField = { id: string; label: string; kind: FieldKind; options?: string[]; required: boolean; place: 'top' | 'bottom' }
export type InvoiceType = {
  id?: string; name: string; title: string; prefix: string; lineMode: 'qty_rate' | 'amount_only'; descLabel: string; qtyLabel: string; rateLabel: string
  taxMode: 'gst' | 'none'; defaultGst: number; discount: boolean; advance: boolean; dueDays: number; defaultNote: string; theme: string; fields: CustomField[]; defaultTerms?: string[]
}
export type LineItem = { id: string; desc: string; qty: number; rate: number; unit?: string }
export type Honorific = '' | 'Mr.' | 'Ms.' | 'Mrs.' | 'Dr.' | 'M/s.'
export type BillTo = { name: string; company: string; gstin: string; city: string; address: string; email: string; phone: string; state?: string; honorific?: Honorific; attention?: string; area?: string; pin?: string; pan?: string; logo?: string }
export type Signature = { kind?: 'none' | 'typed' | 'image'; text?: string; font?: 'great-vibes' | 'allura' | 'caveat' | 'dancing-script' | 'sacramento' | 'parisienne'; image?: string }
export type Business = {
  name: string; gstin: string; address: string; city: string; email: string; phone: string
  pan?: string; website?: string; state?: string; upiId?: string; bankName?: string; accountName?: string; accountNo?: string; ifsc?: string; signature?: Signature
  logo?: string; logoSize?: 's' | 'm' | 'l' | 'xl'
  phones?: Phone[]; emails?: Email[]; qrImage?: string; defaultTheme?: string; defaultLayout?: string; defaultTerms?: string[]; defaultCustomTerms?: string; catalogue?: Catalogue
}
export type CatService = { id: string; name: string; unit: string; rate: number; note?: string; fav?: boolean }
export type CatPackage = { id: string; name: string; price: number; includes: string[] }
export type Catalogue = { services: CatService[]; packages: CatPackage[] }
export type Email = { id: string; label: string; address: string; isDefault: boolean }
export type Phone = { id: string; label: string; number: string; isDefault: boolean }
export type PlanKind = 'none' | 'advance_balance' | 'full_advance' | 'on_completion' | 'due_on_receipt' | 'net15' | 'net30' | 'custom'
export type Extra = {
  currency: string; category: string; completionDate: string; banner: string; salutation: string; intro: string
  plan: { kind: PlanKind; advancePct: number; text: string }; showBank: boolean; showQr: boolean; showMobile: boolean; showTerms?: boolean; annexure: string; customTerms: string; qrMode?: 'upi' | 'image' | 'none'; discountPct?: number; emailIds?: string[] | null; phoneIds?: string[] | null; phoneId?: string; layout?: 'classic' | 'minimal' | 'band' | 'compact' | 'bold' | 'ledger'; job?: { what: string; kind: string; name: string }; termsAckAt?: string
  reminders?: { before: number[]; onDue: boolean; afterEvery: number | null } | null; remindersOff?: boolean; repeat?: 'none' | 'monthly'
}
export type EventKind = 'created' | 'sent' | 'whatsapp' | 'viewed' | 'reminder' | 'payment' | 'claimed' | 'confirmed' | 'details' | 'change' | 'accepted'
export type TimelineEvent = { kind: EventKind; text: string; at: string; number?: string; from?: string; invoiceId?: string }
export type Payment = { id: string; amount: number; method: string; ref: string; paidAt: string; status: 'confirmed' | 'claimed'; kind?: string; note?: string }
export type Totals = { subtotal: number; discount: number; taxable: number; gst: number; total: number; advance: number; paid: number; balance: number }
export type InvoiceView = {
  id: string; number: string | null; status: Status; rawStatus: string; linkId: string; typeId: string; type: InvoiceType; theme: string; billTo: BillTo
  items: LineItem[]; fields: Record<string, string>; gstPct: number; discount: number; advance: number; issued: string; due: string; note: string
  totals: Totals; payments: Payment[]; events: TimelineEvent[]; from: Business
  project: string; terms: string[]; taxInclusive: boolean; interState: boolean; extra: Extra; voidReason: string
  delivery?: 'shakeslip' | 'pdf'; acceptance?: Acceptance; annotations?: Mark[]
}
/* A numbered mark on the invoice. x and y are percentages of the page, so it lands in the same place at any zoom. */
export type Mark = { id?: string; page: number; x: number; y: number; text: string }
export type Acceptance = { required: boolean; at: string | null; name: string; signature: string }
export type InvoiceRow = { id: string; number: string | null; status: Status; currency?: string; client?: string; linkId?: string; project?: string; from?: string; typeName?: string; due: string; issued: string; total: number; balance: number }
export type Group = { id: string; name: string; typeId: string | null; theme: string; dueDays: number; clients: number; reminders: { before: number[]; onDue: boolean; afterEvery: number | null } }
export type Link = { id: string; name: string; email: string; phone: string; company: string; gstin: string; city: string; address: string; state?: string; honorific?: Honorific; attention?: string; area?: string; pin?: string; pan?: string; logo?: string; groupId: string | null; status: 'invited' | 'pending' | 'active'; joined: 0 | 1; invoices: number }
export type Me = {
  user: { id: string; email: string; name: string; phone: string; photo?: string } | null
  business?: (Business & { id: string; slug: string; slugAt?: string; autoApprove: boolean; profession: string }) | null
  profile?: { company: string; gstin: string; address: string; city: string; pin: string; state?: string; honorific?: Honorific; area?: string; pan?: string; logo?: string }
  unread?: number
}
export type Notice = { id: string; title: string; body: string; link: string; at: string; readAt: string | null }
