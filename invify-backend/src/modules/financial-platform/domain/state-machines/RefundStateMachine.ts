export enum RefundState {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export class RefundStateMachine {
  private static transitions: Record<RefundState, RefundState[]> = {
    [RefundState.REQUESTED]: [RefundState.PROCESSING, RefundState.FAILED],
    [RefundState.PROCESSING]: [RefundState.COMPLETED, RefundState.FAILED],
    [RefundState.COMPLETED]: [RefundState.REVERSED],
    [RefundState.FAILED]: [],
    [RefundState.REVERSED]: [],
  };

  static canTransition(from: RefundState, to: RefundState): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: RefundState, to: RefundState): RefundState {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid refund state transition from ${from} to ${to}`);
    }
    return to;
  }
}
