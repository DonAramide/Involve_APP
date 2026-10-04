import { INVIFY_DEFAULT_AGENT_CODE, isInvifyDefaultAgentCode, isValidAgentCodeFormat, normalizeAgentCode } from '../src/utils/agent-code'

describe('agent-code helpers', () => {
  test('normalizes spacing and case', () => {
    expect(normalizeAgentCode('  ada001  ')).toBe('ADA001')
    expect(normalizeAgentCode(null)).toBe('')
  })

  test('recognizes Invify default AAA000', () => {
    expect(isInvifyDefaultAgentCode('aaa000')).toBe(true)
    expect(isInvifyDefaultAgentCode('AAA000')).toBe(true)
    expect(INVIFY_DEFAULT_AGENT_CODE).toBe('AAA000')
    expect(isInvifyDefaultAgentCode('RET102')).toBe(false)
  })

  test('accepts typical agent code formats', () => {
    expect(isValidAgentCodeFormat('AAA000')).toBe(true)
    expect(isValidAgentCodeFormat('RET102')).toBe(true)
    expect(isValidAgentCodeFormat('AG-1000')).toBe(true)
    expect(isValidAgentCodeFormat('AB')).toBe(false)
    expect(isValidAgentCodeFormat('NOT A CODE')).toBe(false)
  })
})
