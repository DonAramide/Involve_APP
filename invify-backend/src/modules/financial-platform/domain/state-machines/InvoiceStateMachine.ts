export enum InvoiceState {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID', // Pseudo-state or actual state depending on implementation
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED',
}

export class InvoiceStateMachine {
  private static transitions: Record<InvoiceState, InvoiceState[]> = {
    [InvoiceState.DRAFT]: [InvoiceState.ISSUED, InvoiceState.CANCELLED],
    [InvoiceState.ISSUED]: [InvoiceState.PARTIALLY_PAID, InvoiceState.CLOSED, InvoiceState.OVERDUE, InvoiceState.CANCELLED],
    [InvoiceState.PARTIALLY_PAID]: [InvoiceState.CLOSED, InvoiceState.OVERDUE, InvoiceState.CANCELLED],
    [InvoiceState.OVERDUE]: [InvoiceState.PARTIALLY_PAID, InvoiceState.CLOSED, InvoiceState.CANCELLED],
    [InvoiceState.CANCELLED]: [],
    [InvoiceState.CLOSED]: [],
  };

  static canTransition(from: InvoiceState, to: InvoiceState): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: InvoiceState, to: InvoiceState): InvoiceState {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid invoice state transition from ${from} to ${to}`);
    }
    return to;
  }
}
