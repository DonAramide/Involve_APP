/**
 * Prompt the checker for a live authenticator code before a maker-checker action.
 * Returns the trimmed code, or null if cancelled / too short.
 */
export function promptCheckerMfa(dialog, options = {}) {
  const title = options.title || 'Checker 2FA required'
  const message =
    options.message ||
    'Enter the 6-digit code from your authenticator app to approve this request.'

  return new Promise((resolve) => {
    dialog({
      title,
      message,
      prompt: {
        model: '',
        type: 'text',
        label: '2FA / Google Authenticator code',
        outlined: true,
        maxlength: 8,
        autocomplete: 'one-time-code',
        inputmode: 'numeric',
        attrs: { 'data-testid': 'checker-mfa-input' },
      },
      cancel: { label: 'Cancel', color: 'grey-5', flat: true },
      ok: { label: options.okLabel || 'Verify & continue', color: options.okColor || 'cyan-6' },
      persistent: true,
      dark: true,
    })
      .onOk((value) => {
        const otp = String(value || '').replace(/\s/g, '')
        if (otp.length < 6) {
          resolve(null)
          return
        }
        resolve(otp)
      })
      .onCancel(() => resolve(null))
  })
}
