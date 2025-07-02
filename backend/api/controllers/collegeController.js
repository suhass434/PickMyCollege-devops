import runPythonScript from '../services/runPythonScript.js';

export const handleRecommendation = async (req, res) => {
  const scriptPath = './python/recommender/recommend.py';

  const rank = req.body.rank;
  const category = req.body.category;
  const preferred_location = req.body.location || '';
  const fullBranchArray = req.body.branches || [];
  const branchArray = fullBranchArray.map(branch => branch.slice(0, 2).toUpperCase());
  const num_colleges = req.body.num_colleges || '';

  const args = [
    rank.toString(),
    category,
    preferred_location,
    branchArray.length > 0 ? branchArray.join(',') : '',
    num_colleges.toString()
  ];

  console.log('Received input:');
  console.log(`  Rank: ${rank}`);
  console.log(`  Category: ${category}`);
  console.log(`  Preferred Location: ${preferred_location || 'None'}`);
  console.log(`  Branches: ${branchArray.join(', ') || 'None'}`);
  console.log(`  Number of Colleges: ${num_colleges || 'All'}`);

  try {
    const stdout = await runPythonScript(scriptPath, args);

    const openingBraceIndex = stdout.indexOf('{');
    if (openingBraceIndex !== -1) {
      console.log(stdout.substring(0, openingBraceIndex).trim());
    } else {
      console.log(stdout);
    }

    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}');
    const jsonString = stdout.substring(jsonStart, jsonEnd + 1);
    const result = JSON.parse(jsonString);

    return res.json(result);
  } catch (error) {
    console.error('Error in Python script or JSON parsing:', error);
    return res.status(500).json({ error: 'Recommendation service failed' });
  }
};
