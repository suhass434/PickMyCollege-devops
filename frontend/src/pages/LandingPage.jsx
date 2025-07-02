import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/landingPage.css';
import logo from '../assets/PMC-Logo.png';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/input');
  };

  return (
    <div className="landing-container">
      {/* Left side with text content */}
      <div className="landing-left">
        <div className="landing-content">
          <h2>KCET Student? Stop Scrolling Through Endless College Lists <br className="desktop-break" /></h2>
          
          <p>
PickMyCollege makes <strong>engineering college selection</strong> simple, smart, and stress-free.
We use data-driven insights from previous cutoffs and your rank to guide you to the best-fit colleges based on your preferences.          </p>
          <button className="get-started-button" onClick={handleGetStarted}>
            Get started
          </button>
        </div>
      </div>

      {/* Right side with logo and message */}
      <div className="landing-right">
        <div className="logo-container">
          <img
            src={logo}
            alt="PickMyCollege Logo"
            className="college-logo"
          />
          <h3 className="logo-heading">
            College Search Made Simple
          </h3>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;