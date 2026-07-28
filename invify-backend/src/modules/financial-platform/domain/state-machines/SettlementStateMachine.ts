export enum SettlementState {
  PAID = 'PAID',
  SETTLEMENT_PENDING = 'SETTLEMENT_PENDING',
  SETTLED = 'SETTLED',
  RECONCILED = 'RECONCILED',
}

export class SettlementStateMachine {
  private static transitions: Record<SettlementState, SettlementState[]> = {
    [SettlementState.PAID]: [SettlementState.SETTLEMENT_PENDING],
    [SettlementState.SETTLEMENT_PENDING]: [SettlementState.SETTLED],
    [SettlementState.SETTLED]: [SettlementState.RECONCILED],
    [SettlementState.RECONCILED]: [],
  };

  static canTransition(from: SettlementState, to: SettlementState): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: SettlementState, to: SettlementState): SettlementState {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid settlement state transition from ${from} to ${to}`);
    }
    return to;
  }
}
