import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import LandingPage from '../pages/LandingPage';
import InputForm from '../pages/InputForm';
import ResultPage from '../pages/ResultPage';
import AboutUs from '../pages/AboutUs';
import Instructions from '../pages/Instructions';
import Navbar from '../components/Navbar';
import ScrollToTop from '../components/ScrollToTop';

const AppRoutesWrapper = () => {
  const location = useLocation();

  // Add /results here as well
  const showNavbarPaths = ['/input', '/about', '/instructions', '/results'];

  const showNavbar = showNavbarPaths.includes(location.pathname);

  // Add/remove navbar-active class based on navbar visibility
  React.useEffect(() => {
    if (showNavbar) {
      document.body.classList.add('navbar-active');
    } else {
      document.body.classList.remove('navbar-active');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('navbar-active');
    };
  }, [showNavbar]);

  return (
    <>
      {showNavbar && <Navbar />}
      <ScrollToTop/>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/input" element={<InputForm />} />
        <Route path="/results" element={<ResultPage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/instructions" element={<Instructions />} />
      </Routes>
    </>
  );
};

const AppRoutes = () => {
  return (
    <Router>
      <AppRoutesWrapper />
    </Router>
  );
};

export default AppRoutes;
