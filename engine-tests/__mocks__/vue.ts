// Minimal Vue ref() shim for Jest — no reactive runtime needed
export const ref = <T>(value: T) => ({ value })
export const computed = (fn: () => unknown) => ({ value: fn() })
export const reactive = <T extends object>(obj: T): T => obj
