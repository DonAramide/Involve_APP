import React, { useState, useEffect } from 'react';

export default function WhatsAppVerification() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone Entry, 2 = OTP Entry, 3 = Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && timeLeft === 0) {
      setCanResend(true);
    }
  }, [step, timeLeft]);

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3004/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      
      setStep(2);
      setTimeLeft(30);
      setCanResend(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3004/auth/verify-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      
      localStorage.setItem('tenantToken', data.token);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>WhatsApp Verification</h2>
      
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      
      {step === 1 && (
        <div>
          <label>Enter your WhatsApp Number:</label>
          <input 
            type="text" 
            placeholder="+2348012345678" 
            value={phone} 
            onChange={e => setPhone(e.target.value)}
            style={{ width: '100%', padding: 8, margin: '10px 0' }}
          />
          <button onClick={sendOtp} disabled={loading} style={{ width: '100%', padding: 10 }}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p>We sent a code to {phone} via WhatsApp.</p>
          <input 
            type="text" 
            placeholder="123456" 
            value={otp} 
            onChange={e => setOtp(e.target.value)}
            maxLength={6}
            style={{ width: '100%', padding: 8, margin: '10px 0', letterSpacing: 5, textAlign: 'center' }}
          />
          <button onClick={verifyOtp} disabled={loading || otp.length < 6} style={{ width: '100%', padding: 10 }}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            {canResend ? (
              <button onClick={sendOtp} disabled={loading} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
                Resend Code
              </button>
            ) : (
              <span style={{ color: 'gray' }}>Resend code in {timeLeft}s</span>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', color: 'green' }}>
          <h3>Verification Successful!</h3>
          <p>Your WhatsApp number has been verified.</p>
        </div>
      )}
    </div>
  );
}
