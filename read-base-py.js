const { createClient } = require('@sanity/client');
const { Client } = require('ssh2');

const projectId = '73xk02vb';
const dataset = 'production';
const apiVersion = '2024-05-14';
const token = 'skc7HnniWstSoyC7mJsw414GZLgPt2Nlc3CISGLtJar532FVTTQSuIApKsIkD9g4bXKw1N3YnhYcwCSqbnxtLlwNJAvgr2065ZQktcgVSXTrTtzIAUb8MZjyg2Wqr0RlAVeAiZZYNSGbupfG14R2SsVrzwaXEkvHb0K6YndyRj9Oen7xurOR';

const client = createClient({ projectId, dataset, apiVersion, useCdn: false, token });

function executeCommand(ip, privateKeyBase64, command, username = 'ubuntu') {
  const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
  return new Promise((resolve) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          resolve({ stdout: '', stderr: err.message, exitCode: -1 });
          return;
        }
        stream.on('data', (data) => { stdout += data.toString(); });
        stream.stderr.on('data', (data) => { stderr += data.toString(); });
        stream.on('close', (code) => {
          conn.end();
          resolve({ stdout, stderr, exitCode: code });
        });
      });
    });
    conn.on('error', (err) => {
      resolve({ stdout: '', stderr: `SSH Error: ${err.message}`, exitCode: -1 });
    });
    conn.connect({ host: ip, port: 22, username, privateKey, readyTimeout: 20000 });
  });
}

async function main() {
  const agents = await client.fetch(`*[_type == "agentClient"]`);
  if (agents.length === 0) return;

  const agent = agents[0];
  const checkScript = `
    python3 -c "import sqlite3; conn = sqlite3.connect('/home/ubuntu/.hermes/state.db'); print(conn.execute(\\"select role, content from messages where session_id='20260611_103335_eb9471b5' order by id desc limit 5\\").fetchall())" 2>/dev/null || true
  `;

  const res = await executeCommand(agent.serverIP, agent.sshPrivateKey, checkScript, agent.serverUser || 'ubuntu');
  console.log("Lines 2628-2690 of base.py:");
  console.log(res.stdout);
}

main().catch(console.error);
