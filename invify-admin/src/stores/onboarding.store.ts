import { defineStore } from 'pinia';
import axios from 'axios';

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    // Registration State
    userDetails: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
    
    // Verification State
    emailVerified: false,
    phoneVerified: false,
    
    // OTP Resend Cooldowns (timestamp when next resend is allowed)
    emailResendAvailableAt: 0,
    whatsappResendAvailableAt: 0,
    
    // Activation
    accountActivated: false,
    isLoading: false,
    error: null as string | null,
  }),

  actions: {
    setLoading(status: boolean) {
      this.isLoading = status;
    },
    setError(err: string | null) {
      this.error = err;
    },
    
    startEmailCooldown() {
      // 60 seconds cooldown
      this.emailResendAvailableAt = Date.now() + 60 * 1000;
    },

    startWhatsappCooldown() {
      this.whatsappResendAvailableAt = Date.now() + 60 * 1000;
    },

    async sendEmailOtp() {
      this.setLoading(true);
      this.setError(null);
      try {
        await axios.post('/auth/send-email-otp', { email: this.userDetails.email });
        this.startEmailCooldown();
      } catch (err: any) {
        this.setError(err.response?.data?.message || 'Failed to send email OTP');
        throw err;
      } finally {
        this.setLoading(false);
      }
    },

    async verifyEmailOtp(otp: string) {
      this.setLoading(true);
      this.setError(null);
      try {
        await axios.post('/auth/verify-email-otp', { email: this.userDetails.email, otp });
        this.emailVerified = true;
      } catch (err: any) {
        this.setError(err.response?.data?.message || 'Failed to verify email OTP');
        throw err;
      } finally {
        this.setLoading(false);
      }
    },

    async sendWhatsappOtp() {
      this.setLoading(true);
      this.setError(null);
      try {
        await axios.post('/auth/send-whatsapp-otp', { phone: this.userDetails.phone });
        this.startWhatsappCooldown();
      } catch (err: any) {
        this.setError(err.response?.data?.message || 'Failed to send WhatsApp OTP');
        throw err;
      } finally {
        this.setLoading(false);
      }
    },

    async verifyWhatsappOtp(otp: string) {
      this.setLoading(true);
      this.setError(null);
      try {
        await axios.post('/auth/verify-whatsapp-otp', { phone: this.userDetails.phone, otp });
        this.phoneVerified = true;
      } catch (err: any) {
        this.setError(err.response?.data?.message || 'Failed to verify WhatsApp OTP');
        throw err;
      } finally {
        this.setLoading(false);
      }
    },

    async completeRegistration() {
      this.setLoading(true);
      this.setError(null);
      try {
        await axios.post('/public/onboarding/signup', {
          ...this.userDetails,
          emailVerified: this.emailVerified,
          phoneVerified: this.phoneVerified,
        });
        this.accountActivated = true;
      } catch (err: any) {
        this.setError(err.response?.data?.error || 'Registration failed');
        throw err;
      } finally {
        this.setLoading(false);
      }
    }
  }
});
