import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../css/LoginModal.css';
import axios from 'axios';

const LoginModal = ({
  onAuthSuccess,
  onContinueWithoutLogin,
  allowContinueWithoutLogin = false,
  showForgotPassword = false,
  onClose,
}) => {
  const [mode, setMode] = useState('login'); // 'login', 'signup', or 'forgot'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  // Spinner/timer/polling states
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(150); // 150 seconds
  const [showTimer, setShowTimer] = useState(false);

  const [emailNotVerified, setEmailNotVerified] = useState(false);

  // For forgot password polling and timer
  const [resetVerified, setResetVerified] = useState(false);
  const [resetPolling, setResetPolling] = useState(false);
  const resetPollingIntervalRef = useRef(null);
  const resetPollingTimeoutRef = useRef(null);
  const [resetTimer, setResetTimer] = useState(150);
  const [showResetTimer, setShowResetTimer] = useState(false);
  const [resetTimeout, setResetTimeout] = useState(false);
  //const [resetTokenVersion, setResetTokenVersion] = useState(null);

  // Detect email verification from URL (?verified=true)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      setIsVerified(true);
      setMode('login');
      setSuccessMessage('');
      setError('');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('reset_verified') === 'true') {
      setResetVerified(true);
      setResetPolling(false);
      setShowResetTimer(false);
      setIsSubmitting(false);
      setMode('forgot'); // Stay in forgot mode to show success
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Cleanup polling and timer on unmount
  useEffect(() => {
    return () => {
      clearInterval(pollingIntervalRef.current);
      clearTimeout(pollingTimeoutRef.current);
      clearInterval(resetPollingIntervalRef.current);
      clearTimeout(resetPollingTimeoutRef.current);
    };
  }, []);

  // TIMER: Countdown effect for signup
  useEffect(() => {
    let interval;
    if (showTimer && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    if (timer === 0) {
      setShowTimer(false);
      setIsSubmitting(false);
      setIsPolling(false);
      clearInterval(pollingIntervalRef.current);
      setEmailNotVerified(true); // Show not verified message
    }
    return () => clearInterval(interval);
  }, [showTimer, timer]);

  // TIMER: Countdown effect for forgot password
  useEffect(() => {
    let interval;
    if (showResetTimer && resetTimer > 0) {
      interval = setInterval(() => setResetTimer((t) => t - 1), 1000);
    }
    if (resetTimer === 0) {
      setShowResetTimer(false);
      setIsSubmitting(false);
      setResetPolling(false);
      clearInterval(resetPollingIntervalRef.current);
      setResetTimeout(true); // Show reset timeout message
    }
    return () => clearInterval(interval);
  }, [showResetTimer, resetTimer]);

  // Function to start polling verification status (signup)
  const startPolling = (userEmail) => {
    setIsPolling(true);
    setEmailNotVerified(false); // Reset message on new polling
    const pollVerificationStatus = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/verify-status`,
          { params: { email: userEmail } }
        );
        if (response.data.isVerified) {
          setIsVerified(true);
          setIsPolling(false);
          setShowTimer(false);
          setIsSubmitting(false);
          clearInterval(pollingIntervalRef.current);
          clearTimeout(pollingTimeoutRef.current);
          setEmailNotVerified(false);
        }
      } catch (error) {
        // Optionally handle polling errors here
      }
    };

    pollVerificationStatus();
    pollingIntervalRef.current = setInterval(pollVerificationStatus, 5000);

    pollingTimeoutRef.current = setTimeout(() => {
      setIsPolling(false);
      setShowTimer(false);
      setIsSubmitting(false);
      clearInterval(pollingIntervalRef.current);
      setEmailNotVerified(true); // Show not verified message after timeout
    }, 150000); // 150 seconds timeout
  };

  // Function to start polling for forgot password reset confirmation
  const startResetPolling = (userEmail, userTokenVersion) => {
    setResetPolling(true);
    setResetVerified(false);
    setShowResetTimer(true);
    setResetTimer(150);
    setResetTimeout(false);

    const pollResetStatus = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/check-reset-verification`,
          { params: { email: userEmail, tokenVersion: userTokenVersion } }
        );
        if (response.data.resetVerified) {
          setResetVerified(true);
          setResetPolling(false);
          setShowResetTimer(false);
          setIsSubmitting(false);
          clearInterval(resetPollingIntervalRef.current);
          clearTimeout(resetPollingTimeoutRef.current);
        }
      } catch (error) {
        // Optionally handle polling errors here
      }
    };

    pollResetStatus();
    resetPollingIntervalRef.current = setInterval(pollResetStatus, 5000);

    resetPollingTimeoutRef.current = setTimeout(() => {
      setResetPolling(false);
      setShowResetTimer(false);
      setIsSubmitting(false);
      clearInterval(resetPollingIntervalRef.current);
      setResetTimeout(true); // Show reset timeout message after timeout
    }, 150000); // 150 seconds timeout
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setEmailNotVerified(false); // Reset message on submit
    setResetTimeout(false); // Reset forgot password timeout message

    if (!email || !password || (mode === 'signup' && !username)) {
      setError('Please fill all fields.');
      return;
    }

    try {
      let response;
      if (mode === 'login') {
        setIsSubmitting(true);
        response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`,
          { email, password }
        );
        const { token } = response.data;
        onAuthSuccess(token);
        setIsSubmitting(false);
      } else if (mode === 'signup') {
        setIsSubmitting(true); // Disable button and show spinner instantly
        setShowTimer(true);    // Show timer instantly
        setTimer(150);         // Reset timer to 150 seconds

        response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/signup`,
          { username, email, password }
        );
        setSuccessMessage(
          'Signup successful! Please check your email to verify your account.'
        );
        setUsername('');
        setEmail(email); // keep email for polling
        setPassword('');
        startPolling(email);
        // Keep isSubmitting true until verification or timer ends
      } else if (mode === 'forgot') {
        setIsSubmitting(true);
        setShowResetTimer(true);
        setResetTimer(150);
        response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/reset`,
          { email, password }
        );
        setSuccessMessage('Password reset email sent! Please check your email to confirm.');
        setEmail(email); // Keep email for polling
        setPassword('');
        const tokenVersion = response.data.tokenVersion || 0;
        //setResetTokenVersion(tokenVersion);
        startResetPolling(email, tokenVersion);
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Something went wrong.';
      setError(message);
      setIsSubmitting(false);
      setShowTimer(false);
      setShowResetTimer(false);
    }
  };

  // Reset error and success when mode changes
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setUsername('');
    setEmail('');
    setPassword('');
    setIsSubmitting(false);
    setShowTimer(false);
    setTimer(150);
    setIsPolling(false);
    setEmailNotVerified(false);
    setResetVerified(false);
    setResetPolling(false);
    setShowResetTimer(false);
    setResetTimer(150);
    setResetTimeout(false);
    //setResetTokenVersion(null);
    clearInterval(pollingIntervalRef.current);
    clearTimeout(pollingTimeoutRef.current);
    clearInterval(resetPollingIntervalRef.current);
    clearTimeout(resetPollingTimeoutRef.current);
  };

  // Verification Success UI (for signup)
  const VerificationSuccess = () => (
    <div className="verification-success">
      <svg viewBox="0 0 100 100" className="checkmark">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#4CAF50" strokeWidth="5" />
        <path fill="none" stroke="#4CAF50" strokeWidth="8" d="M30 55 l15 15 l25 -30" />
      </svg>
      <h3>Email Verified Successfully!</h3>
      <button
        className="login-modal-submit"
        onClick={() => {
          setIsVerified(false);
          switchMode('login');
        }}
      >
        Login
      </button>
    </div>
  );

  // Password Reset Success UI
  const ResetSuccess = () => (
    <div className="verification-success">
      <svg viewBox="0 0 100 100" className="checkmark">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#4CAF50" strokeWidth="5" />
        <path fill="none" stroke="#4CAF50" strokeWidth="8" d="M30 55 l15 15 l25 -30" />
      </svg>
      <h3>Password reset!</h3>
      <p style={{marginBottom: 16}}>You can now login.</p>
      <button
        className="login-modal-link"
        onClick={() => switchMode('login')}
        style={{fontSize: '1.07rem'}}
      >
        Sign In
      </button>
    </div>
  );

  // Improved Email Not Verified UI after timeout (sign up)
  const EmailNotVerifiedMessage = () => (
    <div className="login-modal-success email-not-verified">
      <svg
        width="48"
        height="48"
        viewBox="0 0 60 60"
        className="email-not-verified-icon"
        aria-hidden="true"
      >
        <circle cx="30" cy="30" r="26" fill="#fff" stroke="#d7263d" strokeWidth="3" />
        <line x1="20" y1="20" x2="40" y2="40" stroke="#d7263d" strokeWidth="3" strokeLinecap="round" />
        <line x1="40" y1="20" x2="20" y2="40" stroke="#d7263d" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="email-not-verified-title">
        Email not verified.
      </p>
      <p className="email-not-verified-desc">
        Didn't get the email? Check your spam folder or{' '}
        <button
          className="login-modal-link"
          type="button"
          onClick={() => switchMode('signup')}
        >
          sign up
        </button>
        {' '}again.
      </p>
    </div>
  );

  // Forgot Password Timeout UI after timer runs out
  const ResetTimeoutMessage = () => (
    <div className="login-modal-success email-not-verified">
      <svg
        width="48"
        height="48"
        viewBox="0 0 60 60"
        className="email-not-verified-icon"
        aria-hidden="true"
      >
        <circle cx="30" cy="30" r="26" fill="#fff" stroke="#d7263d" strokeWidth="3" />
        <line x1="20" y1="20" x2="40" y2="40" stroke="#d7263d" strokeWidth="3" strokeLinecap="round" />
        <line x1="40" y1="20" x2="20" y2="40" stroke="#d7263d" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="email-not-verified-title">
        Password reset not verified.
      </p>
      <p className="email-not-verified-desc">
        You didn't verify your password reset. Please check your spam folder or{' '}
        <button
          className="login-modal-link"
          type="button"
          onClick={() => switchMode('forgot')}
        >
          reset password
        </button>
        {' '}again.
      </p>
    </div>
  );

  // Spinner and Timer shown during signup waiting
  const SpinnerWithTimer = () => (
    <div className="spinner">
      <div className="loader"></div>
      <p>Verify your email to continue.</p>
      {showTimer && (
        <div className="login-modal-timer">
          Time left: {timer}s
        </div>
      )}
    </div>
  );

  // Spinner and Timer for forgot password reset
  const ResetSpinnerWithTimer = () => (
    <div className="spinner">
      <div className="loader"></div>
      <p>Check your email and confirm your password reset.</p>
      {showResetTimer && (
        <div className="login-modal-timer">
          Time left: {resetTimer}s
        </div>
      )}
    </div>
  );

  const modalContent = (
    <div className="login-modal-overlay">
      <div className="login-modal-card">
        <button
          className="login-modal-close"
          aria-label="Close"
          onClick={onClose}
          style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'transparent',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        &times;
        </button>
        {/* Forgot password reset success */}
        {resetTimeout ? (
          <ResetTimeoutMessage />
        ) : resetVerified ? (
          <ResetSuccess />
        ) : emailNotVerified ? (
          <EmailNotVerifiedMessage />
        ) : isPolling || (isSubmitting && mode === 'signup' && showTimer) ? (
          <SpinnerWithTimer />
        ) : resetPolling || (isSubmitting && mode === 'forgot' && showResetTimer) ? (
          <ResetSpinnerWithTimer />
        ) : isVerified ? (
          <VerificationSuccess />
        ) : successMessage ? (
          <div className="login-modal-success">
            <p>{successMessage}</p>
            <button className="login-modal-link" onClick={() => switchMode('login')}>
              Return to Login
            </button>
          </div>
        ) : (
          <>
            <h2>
              {mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Sign Up'
                : 'Reset Password'}
            </h2>
            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
                <input
                  type="password"
                  placeholder={mode === 'forgot' ? 'New Password' : 'Password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}

              {error && <div className="login-modal-error">{error}</div>}
              <button
                type="submit"
                className="login-modal-submit"
                disabled={isSubmitting}
              >
                {isSubmitting && mode === 'signup' && showTimer ? (
                  <span>
                    <span className="loader" style={{verticalAlign: 'middle', marginRight: 8}}></span>
                    Verifying Email...
                  </span>
                ) : isSubmitting && mode === 'forgot' && showResetTimer ? (
                  <span>
                    <span className="loader" style={{verticalAlign: 'middle', marginRight: 8}}></span>
                    Sending Reset Email...
                  </span>
                ) : mode === 'login'
                  ? 'Sign In'
                  : mode === 'signup'
                  ? 'Sign Up'
                  : 'Reset Password'}
              </button>
            </form>
            <div className="login-modal-links-group">
              {mode === 'login' && showForgotPassword && (
                <div
                  className="login-modal-forgot"
                  onClick={() => switchMode('forgot')}
                  tabIndex={0}
                  role="button"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') switchMode('forgot');
                  }}
                >
                  Forgot Password?
                </div>
              )}
              {mode === 'login' ? (
                <p>
                  New user?{' '}
                  <button
                    className="login-modal-link"
                    type="button"
                    onClick={() => switchMode('signup')}
                  >
                    Sign up
                  </button>
                </p>
              ) : mode === 'signup' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    className="login-modal-link"
                    type="button"
                    onClick={() => switchMode('login')}
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  Remembered your password?{' '}
                  <button
                    className="login-modal-link"
                    type="button"
                    onClick={() => switchMode('login')}
                  >
                    Sign in
                  </button>
                </p>
              )}
              {allowContinueWithoutLogin && mode === 'login' && (
                <p
                  className="login-modal-stay-logged-out"
                  onClick={onContinueWithoutLogin}
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onContinueWithoutLogin();
                  }}
                >
                  Stay logged out
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default LoginModal;
