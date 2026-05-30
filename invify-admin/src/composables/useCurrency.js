import { ref } from 'vue'

const currentCurrency = ref(JSON.parse(localStorage.getItem('platform_currency')) || {
  name: 'Naira',
  code: 'NGN',
  symbol: '₦'
})

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
