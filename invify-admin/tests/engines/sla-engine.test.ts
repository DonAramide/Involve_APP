/**
 * SLAEngine — API client contract tests (track + refresh).
 */

jest.mock('vue', () => ({
  ref: (v: unknown) => ({ value: v }),
}))

jest.mock('../../src/services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock('../../src/services/NotificationEngine', () => ({
  NotificationEngine: {
    send: jest.fn(),
    getUnreadCount: jest.fn(() => 0),
    hasCriticalUnread: jest.fn(() => false),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}))

jest.mock('../../src/services/SLAEscalationService', () => ({
  SLAEscalationService: {
    escalate: jest.fn(),
  },
}))

const fetchMock = jest.fn()
;(global as any).fetch = fetchMock
;(global as any).localStorage = {
  getItem: jest.fn(() => 'test-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

import { SLAEngine } from '../../src/services/SLAEngine'

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  })
}

describe('SLAEngine — API client contract', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(() => jsonResponse([]))
  })

  test('track POSTs SLAEvent to /api/v1/slas/track', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse({ ok: true })
      return jsonResponse([])
    })

    await SLAEngine.track({
      entityId: 'SET-1',
      entityType: 'Settlement',
      entityReference: 'SET-1',
      module: 'finance',
      category: 'settlement',
      priority: 'High',
      assignedTo: 'ops@invify.app',
    })

    const post = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST')
    expect(post).toBeDefined()
    expect(String(post![0])).toContain('/api/v1/slas/track')
    const body = JSON.parse(String(post![1].body))
    expect(body.entityId).toBe('SET-1')
    expect(body.priority).toBe('High')
  })

  test('track does not throw when API is unavailable', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network')))
    await expect(
      SLAEngine.track({
        entityId: 'X',
        entityType: 'Case',
        entityReference: 'X',
        module: 'ops',
        category: 'case',
        priority: 'Low',
        assignedTo: 'ops@invify.app',
      }),
    ).resolves.toBeUndefined()
  })
})
