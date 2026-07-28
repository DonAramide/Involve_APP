export enum PaymentIntentState {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum PaymentAttemptState {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export class PaymentStateMachine {
  private static intentTransitions: Record<PaymentIntentState, PaymentIntentState[]> = {
    [PaymentIntentState.CREATED]: [PaymentIntentState.PENDING, PaymentIntentState.FAILED],
    [PaymentIntentState.PENDING]: [PaymentIntentState.PROCESSING, PaymentIntentState.FAILED],
    [PaymentIntentState.PROCESSING]: [PaymentIntentState.SUCCEEDED, PaymentIntentState.FAILED],
    [PaymentIntentState.SUCCEEDED]: [],
    [PaymentIntentState.FAILED]: [PaymentIntentState.PENDING], // Allow retry
  };

  private static attemptTransitions: Record<PaymentAttemptState, PaymentAttemptState[]> = {
    [PaymentAttemptState.PENDING]: [PaymentAttemptState.PROCESSING, PaymentAttemptState.FAILED],
    [PaymentAttemptState.PROCESSING]: [PaymentAttemptState.SUCCEEDED, PaymentAttemptState.FAILED],
    [PaymentAttemptState.SUCCEEDED]: [],
    [PaymentAttemptState.FAILED]: [],
  };

  static canTransitionIntent(from: PaymentIntentState, to: PaymentIntentState): boolean {
    return this.intentTransitions[from]?.includes(to) ?? false;
  }

  static transitionIntent(from: PaymentIntentState, to: PaymentIntentState): PaymentIntentState {
    if (!this.canTransitionIntent(from, to)) {
      throw new Error(`Invalid payment intent state transition from ${from} to ${to}`);
    }
    return to;
  }

  static canTransitionAttempt(from: PaymentAttemptState, to: PaymentAttemptState): boolean {
    return this.attemptTransitions[from]?.includes(to) ?? false;
  }

  static transitionAttempt(from: PaymentAttemptState, to: PaymentAttemptState): PaymentAttemptState {
    if (!this.canTransitionAttempt(from, to)) {
      throw new Error(`Invalid payment attempt state transition from ${from} to ${to}`);
    }
    return to;
  }
}
