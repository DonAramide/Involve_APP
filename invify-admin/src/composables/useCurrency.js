import { ref } from 'vue'

const NAIRA = {
  name: 'Naira',
  code: 'NGN',
  symbol: '₦'
}

function readStoredCurrency() {
  try {
    const stored = JSON.parse(localStorage.getItem('platform_currency') || 'null')
    if (stored?.code === 'USD' || stored?.symbol === '$') return { ...NAIRA }
    if (stored?.code && stored?.symbol) return stored
  } catch {
    /* ignore */
  }
  return { ...NAIRA }
}

const currentCurrency = ref(readStoredCurrency())

export function useCurrency() {
  const setCurrency = (currency) => {
    currentCurrency.value = currency
    localStorage.setItem('platform_currency', JSON.stringify(currency))
    window.dispatchEvent(new Event('currency-changed'))
  }

  return {
    currencyName: currentCurrency.value.name,
    currencyCode: currentCurrency.value.code,
    currencySymbol: currentCurrency.value.symbol,
    currentCurrency,
    setCurrency
  }
}
