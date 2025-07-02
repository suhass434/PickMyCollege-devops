import { spawn } from 'child_process';

const runPythonScript = (scriptPath, args) => {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [scriptPath, ...args]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', data => {
      stdout += data.toString();
    });

    py.stderr.on('data', data => {
      stderr += data.toString();
    });

    py.on('close', code => {
      if (code !== 0) {
        console.error('Python error:', stderr);
        return reject(stderr);
      }
      resolve(stdout);
    });
  });
};

export default runPythonScript;
