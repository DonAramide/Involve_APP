import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dialog, Loading } from 'quasar'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './css/enterprise.css'

import App from './App.vue'
import router from './router'
import VueApexCharts from 'vue3-apexcharts'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(VueApexCharts)

app.use(Quasar, {
  plugins: { Notify, Dialog, Loading },
  config: {
    brand: {
      primary: '#1864ab',
      secondary: '#22b8cf',
      accent: '#7048e8',
      dark: '#12161a',
      darkPage: '#0b0f12',
      positive: '#2b8a3e',
      negative: '#c92a2a',
      info: '#339af0',
      warning: '#fcc419'
    }
  }
})

app.use(router)

app.mount('#app')
