import { io } from 'socket.io-client'
import { eventBus } from './realtime'
import { publicApiOrigin } from '../config/env'

let socket = null

function authToken() {
  return localStorage.getItem('invify_token') || ''
}

function tenantId() {
  return localStorage.getItem('tenant_id') || ''
}

function dispatch(event, payload) {
  eventBus.dispatch({
    eventId: `${event}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event,
    version: 1,
    timestamp: new Date().toISOString(),
    sequenceNumber: Date.now(),
    correlationId: `${Date.now()}`,
    tenantId: tenantId(),
    payload: payload || {},
  })
}

export function ensureTenantRealtime() {
  if (typeof window === 'undefined') return null
  const token = authToken()
  if (!token) return null

  if (socket) {
    socket.auth = { token, tenantId: tenantId() }
    if (!socket.connected) socket.connect()
    return socket
  }

  socket = io(publicApiOrigin() || window.location.origin, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    upgrade: false,
    withCredentials: true,
    auth: { token, tenantId: tenantId() },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
  })

  socket.on('connect', () => {
    socket.emit('join_room', { tenantId: tenantId() })
  })

  ;[
    'finance.invoice.created',
    'finance.invoice.payment_recorded',
    'finance.sync.completed',
  ].forEach((name) => {
    socket.on(name, (payload) => dispatch(name, payload))
  })
  socket.on('payment.success', (payload) => dispatch('finance.payment.success', payload))
  socket.on('sync.events', (payload) => dispatch('finance.sync.completed', payload))
  socket.on('card.transaction', (payload) => dispatch('finance.card.transaction', payload))
  socket.on('withdrawable_updated', (payload) => dispatch('finance.wallet.updated', payload))

  return socket
}

export function stopTenantRealtime() {
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
  socket = null
}
