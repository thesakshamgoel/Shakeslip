import { z } from 'zod'
import { STATES, gstinValid } from './gst.ts'

const text = (max: number) => z.string().trim().max(max)
export const email = z.string().trim().toLowerCase().email().max(120)
export const phone = z.string().trim().max(20).regex(/^[+\d\s()-]*$/, 'Use digits, spaces, + or - only')
export const gstin = z.string().trim().toUpperCase().max(15).refine((g) => g === '' || gstinValid(g), 'That GSTIN does not look right. Check each character, the last one is a check digit.')
export const imageData = z.string().max(420_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Use a PNG, JPG or WebP image under 300 KB')
const honorific = z.enum(['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s.'])
const pan = z.string().trim().toUpperCase().regex(/^([A-Z]{5}[0-9]{4}[A-Z])?$/, 'That PAN does not look right')
const pin = z.string().trim().regex(/^([1-9][0-9]{5})?$/, 'A PIN code has 6 digits')
export const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'AUD', 'CAD', 'SGD', 'SAR', 'ZAR', 'JPY', 'CHF'] as const
export const logoBody = z.object({ image: imageData.or(z.literal('')), size: z.enum(['s', 'm', 'l', 'xl']).default('m') })
export const reminderRules = z.object({ before: z.array(z.number().int().min(1).max(30)).max(4), onDue: z.boolean(), afterEvery: z.number().int().min(1).max(30).nullable() })
export type ReminderRules = z.infer<typeof reminderRules>
export const lateFeeSchema = z.object({ kind: z.enum(['none', 'percent', 'flat']), pct: z.number().min(0).max(5), flat: z.number().int().min(0).max(10_000_000), graceDays: z.number().int().min(0).max(60) })
export type LateFee = z.infer<typeof lateFeeSchema>
export const automationBody = z.object({ reminders: reminderRules, lateFee: lateFeeSchema })
export const extraSchema = z.object({
  currency: z.enum(CURRENCIES).default('INR'), category: z.string().trim().max(40).default(''), completionDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(''),
  banner: z.string().trim().max(300).default(''), salutation: z.string().trim().max(120).default(''), intro: z.string().trim().max(300).default(''),
  plan: z.object({ kind: z.enum(['none', 'advance_balance', 'full_advance', 'on_completion', 'due_on_receipt', 'net15', 'net30', 'custom']).default('none'), advancePct: z.number().int().min(1).max(99).default(50), text: z.string().trim().max(200).default('') }).default({ kind: 'none', advancePct: 50, text: '' }),
  showBank: z.boolean().default(true), showQr: z.boolean().default(true), showMobile: z.boolean().default(false), showTerms: z.boolean().default(true),
  annexure: z.string().max(6000).default(''), customTerms: z.string().max(10000).default(''),
  qrMode: z.enum(['upi', 'image', 'none']).default('upi'), layout: z.enum(['classic', 'minimal', 'band', 'compact', 'bold', 'ledger']).default('classic'),
  job: z.object({ what: z.string().trim().max(60).default(''), kind: z.string().trim().max(60).default(''), name: z.string().trim().max(120).default('') }).default({ what: '', kind: '', name: '' }), termsAckAt: z.string().max(40).default(''), phoneId: z.string().max(40).default(''),
  discountPct: z.number().min(0).max(100).default(0), emailIds: z.array(z.string().max(40)).max(8).nullable().default(null), phoneIds: z.array(z.string().max(40)).max(8).nullable().default(null),
  reminders: reminderRules.nullable().default(null), remindersOff: z.boolean().default(false), repeat: z.enum(['none', 'monthly']).default('none'),
})
export type Extra = z.infer<typeof extraSchema>
export const phonesBody = z.object({ phones: z.array(z.object({ id: z.string().min(1).max(40), label: z.string().trim().min(1).max(30), number: z.string().trim().min(6).max(20).regex(/^[+\d\s()-]+$/, 'Use digits, spaces, + or - only'), isDefault: z.boolean().default(false) })).max(8) })
export const emailsBody = z.object({ emails: z.array(z.object({ id: z.string().min(1).max(40), label: z.string().trim().min(1).max(30), address: z.string().trim().toLowerCase().email('Enter a valid email address').max(120), isDefault: z.boolean().default(false) })).max(8) })
export const defaultsBody = z.object({ theme: z.string().min(1).max(30), layout: z.enum(['classic', 'minimal', 'band', 'compact', 'bold', 'ledger']).default('classic'), terms: z.array(z.string().trim().max(600)).max(40), customTerms: z.string().max(10000) })
const catItem = z.object({ id: z.string().min(1).max(40), name: z.string().trim().min(1, 'Give each service a name').max(80), unit: z.string().trim().max(24).default(''), rate: z.number().int().min(0).max(100_000_000_00, 'Rates can be up to ₹10 crore'), note: z.string().trim().max(200).default(''), fav: z.boolean().default(false) })
export const catalogueBody = z.object({
  services: z.array(catItem).max(80),
  packages: z.array(z.object({ id: z.string().min(1).max(40), name: z.string().trim().min(1, 'Give each package a name').max(80), price: z.number().int().min(0).max(100_000_000_00, 'Package prices can be up to ₹10 crore'), includes: z.array(z.string().max(40)).max(20) })).max(30),
})
export const qrBody = z.object({ image: imageData.or(z.literal('')) })
const stateCode = z.string().refine((s) => s === '' || !!STATES[s], 'Pick a state from the list')

