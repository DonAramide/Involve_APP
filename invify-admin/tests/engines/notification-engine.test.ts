/**
 * NotificationEngine — API client contract tests.
 */

jest.mock('vue', () => ({
  ref: (v: unknown) => ({ value: v }),
}))

jest.mock('../../src/services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock('../../src/auth/session', () => ({
  readAccessToken: () => 'test-token',
}))

const fetchMock = jest.fn()
;(global as any).fetch = fetchMock

import { NotificationEngine } from '../../src/services/NotificationEngine'

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  })
}

describe('NotificationEngine — API client contract', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  test('constructor fetch normalizes is_read into Unread/Read status', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        data: [
          { id: 'n1', is_read: false, priority: 'CRITICAL', title: 'Critical alert' },
          { id: 'n2', is_read: true, priority: 'MEDIUM', title: 'Info' },
        ],
      }),
    )

    // Re-trigger fetch via send() which refreshes the list
    await NotificationEngine.send({ title: 'noop' })
    expect(NotificationEngine.getUnreadCount()).toBeGreaterThanOrEqual(1)
    expect(NotificationEngine.hasCriticalUnread()).toBe(true)
  })

  test('send refreshes /api/notifications with bearer token', async () => {
    fetchMock.mockImplementation(() => jsonResponse([]))
    await NotificationEngine.send({ title: 'test' })
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/notifications'))
    expect(call).toBeDefined()
    expect(call![1].headers.Authorization).toMatch(/Bearer test-token/)
  })

  test('subscribe receives current notification snapshot', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse([{ id: 'n3', status: 'Unread', priority: 'MEDIUM' }]),
    )
    await NotificationEngine.send({})
    const seen: any[] = []
    const cb = (rows: any[]) => {
      seen.push(rows)
    }
    NotificationEngine.subscribe(cb)
    expect(seen.length).toBeGreaterThanOrEqual(1)
    NotificationEngine.unsubscribe(cb)
  })
})
