import type { LineItem } from '../../lib/types'

export type Memory = { desc: string; rate: number; qty: number; uses: number }
export const blankLine = (): LineItem => ({ id: crypto.randomUUID(), desc: '', qty: 1, rate: 0, unit: '' })
