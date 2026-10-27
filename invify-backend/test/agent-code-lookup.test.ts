const maybeSingle = jest.fn()

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            maybeSingle,
          }),
        }),
      }),
    }),
  },
}))

import { lookupAgentCode } from '../src/utils/agent-code'

describe('lookupAgentCode', () => {
  beforeEach(() => {
    maybeSingle.mockReset()
  })

  test('rejects an empty code', async () => {
    const result = await lookupAgentCode('   ')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Agent code is required')
    expect(maybeSingle).not.toHaveBeenCalled()
  })

  test('accepts Invify default AAA000 when it is in the agents table', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: '1', agent_code: 'AAA000', first_name: 'Invify', last_name: 'Default', status: 'ACTIVE', deleted_at: null },
      error: null,
    })
    const result = await lookupAgentCode('aaa000')
    expect(result.valid).toBe(true)
    expect(result.isDefault).toBe(true)
    expect(result.exists).toBe(true)
  })

  test('accepts Invify default AAA000 even when it is missing from the table', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await lookupAgentCode('AAA000')
    expect(result.valid).toBe(true)
    expect(result.isDefault).toBe(true)
    expect(result.agentName).toBe('Invify')
  })

  test('rejects an unknown field agent', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await lookupAgentCode('RET999')
    expect(result.valid).toBe(false)
    expect(result.exists).toBe(false)
    expect(result.error).toBe('This agent code does not exist')
  })

  test('rejects a suspended agent', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: '2', agent_code: 'RET102', first_name: 'Lagos', last_name: 'Retail', status: 'SUSPENDED', deleted_at: null },
      error: null,
    })
    const result = await lookupAgentCode('RET102')
    expect(result.valid).toBe(false)
    expect(result.exists).toBe(true)
    expect(result.error).toBe('This agent is not active')
  })

  test('accepts an active field agent from the agents table', async () => {
    maybeSingle.mockResolvedValue({
      data: { id: '3', agent_code: 'ADA001', first_name: 'Ada', last_name: 'Obi', status: 'ACTIVE', deleted_at: null },
      error: null,
    })
    const result = await lookupAgentCode('ada001')
    expect(result.valid).toBe(true)
    expect(result.exists).toBe(true)
    expect(result.agentName).toBe('Ada Obi')
  })
})
