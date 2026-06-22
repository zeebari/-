export function usdToIqd(usd: number, rate: number): number {
  return Math.round(usd * rate)
}

export function iqdToUsd(iqd: number, rate: number): number {
  return iqd / rate
}

export function formatCurrency(amount: number, currency: 'USD' | 'IQD'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${amount.toLocaleString('ar-IQ')} د.ع`
}

export function convertAmount(amount: number, from: 'USD' | 'IQD', to: 'USD' | 'IQD', rate: number): number {
  if (from === to) return amount
  if (from === 'USD' && to === 'IQD') return usdToIqd(amount, rate)
  return iqdToUsd(amount, rate)
}
