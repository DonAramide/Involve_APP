export function buildPrintPlan(people, mode) {
  if (!Array.isArray(people) || people.length < 1) {
    throw new Error('Choose at least one card to print.')
  }
  const rows = people.map((person, index) => {
    if (!person || !person.pairId) throw new Error('Each printed card needs a stable pair.')
    return { pairId: person.pairId, sequence: index, person }
  })
  if (mode === 'duplex') {
    return {
      mode: 'duplex',
      instruction: 'Duplex: print double-sided and flip on the long edge. This pairs each front with that same person\'s back. Printer support for automatic duplex varies.',
      pages: rows.flatMap((row) => [
        { pairId: row.pairId, sequence: row.sequence, side: 'front', pass: 1, person: row.person },
        { pairId: row.pairId, sequence: row.sequence, side: 'back', pass: 1, person: row.person }
      ])
    }
  }
  return {
    mode: 'manual',
    instruction: 'Manual two-pass: print pass 1 (all fronts). Put the same stack back into the printer without changing the order, then print pass 2 (all backs). Each back follows the same person order as the fronts.',
    pages: [
      ...rows.map((row) => ({ pairId: row.pairId, sequence: row.sequence, side: 'front', pass: 1, person: row.person })),
      ...rows.map((row) => ({ pairId: row.pairId, sequence: row.sequence, side: 'back', pass: 2, person: row.person }))
    ]
  }
}

export function pairsStayWithTheSamePerson(plan) {
  const fronts = plan.pages.filter((page) => page.side === 'front')
  const backs = plan.pages.filter((page) => page.side === 'back')
  if (fronts.length !== backs.length) return false
  return fronts.every((front, index) => {
    const back = backs.find((page) => page.pairId === front.pairId && page.sequence === front.sequence)
    return Boolean(back) && backs[index].pairId === front.pairId
  })
}
