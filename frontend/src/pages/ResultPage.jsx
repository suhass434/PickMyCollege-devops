import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PDFDocument from '../components/PDFDocument';
import '../css/ResultPage.css';
import emailjs from '@emailjs/browser';
import { Dialog } from '@mui/material';
import LoginModal from '../components/LoginModal';

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [showThankYouDialog, setShowThankYouDialog] = useState(false);

  // --- Auth state for download modal ---
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);
  const downloadLinkRef = useRef(null);

  // Extract data with enhanced error handling
  let recommendations = [];
  let userInputs = {};

  if (location.state) {
    userInputs = location.state.userInputs || {};

    if (Array.isArray(location.state.recommendations)) {
      recommendations = location.state.recommendations;
    } else if (Array.isArray(location.state.colleges)) {
      recommendations = location.state.colleges;
    } else if (Array.isArray(location.state.data)) {
      recommendations = location.state.data;
    } else if (Array.isArray(location.state)) {
      recommendations = location.state;
      userInputs = {};
    } else {
      recommendations = [];
    }
  }

  if (!Array.isArray(recommendations)) {
    recommendations = [];
  }

  const generatePDFFilename = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `pickmycollege-${timestamp}.pdf`;
  };

  const handleToggleDetails = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const sendFeedbackEmail = (formData) => {
    emailjs.send('service_wq8ft9e', 'template_hp6md9k', {
      message: formData.message,
      rating: formData.ratings
    }, 'ejRvgMFgtVV6_i32C')
    .then((result) => {
      console.log(result.text);
    }, (error) => {
      console.error(error.text);
      alert('Error sending email.');
    });
  };

  const handleFeedbackSubmit = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "ratings": rating,
          "message": feedbackText
        })
      });

      if (response.ok) {
        sendFeedbackEmail({ ratings: rating, message: feedbackText });
        setFeedbackSubmitted(true);
        setShowFeedbackModal(false);
        setShowThankYouDialog(true);
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  };

  // --- Download PDF logic with auth check ---
  const isAuthenticated = !!localStorage.getItem('token');

  const handleDownloadClick = (e) => {
    if (isAuthenticated) {
      // If authenticated, trigger the PDF download programmatically
      if (downloadLinkRef.current) {
        downloadLinkRef.current.click();
      }
    } else {
      // Not authenticated: show login modal
      setShowLoginModal(true);
      setPendingDownload(true);
    }
  };

  // After successful login from modal, trigger the download if it was pending
  const handleAuthSuccess = (token) => {
    localStorage.setItem('token', token || 'dummy-token');
    setShowLoginModal(false);
    if (pendingDownload && downloadLinkRef.current) {
      setTimeout(() => {
        downloadLinkRef.current.click();
        setPendingDownload(false);
      }, 200); // Small delay to ensure modal closes before download
    }
  };

  return (
    <div className={`results-container${showLoginModal ? ' blurred-bg' : ''}`}>
      <div className='fixed-result-container'>
        <div className="results-header no-print">
          <h1>College Recommendations List</h1>
        </div>

        <div className="navigation-buttons no-print">
          <button className="back-button" onClick={() => navigate('/input')}>
            Back to Input Form
          </button>

          {/* Hidden PDFDownloadLink for programmatic click */}
          <PDFDownloadLink
            document={<PDFDocument recommendations={recommendations} userInputs={userInputs} />}
            fileName={generatePDFFilename()}
            style={{ display: 'none' }}
            ref={downloadLinkRef}
          >
            {({ blob, url, loading, error }) => null}
          </PDFDownloadLink>

          {/* Visible Download Button */}
          <button className="download-pdf-button" onClick={handleDownloadClick}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="college-list printable-content no-print">
        {recommendations.length === 0 ? (
          <div className="no-results">
            <p>No colleges found for the given criteria.</p>
          </div>
        ) : (
          recommendations.map((college, idx) => (
            <div className="college-card" key={college.code || idx}>
              <div>
                <h4 className='slno'>{idx + 1}.</h4>
              </div>
              <div className="college-info">
                <div className="college-id">Code: {college.code || 'N/A'}</div>
                <div className="college-name">{college.college || college.name || 'Unnamed College'}</div>
                <div className="college-basic-info-row">
                  <div><b>Branch:</b> {college.branch || 'N/A'}</div>
                  <div><b>Latest Cutoff:</b> {college.latest_cutoff || 'N/A'}</div>
                  <div><b>Category:</b> {college.selected_category || 'N/A'}</div>
                  <div><b>Location:</b> {college.location || 'N/A'}</div>
                </div>
                <button
                  className="view-details-btn"
                  onClick={() => handleToggleDetails(idx)}
                >
                  {expandedIndex === idx ? 'Hide Details' : 'View Details'}
                </button>
                <div className={`college-details${expandedIndex === idx ? ' expanded' : ''}`}>
                  {expandedIndex === idx && (
                    <div className="details-content">
                      <div className="college-summary">
                        <p>{college.summary || 'No summary available.'}</p>
                      </div>
                      <div className="college-details-grid-custom">
                        <div>
                          <span className="detail-label">NIRF Ranking:</span>
                          <span className="detail-value">{college.nirf_ranking || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="detail-label">Fees:</span>
                          <span className="detail-value">{college.fees || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="detail-label">Average Package:</span>
                          <span className="detail-value">{college.average_package || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="detail-label">Highest Package:</span>
                          <span className="detail-value">{college.highest_package || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="detail-label">Type:</span>
                          <span className="detail-value">{college.type || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="detail-label">Affiliation:</span>
                          <span className="detail-value">{college.affiliation || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="college-website">
                        <a
                          className="website-link"
                          href={
                            college.website && college.website !== 'Not Available'
                              ? (college.website.startsWith('http') ? college.website : `https://${college.website}`)
                              : '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            pointerEvents:
                              !college.website || college.website === 'Not Available'
                                ? 'none'
                                : 'auto',
                            opacity:
                              !college.website || college.website === 'Not Available'
                                ? 0.6
                                : 1,
                          }}
                        >
                          {college.website && college.website !== 'Not Available'
                            ? 'Visit Website'
                            : 'Website Not Available'}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)}>
        <div className="feedback-modal">
          <h3>Rate Your Experience</h3>
          <div className="star-rating">
            {[...Array(5)].map((_, index) => (
              <button
                key={index}
                className={`star ${index < rating ? 'filled' : ''}`}
                onClick={() => setRating(index + 1)}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder="Your suggestions..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <div className="modal-actions">
            <button onClick={handleFeedbackSubmit} className='feedback-form-btn'>Submit</button>
            <button onClick={() => setShowFeedbackModal(false)} className='feedback-form-btn'>Cancel</button>
          </div>
        </div>
      </Dialog>

      {/* Thank You Dialog */}
      <Dialog
        open={showThankYouDialog}
        onClose={() => setShowThankYouDialog(false)}
        aria-labelledby="thank-you-dialog-title"
      >
        <div className="thank-you-dialog-content" style={{ padding: 32, textAlign: 'center' }}>
          <h2 id="thank-you-dialog-title">Thank You!</h2>
          <p>Your feedback has been received.</p>
          <button
            style={{
              marginTop: 24,
              padding: '10px 24px',
              background: '#1a3b89',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
            onClick={() => setShowThankYouDialog(false)}
          >
            Close
          </button>
        </div>
      </Dialog>

      {/* Feedback Button */}
      {!feedbackSubmitted && (
        <button 
          className={`feedback-button ${!feedbackSubmitted ? 'shake' : ''}`}
          onClick={() => setShowFeedbackModal(true)}
        >
          Give Feedback
        </button>
      )}

      {/* Login Modal for Download (NO Stay Logged Out option) */}
      {showLoginModal && (
        <LoginModal
          onAuthSuccess={handleAuthSuccess}
          allowContinueWithoutLogin={false}
          showForgotPassword={true}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
};

export default ResultPage;
