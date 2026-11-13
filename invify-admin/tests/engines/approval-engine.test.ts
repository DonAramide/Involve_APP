/**
 * ApprovalEngine — API client contract tests.
 * Engine is backend-backed; maker-checker enforcement is server/UI (see fee publish OTP).
 */

jest.mock('vue', () => ({
  ref: (v: unknown) => ({ value: v }),
}))

jest.mock('../../src/services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const fetchMock = jest.fn()
;(global as any).fetch = fetchMock
;(global as any).localStorage = {
  getItem: jest.fn(() => 'test-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

import { ApprovalEngine } from '../../src/services/ApprovalEngine'

const makerEmail = 'operations_team@invify.app'
const checkerEmail = 'compliance_officer@invify.app'
const approverEmail = 'ciso@invify.app'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: async () => body,
  })
}

describe('ApprovalEngine — API client contract', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).includes('/api/v1/approvals') && (!init || !init.method || init.method === 'GET')) {
        return jsonResponse([])
      }
      return jsonResponse({})
    })
  })

  test('submitApproval POSTs payload and returns API approval', async () => {
    const created = {
      approvalId: 'APP-2026-0001',
      approvalType: 'Settlement Release',
      entityType: 'Settlement Batch',
      entityId: 'SET-TEST-001',
      maker: makerEmail,
      checker: null,
      approver: null,
      status: 'Submitted',
      riskScore: 80,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      slaDeadline: new Date().toISOString(),
      auditTrail: [{ action: 'Request Created', actor: makerEmail, integrityHash: '0x' + 'a'.repeat(32), timestamp: new Date().toISOString(), ipAddress: '', location: '' }],
    }
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse(created)
      return jsonResponse([])
    })

    const request = await ApprovalEngine.submitApproval({
      approvalType: 'Settlement Release',
      entityType: 'Settlement Batch',
      entityId: 'SET-TEST-001',
      maker: makerEmail,
      riskScore: 80,
      priority: 'High',
    })

    expect(request).toEqual(created)
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST')
    expect(post).toBeDefined()
    expect(String(post![0])).toContain('/api/v1/approvals')
    const body = JSON.parse(String(post![1].body))
    expect(body.maker).toBe(makerEmail)
    expect(body.entityId).toBe('SET-TEST-001')
  })

  test('updateStatus PATCHes actor+status to server (maker-checker enforced server-side)', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return jsonResponse({ ok: true })
      return jsonResponse([
        {
          approvalId: 'APP-2026-0002',
          status: 'Under Review',
          maker: makerEmail,
          checker: checkerEmail,
          approver: null,
          auditTrail: [],
        },
      ])
    })

    await ApprovalEngine.updateStatus('APP-2026-0002', 'Under Review', checkerEmail)

    const patch = fetchMock.mock.calls.find((c) => c[1]?.method === 'PATCH')
    expect(patch).toBeDefined()
    expect(String(patch![0])).toContain('/api/v1/approvals/APP-2026-0002/status')
    expect(JSON.parse(String(patch![1].body))).toEqual({
      status: 'Under Review',
      actor: checkerEmail,
    })
  })

  test('self-approval attempt still forwards maker as actor — server must reject', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return jsonResponse({ message: 'Maker cannot approve own request' }, false, 403)
      }
      return jsonResponse([])
    })

    const result = await ApprovalEngine.updateStatus('APP-2026-0003', 'Approved', makerEmail)
    expect(result).toEqual(
      expect.objectContaining({
        error: 'API_ERROR',
        message: expect.stringMatching(/Maker cannot approve/i),
      }),
    )
  })

  test('getPendingCount counts Submitted + Under Review from cached list', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse([
        { approvalId: 'A1', status: 'Submitted' },
        { approvalId: 'A2', status: 'Under Review' },
        { approvalId: 'A3', status: 'Approved' },
      ]),
    )
    // Force a refresh path via updateStatus GET refresh
    await ApprovalEngine.updateStatus('A1', 'Submitted', approverEmail)
    expect(ApprovalEngine.getPendingCount()).toBeGreaterThanOrEqual(2)
  })
})
