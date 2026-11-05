import fs from 'fs'
import path from 'path'

describe('agent commission override dropdown', () => {
  test('maps camelCase listAgents fields instead of first_name/agent_code only', () => {
    const page = fs.readFileSync(
      path.join(__dirname, '../src/pages/admin/AgentCommissionsPage.vue'),
      'utf8',
    )
    expect(page).toContain('function toAgentOption')
    expect(page).toContain('agent?.agentCode')
    expect(page).toContain('agent?.name')
    expect(page).not.toContain('label: `${a.agent_code} - ${a.first_name} ${a.last_name}`')
  })
})