export const signupBody = z.object({
  name: text(80).min(1), email, password: z.string().min(10, 'Use at least 10 characters').max(200),
  role: z.enum(['studio', 'slip']), acceptTerms: z.literal(true, { error: 'Please accept the terms to continue' }),
})
export const googleBody = z.object({ idToken: z.string().min(20).max(4000), role: z.enum(['studio', 'slip']).optional(), acceptTerms: z.boolean().optional() })
export const loginBody = z.object({ email, password: z.string().min(1).max(200) })

export const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,24}$/), label: text(40).min(1), kind: z.enum(['text', 'longtext', 'number', 'date', 'select']),
  options: z.array(text(40).min(1)).max(12).optional(), required: z.boolean(), place: z.enum(['top', 'bottom']),
})
export const typeSchema = z.object({
  name: text(40).min(1),
  title: text(40).min(1), prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,8}$/, 'Use 1 to 8 letters or numbers'),
  lineMode: z.enum(['qty_rate', 'amount_only']), descLabel: text(30).min(1), qtyLabel: text(20).min(1), rateLabel: text(20).min(1),
  taxMode: z.enum(['gst', 'none']), defaultGst: z.number().min(0).max(28), discount: z.boolean(), advance: z.boolean(),
  dueDays: z.number().int().min(0).max(365), defaultNote: text(400), theme: z.string().min(1).max(30),
  fields: z.array(fieldSchema).max(12), defaultTerms: z.array(text(600)).max(40).default([]),
})
export type TypeSchema = z.infer<typeof typeSchema>

export const groupBody = z.object({
  name: text(60).min(1), typeId: z.string().nullable(), theme: z.string().max(30), dueDays: z.number().int().min(0).max(365),
  reminders: reminderRules,
})

