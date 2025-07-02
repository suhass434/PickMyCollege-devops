import React from 'react';
import '../css/AboutUs.css';

import Suhas from '../assets/Suhas.png';
import USanjay from '../assets/U_Sanjay.png';
import Shivaraj from '../assets/Shivaraj.png';
import Shravan from '../assets/Shravan.png';

const teamMembers = [
  {
    name: 'Suhas S',
    image: Suhas,
    linkedin: 'https://www.linkedin.com/in/suhass434/',
  },
  {
    name: 'U Sanjay',
    image: USanjay,
    linkedin: 'https://www.linkedin.com/in/sanjay-u-372b43286/',
  },
  {
    name: 'Shivaraj',
    image: Shivaraj,
    linkedin: 'https://in.linkedin.com/in/shivaraj-a-74473a24b',
  },
  {
    name: 'Shravan',
    image: Shravan,
    linkedin: 'https://www.linkedin.com/in/shravan-devadiga-3224b3351',
  },
];

const AboutUs = () => {
  return (
    <div className="aboutus-container">
      <h1>About Us</h1>

      <h2>Our Story</h2>
      <p>
        Navigating the KCET option entry process can be overwhelming. With over 250 engineering colleges to choose from, countless branches, and the pressure of making the right decision, we—like thousands of students—felt lost and confused. The lack of a dedicated, accurate tool for KCET students made the process even tougher.
      </p>
      <p>
        That’s why we created <strong>PickMyCollege</strong>.
      </p>

      <h2>What is PickMyCollege?</h2>
      <p>
        <strong>PickMyCollege</strong> is a student-centric platform designed exclusively for KCET engineering aspirants. Enter your rank, category, location, and branch preferences, and our intelligent system analyzes the previous five years of KCET data to generate a personalized, prioritized list of colleges just for you. No more guesswork—just clear, data-driven options to help you make the best choice for your future.
      </p>

      <h2>Why PickMyCollege?</h2>
      <ul>
        <li><strong>KCET-Focused:</strong> The only tool built specifically for KCET option entry.</li>
        <li><strong>Data-Driven:</strong> We analyze the last five years of official data to ensure accurate, up-to-date recommendations.</li>
        <li><strong>Personalized Results:</strong> Get college lists tailored to your rank, category, location, and branch preferences.</li>
        <li><strong>Saves Time & Stress:</strong> No more endless scrolling or confusion—get clarity in minutes.</li>
      </ul>

      <h2>Our Mission</h2>
      <p>
        We believe every student deserves a fair shot at their dream college. Our mission is to simplify the option entry process, empower students with reliable information, and help you make confident, informed decisions.
      </p>

      <h2 className="team-heading">Meet the Developers</h2>
      <div className="team-container">
        {teamMembers.map((member) => (
          <div className="team-member" key={member.name}>
            <img
              src={member.image}
              alt={member.name}
              className="team-image"
            />
            <div className="team-name">{member.name}</div>
            <a
              href={member.linkedin}
              className="team-linkedin"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg"
                alt="LinkedIn"
                className="linkedin-icon"
              />{' '}
              LinkedIn
            </a>
          </div>
        ))}
      </div>
      <div className="contact-section">
        <div className="contact-catchy-heading">
          Got any queries or doubts ?
        </div>
        <p className="contact-email-line">
          Contact us:
          <a
            href="mailto:pickmycollege.contact@gmail.com"
            className="contact-email-link"
          >
           pickmycollege.contact@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default AboutUs;
