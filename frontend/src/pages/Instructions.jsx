import React from 'react';
import '../css/Instructions.css';

const Instructions = () => {
  return (
    <div className="instructions-container">
      <h1>Instructions – For KCET Option Entry</h1>
      <p>
        <strong>PickMyCollege</strong> helps students make smart and confident choices during KCET counselling, especially in the option entry phase.
      </p>
      
      <h2>How It Works</h2>
      <ol>
        <li>
          <strong>Got Your KCET Rank?</strong><br />
          After your <strong>document verification</strong>, the next step is <strong>option entry</strong>—where you select colleges and branches in your preferred order.
        </li>
        <li>
          <strong>Why It's Tricky</strong><br />
          With over <strong>250 Engineering colleges</strong> and many branches, it's tough to research and build the right list on your own.
        </li>
        <li>
          <strong>How We Help</strong>
          <ul>
            <li>Enter your <strong>KCET rank, preferred branches, and locations</strong>.</li>
            <li>We use past data to generate a <strong>personalized college list</strong>—rank-wise and location-wise.</li>
            <li>This saves time, removes confusion, and gives you clarity.</li>
          </ul>
        </li>
        <li>
          <strong>Please Wait a Moment</strong><br />
          It takes <strong>less than a minute</strong> to fetch your results. Be patient while we generate your list.
        </li>
        <li>
          <strong>What You Get</strong>
          <ul>
            <li>
              A <strong>college list with codes</strong>, ready for KCET option entry.
            </li>
            <li>
              <strong>PDF download</strong> available for easy reference.
            </li>
          </ul>
        </li>
        <li>
          <strong>Use the List in KCET Portal</strong><br />
          You can then directly use this list while filling your <strong>option entry</strong> on the official KCET counselling portal.
        </li>
      </ol>

      <h2>How PickMyCollege Recommends Colleges</h2>
      <ol>
        <li>
          <strong>Filter colleges</strong> based on your preferred location and branch (if given).
        </li>
        <li>
          <strong>Find colleges close to your rank</strong> using previous 4 years cutoff data.
        </li>
        <li>
          <strong>Provide balanced recommendations</strong> with 40% high admission chances, 40% good admission chances, 20% stretch options.
        </li>
        <li>
          <strong>Automatically fallback</strong> to lower eligible category if seats aren't available in your category.
        </li>
      </ol>

      <h2>Category Mapping</h2>
      <ol>
        <li><strong>GM</strong> - GM</li>
        <li><strong>GMK</strong> - GMK,GM</li>
        <li><strong>GMR</strong> - GMR,GM</li>
        <li><strong>GMRK</strong> - GMK,GMR,GM</li>
        <li><strong>1G</strong> - 1G,GM</li>
        <li><strong>1K</strong> - 1K,1G,GMK,GM</li>
        <li><strong>1R</strong> - 1R,1G,GMR,GM</li>
        <li><strong>1RK</strong> - 1R,1K,1G,GMR,GMK,GM</li>
        <li><strong>2AG</strong> - 2AG,GM</li>
        <li><strong>2AK</strong> - 2AK,2AG,GMK,GM</li>
        <li><strong>2AR</strong> - 2AR,2AG,GMR,GM</li>
        <li><strong>2ARK</strong> - 2AR,2AK,2AG,GMK,GMR,GM</li>
        <li><strong>2BG</strong> - 2BG,GM</li>
        <li><strong>2BK</strong> - 2BK,2BG,GMK,GM</li>
        <li><strong>2BR</strong> - 2BR,2BG,GMR,GM</li>
        <li><strong>2BRK</strong> - 2BK,2BR,2BG,GMK,GMR,GM</li>
        <li><strong>3AG</strong> - 3AG,GM</li>
        <li><strong>3AK</strong> - 3AK,3AG,GMK,GM</li>
        <li><strong>3AR</strong> - 3AR,3AG,GMR,GM</li>
        <li><strong>3ARK</strong> - 3AK,3AR,3AG,GMK,GMR,GM</li>
        <li><strong>3BG</strong> - 3BG,GM</li>
        <li><strong>3BK</strong> - 3BK,3BG,GMK,GM</li>
        <li><strong>3BR</strong> - 3BR,3BG,GMR,GM</li>
        <li><strong>3BRK</strong> - 3BK,3BR,3BG,GMK,GMR,GM</li>
        <li><strong>SCG</strong> - SCG,GM</li>
        <li><strong>SCK</strong> - SCK,SCG,GMK,GM</li>
        <li><strong>SCR</strong> - SCR,SCG,GMR,GM</li>
        <li><strong>SCRK</strong> - SCK,SCR,SCG,GMK,GMR,GM</li>
        <li><strong>STG</strong> - STG,GM</li>
        <li><strong>STK</strong> - STK,STG,GMK,GM</li>
        <li><strong>STR</strong> - STR,STG,GMR,GM</li>
        <li><strong>STRK</strong> - STK,STR,STG,GMK,GMR,GM</li>
      </ol>
      <p>
        <strong>**(As per KEA's reservation mapping for seat allocation)</strong>
      </p>
    </div>
  );
};

export default Instructions;