export const businessBody = z.object({
  name: text(80).min(1), gstin, address: text(200), area: text(100).optional().default(''), city: text(60), pin: pin.optional().default(''), email: email.or(z.literal('')), phone, autoApprove: z.boolean().optional(),
  pan: z.string().trim().toUpperCase().regex(/^([A-Z]{5}[0-9]{4}[A-Z])?$/, 'That PAN does not look right').optional().default(''),
  website: text(120).optional().default(''), state: stateCode.optional().default(''),
  upiId: z.string().trim().regex(/^([\w.-]{2,64}@[A-Za-z]{2,32})?$/, 'A UPI ID looks like name@bank').optional().default(''),
  bankName: text(80).optional().default(''), accountName: text(100).optional().default(''),
  accountNo: z.string().trim().regex(/^[0-9]{0,18}$/, 'Account numbers are digits only').optional().default(''),
  ifsc: z.string().trim().toUpperCase().regex(/^([A-Z]{4}0[A-Z0-9]{6})?$/, 'An IFSC looks like HDFC0001234').optional().default(''),
  profession: z.string().regex(/^[a-z_]{2,24}$/).optional().default('general'),
})
export const signatureBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('typed'), text: text(60).min(1), font: z.enum(['great-vibes', 'allura', 'caveat', 'dancing-script', 'sacramento', 'parisienne']) }),
  z.object({ kind: z.literal('image'), image: z.string().max(280_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Use a PNG, JPG or WebP image under 200 KB') }),
])
export const clientProfileBody = z.object({ name: text(80).min(1), phone, company: text(100), gstin, address: text(200), city: text(60), pin, state: stateCode.optional().default(''), honorific: honorific.optional().default(''), area: text(100).optional().default(''), pan: pan.optional().default('') })

export const inviteBody = z.object({
  name: text(80).min(1), email: email.or(z.literal('')), phone, company: text(100).optional().default(''), groupId: z.string().nullable(),
  gstin: gstin.optional().default(''), state: stateCode.optional().default(''), honorific: honorific.optional().default(''), attention: text(80).optional().default(''),
  address: text(200).optional().default(''), area: text(100).optional().default(''), city: text(60).optional().default(''), pin: pin.optional().default(''), pan: pan.optional().default(''),
}).refine((v) => v.email || v.phone, { message: 'Add an email or a WhatsApp number so we can reach them', path: ['email'] })
export const linkPatch = z.object({ groupId: z.string().nullable().optional(), name: text(80).min(1).optional(), company: text(100).optional(), gstin: gstin.optional(), city: text(60).optional(), address: text(200).optional(), state: stateCode.optional(),
  honorific: honorific.optional(), attention: text(80).optional(), area: text(100).optional(), pin: pin.optional(), pan: pan.optional(), logo: imageData.or(z.literal('')).optional(), email: email.or(z.literal('')).optional(), phone: phone.optional() })

export const itemSchema = z.object({ id: z.string().max(40), desc: text(300), qty: z.number().min(0).max(1_000_000), rate: z.number().int().min(0).max(100_000_000_00, 'Rates can be up to ₹10 crore'), unit: text(24).optional().default('') })
export const invoiceBody = z.object({
  linkId: z.string(), typeId: z.string(), theme: z.string().min(1).max(30),
  items: z.array(itemSchema).min(1).max(60), fields: z.record(z.string(), text(500)),
  gstPct: z.number().min(0).max(28), discount: z.number().int().min(0), advance: z.number().int().min(0),
  issued: z.string().datetime(), due: z.string().datetime(), note: text(600),
  project: text(200).optional().default(''), terms: z.array(text(600)).max(40).optional().default([]), taxInclusive: z.boolean().optional().default(false),
  extra: z.unknown().optional(),
})
export const paymentEditBody = z.object({ amount: z.number().int().min(1), method: z.enum(['upi', 'bank', 'cash', 'cheque', 'card', 'other']), ref: text(80), note: text(300).default(''), paidAt: z.string().datetime() })
export const paymentVoidBody = z.object({ reason: text(200).default('') })
export const paymentBody = z.object({ amount: z.number().int().min(1), method: z.enum(['upi', 'bank', 'cash', 'cheque', 'card', 'other']), ref: text(80), paidAt: z.string().datetime().optional(),
  kind: z.enum(['payment', 'advance', 'tds', 'writeoff', 'refund']).default('payment'), note: text(300).optional().default('') })
export const claimBody = z.object({ amount: z.number().int().min(1), ref: text(80), method: z.enum(['upi', 'card', 'cash', 'bank', 'cheque', 'other']).default('other') })
export const sendBody = z.object({ delivery: z.enum(['shakeslip', 'pdf']).default('shakeslip'), needsAccept: z.boolean().default(false) })
export const acceptBody = z.object({ name: z.string().trim().min(2, 'Type your full name to sign').max(80, 'That name is too long'), signature: z.string().max(300_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'That signature could not be read').optional() })
export const changeBody = z.object({
  message: z.string().trim().max(500).default(''),
  pins: z.array(z.object({ page: z.number().int().min(0).max(9), x: z.number().min(0).max(100), y: z.number().min(0).max(100), text: z.string().trim().min(1, 'Write what is wrong at each mark').max(200) })).max(20).default([]),
}).refine((b) => b.message.length > 0 || b.pins.length > 0, { message: 'Tell them what needs to change, or mark it on the invoice.' })
export const messageBody = z.object({ message: text(500).min(1) })
export const codeBody = z.object({ code: text(60).min(2) })

export const forgotBody = z.object({ email })
export const resetBody = z.object({ token: z.string().min(10).max(100), password: z.string().min(10, 'Use at least 10 characters').max(200) })
