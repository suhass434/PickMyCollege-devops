// InputForm.jsx
import React, { useState, useMemo} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import branchesConfig from '../config/branches';
import categories from '../config/categories';
import locations from '../config/locations';
import '../css/inputForm.css';

const MIN_COLLEGES = 10;
const MAX_COLLEGES = 40;

const InputForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    rank: '',
    category: '',
    location: [],
    branches: [],
    num_colleges: 10
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [finalTermsChecked, setFinalTermsChecked] = useState(false);

  // --- Search states for filtering ---
  const [locationSearch, setLocationSearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  // --- Filter locations based on search ---
  const filteredLocations = useMemo(() => {
    return locations.filter(location =>
      location.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locationSearch]);

  // --- Filtered grouped branches by search ---
  const filteredGroupedBranches = useMemo(() => {
    if (!branchSearch.trim()) return branchesConfig;
    return branchesConfig
      .map(group => ({
        ...group,
        branches: group.branches.filter(branch =>
          branch.toLowerCase().includes(branchSearch.toLowerCase())
        )
      }))
      .filter(group => group.branches.length > 0);
  }, [branchSearch]);

  // --- "Select All" checked status for each section ---
  const isSectionAllSelected = (sectionBranches) =>
    sectionBranches.every(branch => formData.branches.includes(branch));

  // --- Handle branch checkbox change ---
  const handleBranchChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      branches: checked
        ? [...prev.branches, value]
        : prev.branches.filter(branch => branch !== value)
    }));
  };

  // --- Handle "Select All" for a section ---
  const handleSectionSelectAll = (sectionBranches, checked) => {
    setFormData(prev => {
      let newBranches;
      if (checked) {
        newBranches = Array.from(new Set([...prev.branches, ...sectionBranches]));
      } else {
        newBranches = prev.branches.filter(branch => !sectionBranches.includes(branch));
      }
      return { ...prev, branches: newBranches };
    });
  };

  // --- Collapsible section toggle ---
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // --- Handle text field changes ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rank') {
      if (value && !/^\d+$/.test(value)) {
        setErrors(prev => ({ ...prev, rank: 'Rank must be a number' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.rank;
          return newErrors;
        });
      }
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // --- Handle location checkbox change ---
  const handleLocationChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      location: checked
        ? [...prev.location, value]
        : prev.location.filter(location => location !== value)
    }));
  };

  // --- Handle college count changes ---
  const handleCollegeCountChange = (value) => {
    let newValue = parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      num_colleges: newValue
    }));
  };

  const incrementCollegeCount = () => {
    if (formData.num_colleges < MAX_COLLEGES) {
      setFormData(prev => ({
        ...prev,
        num_colleges: prev.num_colleges + 1
      }));
    }
  };

  const decrementCollegeCount = () => {
    if (formData.num_colleges > MIN_COLLEGES) {
      setFormData(prev => ({
        ...prev,
        num_colleges: prev.num_colleges - 1
      }));
    }
  };

  const clearLocationSearch = () => {
    setLocationSearch('');
  };

  const clearBranchSearch = () => {
    setBranchSearch('');
  };

  // --- Form submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.rank) newErrors.rank = 'Rank is required';
    else if (!/^\d+$/.test(formData.rank)) newErrors.rank = 'Rank must be a number';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!finalTermsChecked) newErrors.terms = 'You must agree to all Terms and Conditions';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const submissionData = {
        rank: formData.rank,
        category: formData.category,
        location: formData.location,
        branches: formData.branches,
        num_colleges: formData.num_colleges
      };

      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/collegeList`, submissionData);

      let collegeData = [];
      if (Array.isArray(response.data)) {
        collegeData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        collegeData = response.data.data;
      } else if (response.data && Array.isArray(response.data.colleges)) {
        collegeData = response.data.colleges;
      } else if (response.data && Array.isArray(response.data.recommendations)) {
        collegeData = response.data.recommendations;
      } else {
        collegeData = [];
      }

      navigate('/results', {
        state: {
          recommendations: collegeData,
          userInputs: submissionData
        }
      });
    } catch (error) {
      setErrors({ submission: 'Failed to submit. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render ---
  return (
    <div className='input-form-container'>
      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <div className="loading-text">
              <h3>Analyzing Your Preferences</h3>
              <p>We're finding the best colleges for you...</p>
              <p>It may take 1-2 minutes</p>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`form-card ${isSubmitting ? 'form-disabled' : ''}`}>
        <h2 className="form-title">College Recommendation Tool</h2>
        <p className="form-subtitle">Enter your details to find suitable colleges</p>

        <form onSubmit={handleSubmit}>
          {/* --- Rank --- */}
          <div className="form-group">
            <label htmlFor="rank">
              KCET Rank <span className="required">*</span>
            </label>
            <input
              type="text"
              id="rank"
              name="rank"
              value={formData.rank}
              onChange={handleChange}
              placeholder="Enter your engineering rank"
              className={errors.rank ? 'input-error' : ''}
              disabled={isSubmitting}
            />
            {errors.rank && <div className="error-message">{errors.rank}</div>}
          </div>

          {/* --- Category --- */}
          <div className="form-group">
            <label htmlFor="category">
              Category <span className="required">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={errors.category ? 'input-error' : ''}
              disabled={isSubmitting}
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {errors.category && <div className="error-message">{errors.category}</div>}
          </div>

          {/* --- Locations --- */}
          <div className="form-group">
            <label>Preferred Locations (Optional)</label>
            <div className="search-section">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="search-input"
                  disabled={isSubmitting}
                />
                {locationSearch && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={clearLocationSearch}
                    aria-label="Clear location search"
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                )}
              </div>
              {formData.location.length > 0 && (
                <div className="selected-items">
                  <span className="selected-label">Selected: </span>
                  {formData.location.map(loc => (
                    <span key={loc} className="selected-item">
                      {loc}
                      <button
                        type="button"
                        onClick={() => handleLocationChange({ target: { value: loc, checked: false } })}
                        className="remove-item-btn"
                        aria-label={`Remove ${loc}`}
                        disabled={isSubmitting}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="branches-container">
              {filteredLocations.length === 0 && locationSearch ? (
                <div className="no-results">No locations found matching "{locationSearch}"</div>
              ) : (
                filteredLocations.map(location => (
                  <div key={location} className="branch-option">
                    <input
                      type="checkbox"
                      id={`location-${location}`}
                      value={location}
                      checked={formData.location.includes(location)}
                      onChange={handleLocationChange}
                      disabled={isSubmitting}
                    />
                    <label htmlFor={`location-${location}`}>{location}</label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* --- Branches Section --- */}
          <div className="form-group">
            <label>Preferred Branches (Optional)</label>
            <div className="search-section">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="search-input"
                  disabled={isSubmitting}
                />
                {branchSearch && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={clearBranchSearch}
                    aria-label="Clear branch search"
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="branches-container">
              {filteredGroupedBranches.length === 0 && branchSearch ? (
                <div className="no-results">No branches found matching "{branchSearch}"</div>
              ) : (
                filteredGroupedBranches.map(group => {
                  const selectedCount = group.branches.filter(branch => formData.branches.includes(branch)).length;
                  const totalCount = group.branches.length;
                  return (
                    <div key={group.section} className="branch-section">
                      <div 
                        className="branch-section-header"
                        onClick={() => toggleSection(group.section)}
                      >
                        <span className="section-chevron">
                          {expandedSections[group.section] ? '▼' : '▶'}
                        </span>
                        <span className="section-title">{group.section}</span>
                        {selectedCount > 0 && (
                          <span className="section-selected-count">
                            &nbsp;selected {selectedCount}/{totalCount}
                          </span>
                        )}
                        <button
                          type="button"
                          className="select-all-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSectionSelectAll(
                              group.branches,
                              !isSectionAllSelected(group.branches)
                            );
                          }}
                          disabled={isSubmitting}
                        >
                          {isSectionAllSelected(group.branches) ? 'Unselect All' : 'Select All'}
                        </button>
                      </div>
                      {expandedSections[group.section] && (
                        <div className="branch-section-list">
                          {group.branches.map(branch => (
                            <label key={branch} className="branch-option">
                              <input
                                type="checkbox"
                                value={branch}
                                checked={formData.branches.includes(branch)}
                                onChange={handleBranchChange}
                                disabled={isSubmitting}
                              />
                              {branch}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* --- Number of Colleges --- */}
          <div className="form-group">
            <label htmlFor="num_colleges">Number of Colleges (10-40)</label>
            <div className="college-count-input">
              <button
                type="button"
                className="number-control-btn"
                onClick={decrementCollegeCount}
                disabled={formData.num_colleges <= MIN_COLLEGES || isSubmitting}
                aria-label="Decrease number of colleges"
              >
                −
              </button>
              <input
                type="number"
                id="num_colleges"
                name="num_colleges"
                min={MIN_COLLEGES}
                max={MAX_COLLEGES}
                value={formData.num_colleges}
                onChange={e => handleCollegeCountChange(e.target.value)}
                onBlur={e => {
                  if (e.target.value === '') handleCollegeCountChange('10');
                }}
                className="number-input"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="number-control-btn"
                onClick={incrementCollegeCount}
                disabled={formData.num_colleges >= MAX_COLLEGES || isSubmitting}
                aria-label="Increase number of colleges"
              >
                +
              </button>
            </div>
          </div>

          {/* --- Terms and Conditions Section --- */}
          <div className="terms-section">
            <div
              className="terms-header"
              onClick={() => setTermsExpanded(!termsExpanded)}
              disabled={isSubmitting}
            >
              <h3 className="terms-title">Terms and Conditions</h3>
              <span className={`terms-arrow ${termsExpanded ? 'expanded' : ''}`}></span>
            </div>

            {termsExpanded && (
              <div className="terms-content">
                <div className="individual-terms">
                  <div className="term-item">
                    <h4 className="term-number">1.</h4>
                    <p className="term-text">
                      College suggestions from PickMyCollege are based on previous years' cutoffs and available data.
                      These are for informational purposes only and should not be considered absolute or definitive.
                    </p>
                  </div>
                  <div className="term-item">
                    <h4 className="term-number">2.</h4>
                    <p className="term-text">
                      Recommendations are generated using your provided rank and preferences. However, the suitability
                      of a college may vary depending on your individual circumstances and personal opinion. We encourage
                      you to use your own judgment.
                    </p>
                  </div>
                  <div className="term-item">
                    <h4 className="term-number">3.</h4>
                    <p className="term-text">
                      Any decisions regarding college selection after using our service are your sole responsibility.
                      PickMyCollege will not be held liable for outcomes resulting from choices made based on our suggestions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="final-terms-section">
              <div className="final-terms-checkbox">
                <input
                  type="checkbox"
                  id="finalTermsCheck"
                  checked={finalTermsChecked}
                  onChange={() => setFinalTermsChecked(!finalTermsChecked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="finalTermsCheck">
                  I agree to all the Terms and Conditions
                </label>
              </div>
              {!finalTermsChecked && (
                <div className="terms-warning">
                  Please agree to the Terms and Conditions to proceed
                </div>
              )}
            </div>

            {errors.terms && <div className="error-message">{errors.terms}</div>}
          </div>

          {errors.submission && <div className="error-message">{errors.submission}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting || !finalTermsChecked}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner"></span>
                Processing...
              </>
            ) : (
              'Find My Colleges'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InputForm;
