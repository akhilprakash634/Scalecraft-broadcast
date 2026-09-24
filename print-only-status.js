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

function hermesCmd(cmd) {
  return (
    'export XDG_RUNTIME_DIR="/run/user/$(id -u)" && ' +
    'export PATH="$PATH:' +
    '/home/ubuntu/.hermes/bin:' +
    '/home/ubuntu/.local/bin:' +
    '/home/ubuntu/.nvm/versions/node/$(ls /home/ubuntu/.nvm/versions/node/ 2>/dev/null | sort -V | tail -1)/bin' +
    '" && ' +
    'source /home/ubuntu/.bashrc 2>/dev/null || true; ' +
    cmd
  );
}

async function main() {
  const agents = await client.fetch(`*[_type == "agentClient"]`);
  if (agents.length === 0) return;

  const agent = agents[0];
  const checkScript = `
    echo "=== BRIDGE.JS LINES 185-225 ==="
    sed -n '185,225p' /home/ubuntu/.hermes/hermes-agent/scripts/whatsapp-bridge/bridge.js
  `;

  const res = await executeCommand(agent.serverIP, agent.sshPrivateKey, checkScript, agent.serverUser || 'ubuntu');
  console.log("STDOUT:\n", res.stdout);
  console.log("STDERR:\n", res.stderr);
}

main().catch(console.error);
