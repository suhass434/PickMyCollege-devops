import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import { sendVerificationEmail , sendResetEmail} from '../services/mailService.js';

// Signup handler
export const signup = async (req, res) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const CLIENT_URL_BACKEND = process.env.CLIENT_URL_BACKEND;

  try {
    console.log('Signup body:', req.body);
    console.log(JWT_SECRET)
    const { username, email, password } = req.body;
    let user = await User.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ message: 'User already exists. Please login.' });
      }
      user.username = username;
      user.password = hashedPassword;
      user.tokenVersion += 1;
      await user.save();
    } else {
      user = await User.create({
        email,
        username,
        password: hashedPassword,
        isVerified: false
      });
    }

    const payload = { id: user._id, tokenVersion: user.tokenVersion };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '20m' });
    // console.log(token)

    await sendVerificationEmail(email, `${CLIENT_URL_BACKEND}/api/auth/verify?token=${token}`);
    res.status(200).json({ message: 'Verification email sent.',
                            "token":token
                        });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

// Email verification handler
export const verifyEmail = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token missing.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('JWT verification error:', err.message);
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const { id, tokenVersion } = decoded;
    const user = await User.findById(id);

    if (!user) {
      return res.status(400).json({ message: 'Invalid verification link.' });
    }

    if (user.isVerified) {
      return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Already Verified | PickMyCollege</title>
  <style>
    :root {
      --primary-color: #28a745;
      --text-color: #2d3748;
      --background-color: #f7fafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background-color: var(--background-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
      color: var(--text-color);
      line-height: 1.6;
    }
    .message-card {
      background: white;
      padding: 2.5rem 1.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 480px;
      width: 100%;
      transition: transform 0.3s ease;
    }
    .message-card:hover { transform: translateY(-2px); }
    .info-icon {
      font-size: 4rem;
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      animation: scaleUp 0.6s cubic-bezier(0.68,-0.55,0.27,1.55);
    }
    h1 {
      color: var(--primary-color);
      margin-bottom: 1rem;
      font-size: 1.8rem;
      font-weight: 700;
    }
    .main-message {
      font-size: 1.13rem;
      margin-bottom: 2rem;
      color: #2d3748;
      font-weight: 500;
    }
    .redirect-message {
      font-size: 0.97rem;
      color: #aaa;
      margin-top: 1.1rem;
    }
    .manual-redirect {
      display: inline-block;
      margin-top: 0.2rem;
      color: #bbb;
      text-decoration: none;
      font-size: 0.97rem;
      transition: opacity 0.2s;
    }
    .manual-redirect:hover { opacity: 0.7; }
    @keyframes scaleUp {
      0% { transform: scale(0); opacity: 0; }
      80% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @media (max-width: 480px) {
      .message-card { padding: 1.5rem 0.7rem; }
      h1 { font-size: 1.5rem; }
      .main-message { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="message-card">
    <div class="info-icon" role="img" aria-label="Info">ℹ️</div>
    <h1>User Already Verified</h1>
    <div class="main-message">
      Your account has already been verified.<br>
      Please return to the PickMyCollege application and log in to continue.
    </div>
    <div class="redirect-message">
      If you need to reopen the app, you can do so here:
      <br>
      <a href="https://pickmycollege.vercel.app" class="manual-redirect">https://pickmycollege.vercel.app</a>
    </div>
  </div>
</body>
</html>
`);

    }

    if (tokenVersion !== user.tokenVersion) {
      return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Link Invalid | PickMyCollege</title>
  <style>
    :root {
      --primary-color: #dc3545;
      --text-color: #2d3748;
      --background-color: #f7fafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background-color: var(--background-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
      color: var(--text-color);
      line-height: 1.6;
    }
    .message-card {
      background: white;
      padding: 2.5rem 1.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 480px;
      width: 100%;
      transition: transform 0.3s ease;
    }
    .message-card:hover { transform: translateY(-2px); }
    .error-icon {
      font-size: 4rem;
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      animation: scaleUp 0.6s cubic-bezier(0.68,-0.55,0.27,1.55);
    }
    h1 {
      color: var(--primary-color);
      margin-bottom: 1rem;
      font-size: 1.8rem;
      font-weight: 700;
    }
    .main-message {
      font-size: 1.13rem;
      margin-bottom: 2rem;
      color: #2d3748;
      font-weight: 500;
    }
    .redirect-message {
      font-size: 0.97rem;
      color: #aaa;
      margin-top: 1.1rem;
    }
    .manual-redirect {
      display: inline-block;
      margin-top: 0.2rem;
      color: #bbb;
      text-decoration: none;
      font-size: 0.97rem;
      transition: opacity 0.2s;
    }
    .manual-redirect:hover { opacity: 0.7; }
    @keyframes scaleUp {
      0% { transform: scale(0); opacity: 0; }
      80% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @media (max-width: 480px) {
      .message-card { padding: 1.5rem 0.7rem; }
      h1 { font-size: 1.5rem; }
      .main-message { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="message-card">
    <div class="error-icon" role="img" aria-label="Error">❌</div>
    <h1>Verification Link Invalid</h1>
    <div class="main-message">
      The verification link you used is no longer valid.<br>
      Please request a new verification email or contact support if you believe this is an error.
    </div>
    <div class="redirect-message">
      You can return to the app here:
      <br>
      <a href="https://pickmycollege.vercel.app" class="manual-redirect">https://pickmycollege.vercel.app</a>
    </div>
  </div>
</body>
</html>
`);

    }

    user.isVerified = true;
    await user.save();
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verified Successfully | PickMyCollege</title>
  <style>
    :root {
      --primary-color: #28a745;
      --secondary-color: #218838;
      --text-color: #2d3748;
      --background-color: #f7fafc;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background-color: var(--background-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
      color: var(--text-color);
      line-height: 1.6;
    }

    .verification-card {
      background: white;
      padding: 2.5rem 1.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      text-align: center;
      max-width: 480px;
      width: 100%;
      transition: transform 0.3s ease;
    }

    .verification-card:hover {
      transform: translateY(-2px);
    }

    .success-icon {
      font-size: 4rem;
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      animation: checkmarkScale 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }

    h1 {
      color: var(--primary-color);
      margin-bottom: 1rem;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .main-message {
      font-size: 1.13rem;
      margin-bottom: 2rem;
      color: #2d3748;
      font-weight: 500;
    }

    .redirect-message {
      font-size: 0.97rem;
      color: #aaa;
      margin-top: 1.1rem;
    }

    .manual-redirect {
      display: inline-block;
      margin-top: 0.2rem;
      color: #bbb;
      text-decoration: none;
      font-size: 0.97rem;
      transition: opacity 0.2s;
    }

    .manual-redirect:hover {
      opacity: 0.7;
    }

    @keyframes checkmarkScale {
      0% { transform: scale(0); opacity: 0; }
      80% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }

    @media (max-width: 480px) {
      .verification-card {
        padding: 1.5rem 0.7rem;
      }
      h1 {
        font-size: 1.5rem;
      }
      .main-message {
        font-size: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="verification-card">
    <div class="success-icon" role="img" aria-label="Verified">✅</div>
    <h1>Email Successfully Verified!</h1>
    <div class="main-message">
      Signup successful!<br>
      Please return to the browser and log in to continue.
    </div>
    <div class="redirect-message">
      If you need to reopen the app, you can do so here:
      <br>
      <a href="https://pickmycollege.vercel.app" class="manual-redirect">https://pickmycollege.vercel.app</a>
    </div>
  </div>
</body>
</html>
`);



  } catch (err) {
    console.error('Unexpected error during verification:', err);
    res.status(500).json({ message: 'Unexpected server error during verification.' });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Optional: Generate login token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful.', token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

export const checkVerification = async (req, res) => {
  try {
    const { email } = req.query;
    // console.log(email);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ isVerified: false });
    res.json({ isVerified: user.isVerified });
  } catch (err) {
    res.status(500).json({ isVerified: false });
  }
};

export const reset = async (req, res) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const CLIENT_URL_BACKEND = process.env.CLIENT_URL_BACKEND;
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, a verification link has been sent.' });
    }

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'Old password cannot be used. Please choose a new password.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const tokenVersion = user.tokenVersion;
    const payload = { email: user.email, hashedPassword, tokenVersion };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '10m' });
    const resetLink = `${CLIENT_URL_BACKEND}/api/auth/verifyReset?token=${token}`;

    await sendResetEmail(user.email, resetLink);

    // Return tokenVersion for frontend polling
    res.status(200).json({ message: 'Password reset email sent. Please check your inbox.', tokenVersion: user.tokenVersion });
  } catch (err) {
    console.error('Error in resetPasswordRequest:', err);
    res.status(500).json({ message: 'Server error during password reset request.' });
  }
};


export const verifyReset = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token missing.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('JWT verification error:', err.message);
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const { email, hashedPassword, tokenVersion } = decoded;
    if (!email || !hashedPassword || tokenVersion === undefined) {
      return res.status(400).json({ message: 'Invalid token payload.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification link.' });
    }

    // console.log(tokenVersion)
    // console.log(user.tokenVersion)
    if (tokenVersion !== user.tokenVersion) {
      return res.send(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset Token Invalid | PickMyCollege</title>
  <style>
    :root {
      --primary-color: #dc3545;
      --text-color: #2d3748;
      --background-color: #f7fafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background-color: var(--background-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
      color: var(--text-color);
      line-height: 1.6;
    }
    .message-card {
      background: white;
      padding: 2.5rem 1.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 480px;
      width: 100%;
      transition: transform 0.3s ease;
    }
    .message-card:hover { transform: translateY(-2px); }
    .error-icon {
      font-size: 4rem;
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      animation: scaleUp 0.6s cubic-bezier(0.68,-0.55,0.27,1.55);
    }
    h1 {
      color: var(--primary-color);
      margin-bottom: 1rem;
      font-size: 1.8rem;
      font-weight: 700;
    }
    .main-message {
      font-size: 1.13rem;
      margin-bottom: 2rem;
      color: #2d3748;
      font-weight: 500;
    }
    .redirect-message {
      font-size: 0.97rem;
      color: #aaa;
      margin-top: 1.1rem;
    }
    .manual-redirect {
      display: inline-block;
      margin-top: 0.2rem;
      color: #bbb;
      text-decoration: none;
      font-size: 0.97rem;
      transition: opacity 0.2s;
    }
    .manual-redirect:hover { opacity: 0.7; }
    @keyframes scaleUp {
      0% { transform: scale(0); opacity: 0; }
      80% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @media (max-width: 480px) {
      .message-card { padding: 1.5rem 0.7rem; }
      h1 { font-size: 1.5rem; }
      .main-message { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="message-card">
    <div class="error-icon" role="img" aria-label="Error">❌</div>
    <h1>Reset Token Invalid</h1>
    <div class="main-message">
      The reset token you used is no longer valid.<br>
      Please request a new password reset or contact support if you believe this is an error.
    </div>
    <div class="redirect-message">
      You can return to the app here:
      <br>
      <a href="https://pickmycollege.vercel.app" class="manual-redirect">https://pickmycollege.vercel.app</a>
    </div>
  </div>
</body>
</html>
`
      )
    }

    user.password = hashedPassword;
    user.tokenVersion += 1;
    await user.save();

    res.send(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Password Reset Successful | PickMyCollege</title>
  <style>
    :root {
      --primary-color: #28a745;
      --text-color: #2d3748;
      --background-color: #f7fafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background-color: var(--background-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
      color: var(--text-color);
      line-height: 1.6;
    }
    .message-card {
      background: white;
      padding: 2.5rem 1.5rem;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 480px;
      width: 100%;
      transition: transform 0.3s ease;
    }
    .message-card:hover { transform: translateY(-2px); }
    .success-icon {
      font-size: 4rem;
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      animation: scaleUp 0.6s cubic-bezier(0.68,-0.55,0.27,1.55);
    }
    h1 {
      color: var(--primary-color);
      margin-bottom: 1rem;
      font-size: 1.8rem;
      font-weight: 700;
    }
    .main-message {
      font-size: 1.13rem;
      margin-bottom: 2rem;
      color: #2d3748;
      font-weight: 500;
    }
    .redirect-message {
      font-size: 0.97rem;
      color: #aaa;
      margin-top: 1.1rem;
    }
    .manual-redirect {
      display: inline-block;
      margin-top: 0.2rem;
      color: #bbb;
      text-decoration: none;
      font-size: 0.97rem;
      transition: opacity 0.2s;
    }
    .manual-redirect:hover { opacity: 0.7; }
    @keyframes scaleUp {
      0% { transform: scale(0); opacity: 0; }
      80% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @media (max-width: 480px) {
      .message-card { padding: 1.5rem 0.7rem; }
      h1 { font-size: 1.5rem; }
      .main-message { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="message-card">
    <div class="success-icon" role="img" aria-label="Success">✅</div>
    <h1>Password Reset Successful!</h1>
    <div class="main-message">
      Your password has been reset successfully.<br>
      You can now return to the PickMyCollege application and log in.
    </div>
    <div class="redirect-message">
      <a href="https://pickmycollege.vercel.app" class="manual-redirect">Go to PickMyCollege</a>
    </div>
  </div>
</body>
</html>
`
    )
  } catch (err) {
    console.error('Unexpected error during reset verification:', err);
    res.status(500).json({ message: 'Unexpected server error during verification.' });
  }
};

export const checkResetVerification = async (req, res) => {
  try {
    const { email, tokenVersion } = req.query;
    const incrementedTokenVersion = parseInt(tokenVersion, 10) + 1;

    if (!email || tokenVersion === undefined) {
      return res.status(400).json({ resetVerified: false, message: 'Email and tokenVersion are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ resetVerified: false, message: 'User not found.' });
    }

    // If the user's tokenVersion has incremented, the reset has been verified
    if (incrementedTokenVersion !== user.tokenVersion) {
      return res.json({ resetVerified: false, message: 'Reset token is no longer valid.' });
    }
    // console.log('verified');
    
    return res.json({ resetVerified: true, message: 'Reset token is valid.' });
  } catch (err) {
    console.error('Error checking reset verification:', err);
    res.status(500).json({ resetVerified: false, message: 'Server error.' });
  }
};

