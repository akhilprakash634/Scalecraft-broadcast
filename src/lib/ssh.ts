import { Client } from 'ssh2';
import { getAgentClientByServerIp, updateAgentClientStatus, AgentClient, getAgentClientByClientId } from './agents';


// Rate limiting and sanitization utilities
export function sanitizeInput(input: string): string {
    return input.replace(/[;&|`$(){}[\]<>\\]/g, '');
}

export function validatePhoneNumber(phone: string): boolean {
    return /^[0-9]{10,15}$/.test(phone);
}

export function normalizeAndValidatePhone(phone: string): { cleaned: string | null; error?: string } {
    if (!phone) return { cleaned: null, error: 'Phone number is empty' };
    
    // Strip formatting characters only (spaces, dashes, parentheses, plus sign)
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '').replace(/\D/g, '');

    // Strip leading zero if 11 digits starting with 0 (e.g. 09876543210 -> 9876543210)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
    }

    // Check if the remaining number has a plausible length between 8 and 15 digits (ITU-T E.164)
    if (cleaned.length >= 8 && cleaned.length <= 15) {
        return { cleaned };
    }
    
    return { cleaned: null, error: `Failed plausibility check (cleaned: "${cleaned}", length: ${cleaned.length}). E.164 numbers must be 8-15 digits.` };
}

export function validateIP(ip: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

export function maskKey(key: string): string {
    if (!key || key.length < 12) return '***';
    return key.substring(0, 8) + '...' + key.slice(-4);
}

// Connection helper with retry logic
async function connectWithRetry(
    conn: Client,
    ip: string,
    privateKey: string,
    username: string
): Promise<void> {
    const maxRetries = 3;
    const delayMs = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await new Promise<void>((resolve, reject) => {
                let finished = false;
                const cleanup = () => {
                    conn.removeAllListeners('ready');
                    conn.removeAllListeners('error');
                };
                conn.on('ready', () => {
                    if (!finished) {
                        finished = true;
                        cleanup();
                        resolve();
                    }
                });
                conn.on('error', (err) => {
                    if (!finished) {
                        finished = true;
                        cleanup();
                        reject(err);
                    }
                });
                conn.connect({
                    host: ip,
                    port: 22,
                    username,
                    privateKey,
                    readyTimeout: 30000, // max 30 seconds connection timeout
                });
            });
            return; // Connected successfully!
        } catch (err: any) {
            if (attempt === maxRetries) {
                throw new Error(`SSH connection failed after ${maxRetries} attempts: ${err.message}`);
            }
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}

/**
 * SSH exec sessions don't load ~/.bashrc, so the hermes binary
 * (installed in ~/.hermes/bin or ~/.local/bin) is not on PATH.
 * Wrap every hermes / journalctl command with this helper to
 * resolve the binary location before running.
 */
export function hermesCmd(cmd: string): string {
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

export function shellEscape(arg: string): string {
    return `'` + arg.replace(/'/g, `'\''`) + `'`;
}

export interface HermesContext {
    clientId: string;
    ip: string;
    profile: string | null;
    mode: 'dedicated' | 'shared';
    serviceName: string;
    profileRoot: string;
    soulPath: string;
    sessionPath: string;
    configPath: string;
    qrPath: string;
    botFilterPath: string;
    botGuardPath: string;
    botGuardLogPath: string;
    hermesCommand(cmd: string): string;
}

export function resolveHermesContext(client: AgentClient): HermesContext {
    const profile = client.hermesProfile || null;
    if (profile) {
        const PROFILE_REGEX = /^[a-z0-9][a-z0-9-_]{2,36}$/;
        if (!PROFILE_REGEX.test(profile)) {
            throw new Error(`Invalid Hermes profile name format: ${profile}`);
        }
        const RESERVED_PROFILES = new Set([
            'root', 'system', 'default', 'profiles', 'logs', 'cache', 'tmp',
            'ubuntu', 'admin', 'hermes', 'gateway', 'platform', 'whatsapp', 'config',
            'bin', 'lib', 'run', 'etc', 'data', 'temp', 'backup'
        ]);
        if (RESERVED_PROFILES.has(profile)) {
            throw new Error(`Hermes profile name '${profile}' is a reserved system name.`);
        }
    }

    const mode = profile ? 'shared' : 'dedicated';
    const ip = (profile && client.sharedServerIp) ? client.sharedServerIp : client.serverIP;
    const serviceName = profile ? `hermes-gateway-${profile}` : 'hermes-gateway';
    const homeDir = client.serverUser === 'root' ? '/root' : `/home/${client.serverUser || 'ubuntu'}`;
    const profileRoot = profile ? `${homeDir}/.hermes/profiles/${profile}` : `${homeDir}/.hermes`;

    return {
        clientId: client.id || client._id,
        ip,
        profile,
        mode,
        serviceName,
        profileRoot,
        soulPath: `${profileRoot}/SOUL.md`,
        sessionPath: profile 
            ? `${profileRoot}/platforms/whatsapp/session` 
            : `${homeDir}/.hermes/platforms/whatsapp/session`,
        configPath: `${profileRoot}/config.yaml`,
        qrPath: profile 
            ? `${profileRoot}/pairing_qr.txt` 
            : `${homeDir}/.hermes/pairing_qr.txt`,
        botFilterPath: `${profileRoot}/bot_filters.json`,
        botGuardPath: `${homeDir}/bot_guard_${profile || 'legacy'}.py`,
        botGuardLogPath: `${homeDir}/bot_guard_${profile || 'legacy'}.log`,
        hermesCommand(cmd: string): string {
            const fullCmd = profile ? `hermes -p ${profile} ${cmd}` : `hermes ${cmd}`;
            return hermesCmd(fullCmd);
        }
    };
}

export function getClientServerIp(client: AgentClient): string {
    return resolveHermesContext(client).ip;
}

export function buildHermesCmd(client: AgentClient, command: string): string {
    return resolveHermesContext(client).hermesCommand(command);
}

export function getSoulMdPath(client: AgentClient): string {
    return resolveHermesContext(client).soulPath;
}

export function getSessionPath(client: AgentClient): string {
    return resolveHermesContext(client).sessionPath;
}

export function getPrivateKeyForIp(ip: string): string {
    const sharedServerIp = process.env.SHARED_SERVER_IP || '13.206.143.171';
    const rawKey = ip === sharedServerIp
        ? (process.env.SHARED_SERVER_SSH_KEY || process.env.SCALECRAFT_SSH_PRIVATE_KEY || '')
        : (process.env.SCALECRAFT_SSH_PRIVATE_KEY || '');
    let key = '';
    if (rawKey.includes('BEGIN')) {
        key = rawKey;
    } else {
        try {
            key = Buffer.from(rawKey, 'base64').toString('utf8');
        } catch {
            key = rawKey;
        }
    }
    if (!key.includes('BEGIN')) {
        throw new Error('Invalid SSH key format');
    }
    return key;
}

// Run SSH commands, returning stdout, stderr, and exitCode.
export async function executeCommand(
    ip: string,
    _privateKey: string,
    command: string,
    username = 'ubuntu',
    timeoutMs = 30000 // default 30s timeout
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    if (!validateIP(ip)) {
        throw new Error('Invalid IP address format');
    }

    const privateKey = getPrivateKeyForIp(ip);

    return new Promise((resolve) => {
        const conn = new Client();
        let stdout = '';
        let stderr = '';
        let resolved = false;

        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                conn.end();
                resolve({ stdout: '', stderr: `SSH execution timed out (${timeoutMs / 1000}s limit)`, exitCode: -1 });
            }
        }, timeoutMs);

        conn.on('error', (err) => {
            clearTimeout(timer);
            if (!resolved) {
                resolved = true;
                resolve({ stdout: '', stderr: `SSH Connection Error: ${err.message}`, exitCode: -1 });
            }
        });

        connectWithRetry(conn, ip, privateKey, username)
            .then(() => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        clearTimeout(timer);
                        if (!resolved) {
                            resolved = true;
                            conn.end();
                            resolve({ stdout: '', stderr: err.message, exitCode: -1 });
                        }
                        return;
                    }

                    stream.on('data', (data: Buffer) => {
                        stdout += data.toString();
                    });

                    stream.stderr.on('data', (data: Buffer) => {
                        stderr += data.toString();
                    });

                    stream.on('close', (code: any) => {
                        clearTimeout(timer);
                        if (!resolved) {
                            resolved = true;
                            conn.end();
                            resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : null });
                        }
                    });
                });
            })
            .catch((err: any) => {
                clearTimeout(timer);
                if (!resolved) {
                    resolved = true;
                    resolve({ stdout: '', stderr: `SSH Connection Failed: ${err.message}`, exitCode: -1 });
                }
            });
    });
}

/**
 * Run a command over SSH with a pseudo-terminal (PTY) allocated.
 * Required for interactive CLI tools like `hermes whatsapp` that
 * detect a non-TTY environment and refuse to run.
 *
 * Auto-answers interactive prompts (Update allowed users? [y/N]) by
 * sending Enter (accept default) so hermes skips its setup wizard
 * and reaches the QR code immediately.
 *
 * Resolves early once a QR code is detected in the output.
 */
export async function executeCommandWithPty(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    command: string,
    username = 'ubuntu',
    timeoutMs = 40000
): Promise<{ output: string; exitCode: number | null }> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);

    // 1. Stop the running hermes gateway service to prevent credentials DB locks
    const serviceName = ctx ? ctx.serviceName : 'hermes-gateway';
    await executeCommand(ip, privateKey, hermesCmd(`systemctl --user stop ${serviceName} --no-block`), username);

    // 2. Kill any old pair_whatsapp processes and tmux sessions
    const profileName = ctx ? ctx.profile : '';
    const scriptPattern = profileName ? `[p]air_whatsapp_${profileName}.py` : '[p]air_whatsapp.py';
    const tmuxSession = profileName ? `hermes_pairing_${profileName}` : 'hermes_pairing';
    const qrPath = ctx ? ctx.qrPath : '/home/ubuntu/.hermes/pairing_qr.txt';
    const sessionPath = ctx ? ctx.sessionPath : '/home/ubuntu/.hermes/platforms/whatsapp/session';

    await executeCommand(ip, privateKey, `pkill -f "${scriptPattern}" || true`, username);
    await executeCommand(ip, privateKey, `tmux kill-session -t ${tmuxSession} 2>/dev/null || true`, username);
    await executeCommand(ip, privateKey, `rm -f ${qrPath}`, username);
    await executeCommand(ip, privateKey, `rm -rf ${sessionPath}`, username);

    // 3. Define the python pairing script content
    const hermesCmdArgs = ctx && ctx.profile ? `["hermes", "-p", "${ctx.profile}", "whatsapp"]` : `["hermes", "whatsapp"]`;
    const pythonScript = `import os
import sys
import pty
import select
import subprocess
import time
import re

output_file = "${qrPath}"
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, "w", encoding="utf-8") as f:
    f.write("STARTING_PAIRING_PROCESS\\n")

env = os.environ.copy()
nvm_dir = "/home/ubuntu/.nvm/versions/node"
node_path = ""
if os.path.exists(nvm_dir):
    try:
        versions = sorted(os.listdir(nvm_dir))
        if versions:
            node_path = os.path.join(nvm_dir, versions[-1], "bin")
    except:
        pass

path = env.get("PATH", "")
extra_paths = ["/home/ubuntu/.hermes/bin", "/home/ubuntu/.local/bin"]
if node_path:
    extra_paths.append(node_path)
env["PATH"] = ":".join(extra_paths) + ":" + path
env["HOME"] = "/home/ubuntu"

master, slave = pty.openpty()
proc = subprocess.Popen(
    ${hermesCmdArgs},
    stdin=slave,
    stdout=slave,
    stderr=slave,
    close_fds=True,
    env=env,
    cwd="/home/ubuntu"
)
os.close(slave)

accumulated_output = ""
start_time = time.time()
timeout = 300 # 5 minutes

yes_patterns = [
    r"session found",
    r"want to repair",
    r"overwrite",
    r"already active",
    r"repair the connection"
]

# Passkey/WebAuthn prompts - explicitly decline with 'n' since a headless
# VPS has no platform authenticator to store a passkey credential.
no_patterns = [
    r"passkey",
    r"pass.?key",
    r"create a passkey",
    r"set up passkey",
    r"register passkey",
    r"save passkey",
    r"use passkey",
    r"enable passkey",
    r"biometric",
    r"fingerprint",
    r"face.?id",
    r"device credential",
    r"webauthn",
    r"security key",
    r"skip.*passkey",
    r"not now",
]

default_patterns = [
    r"\\[y/N\\]",
    r"\\[Y/n\\]",
    r"\\[y/n\\]",
    r"Update allowed users\\?",
    r"Update bot number\\?",
    r"Update gemini key\\?",
    r"press enter",
    r"continue\\?"
]

try:
    while time.time() - start_time < timeout:
        if proc.poll() is not None:
            break
            
        r, w, x = select.select([master], [], [], 0.5)
        if master in r:
            try:
                data = os.read(master, 4096)
                if not data:
                    break
                chunk = data.decode("utf-8", errors="ignore")
                accumulated_output += chunk
                
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(accumulated_output)
                    
                answered = False
                # First priority: yes patterns (repair/overwrite session)
                for pattern in yes_patterns:
                    if re.search(pattern, chunk, re.IGNORECASE):
                        os.write(master, b"y\\n")
                        answered = True
                        break
                # Second priority: passkey/WebAuthn prompts - always decline
                if not answered:
                    for pattern in no_patterns:
                        if re.search(pattern, chunk, re.IGNORECASE):
                            os.write(master, b"n\\n")
                            answered = True
                            break
                # Third priority: generic prompts - accept default (Enter)
                if not answered:
                    for pattern in default_patterns:
                        if re.search(pattern, chunk, re.IGNORECASE):
                            os.write(master, b"\\n")
                            break
            except Exception:
                break
        time.sleep(0.1)
finally:
    try:
        proc.terminate()
        proc.wait(timeout=2)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass
    try:
        os.close(master)
    except Exception:
        pass
`;

    // 4. Upload the python pairing script to the remote server
    const scriptPath = `/home/ubuntu/pair_whatsapp_${profileName || 'legacy'}.py`;
    const uploadSuccess = await uploadFile(ip, privateKey, pythonScript, scriptPath, username);
    if (!uploadSuccess) {
        return { output: 'Failed to upload pairing script to VPS', exitCode: -1 };
    }

    // 5. Start the python script inside a detached tmux session so it survives SSH disconnects
    await executeCommand(ip, privateKey, `tmux new-session -d -s ${tmuxSession} "python3 ${scriptPath}"`, username);

    // 6. Poll the pairing_qr.txt file until the QR code has rendered or timeout is reached
    const isQrPresent = (text: string) => {
        const blockLines = text.split('\n').filter(
            l => l.includes('█') || l.includes('▄') || l.includes('▀')
        );
        return blockLines.length > 5;
    };

    let output = '';
    const startPollTime = Date.now();
    const pollTimeout = 25000; // 25s polling timeout
    while (Date.now() - startPollTime < pollTimeout) {
        const readRes = await executeCommand(ip, privateKey, `cat ${qrPath} 2>/dev/null || true`, username);
        output = readRes.stdout;
        if (isQrPresent(output)) {
            // Wait a moment for the QR code to finish rendering completely
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const finalRes = await executeCommand(ip, privateKey, `cat ${qrPath} 2>/dev/null || true`, username);
            output = finalRes.stdout;
            return { output, exitCode: 0 };
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return { output: output || 'Timeout waiting for QR code to generate.', exitCode: -1 };
}

// Upload file contents to a remote file path using SFTP
export async function uploadFile(
    ip: string,
    _privateKey: string,
    content: string,
    remotePath: string,
    username = 'ubuntu'
): Promise<boolean> {
    if (!validateIP(ip)) {
        throw new Error('Invalid IP address format');
    }

    const privateKey = getPrivateKeyForIp(ip);

    return new Promise((resolve) => {
        const conn = new Client();
        let resolved = false;

        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                conn.end();
                resolve(false);
            }
        }, 30000);

        conn.on('error', () => {
            clearTimeout(timer);
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        });

        connectWithRetry(conn, ip, privateKey, username)
            .then(() => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        clearTimeout(timer);
                        if (!resolved) {
                            resolved = true;
                            conn.end();
                            resolve(false);
                        }
                        return;
                    }

                    const stream = sftp.createWriteStream(remotePath);
                    stream.on('error', () => {
                        clearTimeout(timer);
                        if (!resolved) {
                            resolved = true;
                            conn.end();
                            resolve(false);
                        }
                    });

                    stream.on('close', () => {
                        clearTimeout(timer);
                        if (!resolved) {
                            resolved = true;
                            conn.end();
                            resolve(true);
                        }
                    });

                    stream.write(content);
                    stream.end();
                });
            })
            .catch(() => {
                clearTimeout(timer);
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            });
    });
}

// Read remote file contents as string
export async function readFile(
    ip: string,
    _privateKey: string,
    remotePath: string,
    username = 'ubuntu'
): Promise<string> {
    if (!validateIP(ip)) {
        throw new Error('Invalid IP address format');
    }

    const privateKey = getPrivateKeyForIp(ip);

    return new Promise((resolve) => {
        const conn = new Client();
        let resolved = false;

        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                conn.end();
                resolve('');
            }
        }, 30000);

        conn.on('error', () => {
            clearTimeout(timer);
            if (!resolved) {
                resolved = true;
                resolve('');
            }
        });

        connectWithRetry(conn, ip, privateKey, username)
            .then(() => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        clearTimeout(timer);
                        if (!resolved) {
                            resolved = true;
                            conn.end();
                            resolve('');
                        }
                        return;
                    }

                    sftp.readFile(remotePath, 'utf8', (err, data) => {
                        clearTimeout(timer);
                        if (!resolved) {
                            resolved = true;
                            conn.end();
                            resolve(err || !data ? '' : data.toString());
                        }
                    });
                });
            })
            .catch(() => {
                clearTimeout(timer);
                if (!resolved) {
                    resolved = true;
                    resolve('');
                }
            });
    });
}

// Check gateway running status, WhatsApp connection health, uptime, messages count.
export async function agentStatus(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    username = 'ubuntu',
    timeoutMs = 5000,
    range = 'today'
): Promise<{
    running: boolean;
    uptime: string;
    lastMessage: string;
    messageCount: number;
    assistantMessageCount?: number;
    paired: boolean;
    antiBotActive: boolean;
    soulFileConfigured: boolean;
    isPatched: boolean;
    cronInstalled: boolean;
    sessionConfigUpdateRequired?: boolean;
}> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);

    const configPath = ctx ? ctx.configPath : '/home/ubuntu/.hermes/config.yaml';
    const soulPath = ctx ? ctx.soulPath : '/home/ubuntu/.hermes/SOUL.md';
    const serviceName = ctx ? ctx.serviceName : 'hermes-gateway';
    const logPath = ctx ? `${ctx.profileRoot}/logs/gateway.log` : '/home/ubuntu/.hermes/logs/gateway.log';
    const sessionsDir = ctx ? `${ctx.profileRoot}/sessions` : '/home/ubuntu/.hermes/sessions';
    const configPrefix = ctx && ctx.profile ? `hermes -p ${ctx.profile}` : 'hermes';

    const checkScript = hermesCmd(`
    SOUL_CHECK=$(test -f ${soulPath} && grep "soul_file:" ${configPath} 2>/dev/null || echo "NOT_SET")
    PATCH_CHECK=$(grep -q "cdn.sanity.io" ~/.hermes/hermes-agent/gateway/platforms/base.py 2>/dev/null && grep -q "metadata=metadata" ~/.hermes/hermes-agent/gateway/platforms/whatsapp.py 2>/dev/null && grep -q "force: bool = False" ~/.hermes/hermes-agent/gateway/session.py 2>/dev/null && echo "PATCHED" || echo "NOT_PATCHED")
    GATEWAY_STATUS=$(systemctl --user is-active ${serviceName} 2>/dev/null || echo "inactive")
    UPTIME=$(systemctl --user show ${serviceName} --property=ActiveEnterTimestamp 2>/dev/null | cut -d= -f2 || echo "")
    MSG_MONTH=$(grep -c "inbound message:" ${logPath} 2>/dev/null || echo "0")
    BRIDGE_HEALTH=$(curl -s --max-time 3 http://127.0.0.1:3009/health 2>/dev/null || echo "offline")
    LAST_MSG_TIME=$(find ${sessionsDir}/ -name "*.jsonl" -type f -exec stat -c "%Y" {} + 2>/dev/null | sort -n | tail -1 || echo "")
    if [ -n "$LAST_MSG_TIME" ]; then
      LAST_MSG_TIME=$(date -d "@$LAST_MSG_TIME" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
    fi
    ANTIBOT_LIMIT=$(${configPrefix} config get max_messages_per_contact_per_hour 2>/dev/null || echo "")
    
    # Automatic crontab heartbeat JSON format repair
    if crontab -l 2>/dev/null | grep -q "heartbeat"; then
      crontab -l 2>/dev/null | sed '/heartbeat/s/\\"/\"/g' | crontab -
    fi
    CRON_CHECK=$(crontab -l 2>/dev/null | grep -q "heartbeat" && echo "YES" || echo "NO")

    USER_PROFILE_VAL=$(grep "user_profile_enabled:" ${configPath} 2>/dev/null | awk '{print $2}' || echo "true")
    RESET_MODE_VAL=$(grep -A 5 "session_reset:" ${configPath} 2>/dev/null | grep "mode:" | head -1 | awk '{print $2}' || echo "both")
    if [ "$USER_PROFILE_VAL" = "true" ] || [ "$RESET_MODE_VAL" = "both" ]; then
      CFG_UPDATE_REQ="YES"
    else
      CFG_UPDATE_REQ="NO"
    fi
    PROFILE_LIST=$(hermes profile list 2>/dev/null | tr '\n' ',' || echo "")

    MSG_COUNT=$(python3 -c "
import sqlite3, os, time, datetime
db_path = os.path.expanduser('${ctx ? ctx.profileRoot : '~/.hermes'}/state.db')
count = 0
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        now = time.time()
        offset = 19800
        local_time = now + offset
        struct_local = time.gmtime(local_time)
        start_of_today_local_epoch = now - (struct_local.tm_hour * 3600 + struct_local.tm_min * 60 + struct_local.tm_sec)
        
        start_epoch = 0
        r = '${range}'
        if r == 'today':
            start_epoch = start_of_today_local_epoch
        elif r == 'week':
            start_epoch = start_of_today_local_epoch - (struct_local.tm_wday * 86400)
        elif r == 'month':
            start_epoch = start_of_today_local_epoch - ((struct_local.tm_mday - 1) * 86400)
        elif r == 'total':
            start_epoch = 0

        def to_epoch(ts_val):
            if not ts_val: return 0
            try: return float(ts_val)
            except:
                try:
                    dt = datetime.datetime.fromisoformat(str(ts_val).replace('Z', '+00:00'))
                    return dt.timestamp()
                except: return 0

        cur.execute('SELECT timestamp, role FROM messages')
        for ts_val, role in cur.fetchall():
            if role in ['user', 'assistant']:
                if to_epoch(ts_val) >= start_epoch:
                    count += 1
        conn.close()
    except Exception as e:
        pass
print(count)
" 2>/dev/null || echo "0")

    MSG_ASSISTANT_COUNT=$(python3 -c "
import sqlite3, os, time, datetime
db_path = os.path.expanduser('${ctx ? ctx.profileRoot : '~/.hermes'}/state.db')
count = 0
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        now = time.time()
        offset = 19800
        local_time = now + offset
        struct_local = time.gmtime(local_time)
        start_of_today_local_epoch = now - (struct_local.tm_hour * 3600 + struct_local.tm_min * 60 + struct_local.tm_sec)
        
        start_epoch = 0
        r = '${range}'
        if r == 'today':
            start_epoch = start_of_today_local_epoch
        elif r == 'week':
            start_epoch = start_of_today_local_epoch - (struct_local.tm_wday * 86400)
        elif r == 'month':
            start_epoch = start_of_today_local_epoch - ((struct_local.tm_mday - 1) * 86400)
        elif r == 'total':
            start_epoch = 0

        def to_epoch(ts_val):
            if not ts_val: return 0
            try: return float(ts_val)
            except:
                try:
                    dt = datetime.datetime.fromisoformat(str(ts_val).replace('Z', '+00:00'))
                    return dt.timestamp()
                except: return 0

        cur.execute('SELECT timestamp, role FROM messages')
        for ts_val, role in cur.fetchall():
            if role == 'assistant':
                if to_epoch(ts_val) >= start_epoch:
                    count += 1
        conn.close()
    except Exception as e:
        pass
print(count)
" 2>/dev/null || echo "0")

    echo "SOUL_CHECK=$SOUL_CHECK"
    echo "PATCH_CHECK=$PATCH_CHECK"
    echo "GATEWAY_STATUS=$GATEWAY_STATUS"
    echo "UPTIME=$UPTIME"
    echo "MSG_MONTH=$MSG_MONTH"
    echo "BRIDGE_HEALTH=$BRIDGE_HEALTH"
    echo "LAST_MSG_TIME=$LAST_MSG_TIME"
    echo "ANTIBOT_LIMIT=$ANTIBOT_LIMIT"
    echo "CRON_CHECK=$CRON_CHECK"
    echo "CFG_UPDATE_REQ=$CFG_UPDATE_REQ"
    echo "PROFILE_LIST=$PROFILE_LIST"
    echo "MSG_COUNT=$MSG_COUNT"
    echo "MSG_ASSISTANT_COUNT=$MSG_ASSISTANT_COUNT"
  `);

    const res = await executeCommand(ip, privateKey, checkScript, username, timeoutMs);
    const statusMap: Record<string, string> = {};
    res.stdout.split('\n').forEach((line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            statusMap[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });

    let running = statusMap['GATEWAY_STATUS'] === 'active';
    let paired = false;

    if (ctx && ctx.mode === 'shared') {
        running = false;
        paired = false;
        try {
            const rawList = statusMap['PROFILE_LIST'] || '';
            const lines = rawList.split(',');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const name = parts[0].replace(/^[◆*]+/, '').trim();
                    if (name === ctx.profile) {
                        const gatewayStatus = parts[2].trim().toLowerCase();
                        if (gatewayStatus === 'running' || gatewayStatus === 'active') {
                            running = true;
                            paired = true; // best effort fallback
                        }
                    }
                }
            }
        } catch {}
    } else {
        running = statusMap['GATEWAY_STATUS'] === 'active' && statusMap['BRIDGE_HEALTH'] !== 'offline';
        if (statusMap['BRIDGE_HEALTH'] && statusMap['BRIDGE_HEALTH'] !== 'offline') {
            try {
                const parsed = JSON.parse(statusMap['BRIDGE_HEALTH']);
                paired = parsed.status === 'connected';
            } catch {
                paired = statusMap['BRIDGE_HEALTH'].toLowerCase().includes('connected');
            }
        }
    }

    let uptime = statusMap['UPTIME'] || 'N/A';
    if (uptime && uptime !== 'N/A') {
        try {
            const parsedDate = new Date(uptime);
            if (!isNaN(parsedDate.getTime())) {
                uptime = parsedDate.toLocaleString('en-US', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                    hour12: false
                }) + ' IST';
            }
        } catch {}
    }
    const lastMessage = statusMap['LAST_MSG_TIME'] || 'N/A';
    const messageCount = parseInt(statusMap['MSG_COUNT'] || statusMap['MSG_MONTH'] || '0', 10);
    const assistantMessageCount = parseInt(statusMap['MSG_ASSISTANT_COUNT'] || '0', 10);
    const antiBotActive = statusMap['ANTIBOT_LIMIT'] === '10';
    const soulFileConfigured = statusMap['SOUL_CHECK'] !== undefined && !statusMap['SOUL_CHECK'].includes('NOT_SET') && statusMap['SOUL_CHECK'].includes('soul_file');
    const isPatched = statusMap['PATCH_CHECK'] === 'PATCHED';
    const cronInstalled = statusMap['CRON_CHECK'] === 'YES';
    const sessionConfigUpdateRequired = statusMap['CFG_UPDATE_REQ'] === 'YES';

    return { running, uptime, lastMessage, messageCount, assistantMessageCount, paired, antiBotActive, soulFileConfigured, isPatched, cronInstalled, sessionConfigUpdateRequired };
}

// Restart (or start) gateway agent service - also cleans up any active pairing sessions.
// This must be fast (< 5s) because it runs inside a Vercel serverless function.
// The dashboard polls status every 30s to reflect the updated state.
export async function restartAgent(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    username = 'ubuntu'
): Promise<boolean> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);
    // Kill pairing session, then restart/start the systemd user service directly.
    // Using systemctl --user is more reliable than the hermes gateway wrapper.
    const serviceName = ctx ? ctx.serviceName : 'hermes-gateway';
    const profileName = ctx ? ctx.profile : '';
    const scriptPattern = profileName ? `[p]air_whatsapp_${profileName}.py` : '[p]air_whatsapp.py';
    const tmuxSession = profileName ? `hermes_pairing_${profileName}` : 'hermes_pairing';
    const qrPath = ctx ? ctx.qrPath : '/home/ubuntu/.hermes/pairing_qr.txt';

    const cmd = hermesCmd(
        `pkill -f "${scriptPattern}" 2>/dev/null || true; ` +
        `tmux kill-session -t ${tmuxSession} 2>/dev/null || true; ` +
        `rm -f ${qrPath}; ` +
        `systemctl --user restart ${serviceName} --no-block 2>/dev/null || systemctl --user start ${serviceName} --no-block 2>/dev/null || true`
    );
    await executeCommand(ip, privateKey, cmd, username);
    // Return true immediately - dashboard polls every 30s to show updated status
    return true;
}

// Update SOUL.md content and restart gateway
// Update SOUL.md content and restart gateway
export async function updateSOUL(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    soulContent: string,
    username = 'ubuntu'
): Promise<boolean> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);
    const soulPath = ctx ? ctx.soulPath : '/home/ubuntu/.hermes/SOUL.md';
    const uploadSuccess = await uploadFile(ip, privateKey, soulContent, soulPath, username);
    if (!uploadSuccess) return false;
    return await restartAgent(ctx || ip, privateKey, username);
}

// Write SOUL.md to the correct path on the remote server.
// IMPORTANT: Do NOT embed <!-- CONFIG: ... --> in SOUL.md - Hermes's security scanner
// detects "ignore"/"system" keywords in HTML comments and blocks the entire SOUL.md,
// causing the agent to fall back to raw Gemini. Config is written to soul_config.json separately.
export async function writeSoulMd(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    soulContent: string,
    username = 'ubuntu'
): Promise<boolean> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);

    const homeDir = username === 'root' ? '/root' : `/home/${username}`;
    const soulPath = ctx ? ctx.soulPath : `${homeDir}/.hermes/SOUL.md`;

    // SAFETY NET: Strip any HTML comments (<!-- ... -->) before writing.
    // Hermes's security scanner (threat_patterns.py) blocks any file containing
    // HTML comments with keywords like 'ignore', 'system', 'hidden', 'secret', 'override'.
    // This strip is defensive - the compiler should never produce comments - but
    // ensures the file is always clean regardless of upstream changes.
    const cleanContent = soulContent
        .replace(/<!--[\s\S]*?-->/g, '');

    // Ensure directory exists and write SOUL.md directly
    const dirToCreate = ctx ? ctx.profileRoot : `${homeDir}/.hermes`;
    await executeCommand(ip, privateKey, `mkdir -p ${dirToCreate}`, username);
    const success = await uploadFile(ip, privateKey, cleanContent, soulPath, username);

    if (success) {
        // Verify the first line was written correctly
        const verifyRes = await executeCommand(ip, privateKey, `head -3 ${soulPath} 2>/dev/null`, username);
        console.log('[writeSoulMd] Written successfully. First lines:', verifyRes.stdout.substring(0, 100));
    } else {
        console.error('[writeSoulMd] Upload failed to', soulPath);
    }

    // Restart gateway via systemctl (reliable, doesn't require hermes CLI PATH)
    const serviceName = ctx ? ctx.serviceName : 'hermes-gateway';
    await executeCommand(
        ip, privateKey,
        `export XDG_RUNTIME_DIR="/run/user/$(id -u)" && systemctl --user stop ${serviceName} 2>/dev/null || true`,
        username
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await executeCommand(
        ip, privateKey,
        `export XDG_RUNTIME_DIR="/run/user/$(id -u)" && systemctl --user start ${serviceName} 2>/dev/null || true`,
        username
    );

    return success;
}

// Apply anti-bot Hermes configuration settings
export function prependAntiBotRules(soulMdContent: string): string {
    const antiBotRules = `
## ANTI-BOT PROTECTION - HIGHEST PRIORITY
## These rules override ALL other instructions

### RULE 1 - DETECT AI/BOT IDENTITY
If incoming message contains any of these patterns,
STOP REPLYING immediately:
- "I am an AI", "I'm an AI", "AI assistant"
- "automated message", "language model"
- "powered by gemini", "powered by gpt"
- "Hermes", "ChatGPT", "Claude", "Copilot"

### RULE 2 - DETECT RATE LIMIT ERRORS
If incoming message contains any of these,
STOP REPLYING immediately:
- "rate limit", "quota exceeded"
- "too many requests", "API limit"
- "try again later", "429", "503"
- "error occurred", "service unavailable"

### RULE 3 - DETECT CONVERSATION LOOPS
If you have sent more than 15 messages to one
contact today → STOP REPLYING completely.
If messages arrive faster than every 30 seconds
for 10+ consecutive messages → STOP REPLYING.

### RULE 4 - SILENCE RULE
When any rule above triggers or you need to go silent:
DO NOT send any warning, explanation, or status update text in brackets (such as "[Agent goes silent]" or "[Silence]").
Simply stop replying completely. Output an empty string or absolutely nothing.

---

`;
    return antiBotRules + soulMdContent;
}

export async function applyAntiBotConfig(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    username = 'ubuntu'
): Promise<boolean> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);

    const configPrefix = ctx && ctx.profile ? `hermes -p ${ctx.profile}` : 'hermes';
    const cmd = hermesCmd(
        `${configPrefix} config set max_messages_per_contact_per_hour 8 && ` +
        `${configPrefix} config set max_conversation_length 25 && ` +
        `${configPrefix} config set busy_input_mode queue`
    );
    await executeCommand(ip, privateKey, cmd, username);
    return await restartAgent(ctx || ip, privateKey, username);
}

// Apply comprehensive 5-layer bot protection configurations and guard scripts
export async function applyBotProtectionConfig(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    clientId: string,
    username = 'ubuntu'
): Promise<boolean> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const resolvedClientId = ctx ? ctx.clientId : clientId;

    // Fetch client record from database to read active plan and daily limit
    let dailyLimit = 100;
    let heartbeatToken = '';
    try {
        const clientRecord = ctx ? await getAgentClientByClientId(resolvedClientId) : await getAgentClientByServerIp(ip);
        const plan = clientRecord?.plan || 'starter';
        heartbeatToken = clientRecord?.heartbeat_token || '';
        const dailyLimits: Record<string, number> = {
            starter: 100,
            growth: 500,
            pro: 2000,
        };
        dailyLimit = dailyLimits[plan] || 100;
    } catch (err) {
        console.error('[applyBotProtectionConfig] Failed to fetch client plan for dailyLimit:', err);
    }

    const privateKey = getPrivateKeyForIp(ip);

    // 1. Run hermes config commands
    const configPrefix = ctx && ctx.profile ? `hermes -p ${ctx.profile}` : 'hermes';
    const configCmd = hermesCmd(
        `${configPrefix} config set max_messages_per_contact_per_hour 10 && ` +
        `${configPrefix} config set max_conversation_turns 20 && ` +
        `${configPrefix} config set busy_input_mode queue && ` +
        `${configPrefix} config set ignore_system_notifications true`
    );
    await executeCommand(ip, privateKey, configCmd, username);

    // 2. Upload bot_filters.json
    const botFilters = {
        blocked_patterns: [
            "rate limit",
            "quota exceeded",
            "too many requests",
            "API limit",
            "try again later",
            "I am an AI",
            "I'm an AI",
            "AI assistant",
            "automated message",
            "powered by gemini",
            "powered by gpt",
            "language model"
        ],
        max_messages_per_contact_per_hour: 10,
        max_total_conversation_turns: 20,
        min_seconds_between_messages: 10
    };
    const profileRoot = ctx ? ctx.profileRoot : '/home/ubuntu/.hermes';
    const botFilterPath = ctx ? ctx.botFilterPath : '/home/ubuntu/.hermes/bot_filters.json';
    await executeCommand(ip, privateKey, `mkdir -p ${profileRoot}`, username);
    await uploadFile(ip, privateKey, JSON.stringify(botFilters, null, 2), botFilterPath, username);

    // 3. Create and upload bot_guard.py
    const serviceName = ctx ? ctx.serviceName : 'hermes-gateway';
    const sessionsFile = ctx ? `${ctx.profileRoot}/sessions/sessions.json` : '/home/ubuntu/.hermes/sessions/sessions.json';
    const dumpsDir = ctx ? `${ctx.profileRoot}/request_dump` : '/home/ubuntu/.hermes/request_dump';
    const dumpsDirAlt = ctx ? `${ctx.profileRoot}/dumps` : '/home/ubuntu/.hermes/dumps';
    const blocklistFile = ctx ? `${ctx.profileRoot}/auto_blocklist.txt` : '/home/ubuntu/.hermes/auto_blocklist.txt';
    const dbPath = ctx ? `${ctx.profileRoot}/state.db` : '/home/ubuntu/.hermes/state.db';
    const sessionsDir = ctx ? `${ctx.profileRoot}/sessions` : '/home/ubuntu/.hermes/sessions';
    const normalBlocklist = ctx ? `${ctx.profileRoot}/blocklist.txt` : '/home/ubuntu/.hermes/blocklist.txt';
    
    // Stop commands inside python script
    const stopCmds = ctx && ctx.profile
        ? `["systemctl", "--user", "stop", "${serviceName}"]\n    subprocess.run(["hermes", "-p", "${ctx.profile}", "gateway", "stop"], capture_output=True)`
        : `["systemctl", "--user", "stop", "hermes-gateway"]\n    subprocess.run(["hermes", "gateway", "stop"], capture_output=True)`;

    const botGuardScript = `import json
import os
import glob
import time
import datetime
import urllib.request
import subprocess
import sqlite3
import sys

client_id = "${resolvedClientId}"
webhook_url = "https://thescalecraft.in/api/dashboard/agent/bot-alert"
heartbeat_token = "${heartbeatToken}"
daily_limit = ${dailyLimit}

# Check if gateway is active first
gateway_active = False
try:
    res = subprocess.run(["systemctl", "--user", "is-active", "${serviceName}"], capture_output=True, text=True)
    if res.stdout.strip() == "active":
        gateway_active = True
except:
    pass

if not gateway_active:
    print("Hermes gateway is not active. Skipping guard check.")
    sys.exit(0)

# Paths
sessions_file = "${sessionsFile}"
dumps_dir = "${dumpsDir}"
dumps_dir_alt = "${dumpsDirAlt}"
blocklist_file = "${blocklistFile}"

now = time.time()
today_start = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
today_start_ts = today_start.timestamp()

# Helper to check request dumps
def count_dumps(session_id, minutes):
    count = 0
    dirs = [dumps_dir, dumps_dir_alt]
    for d in dirs:
        if os.path.exists(d):
            for f in os.listdir(d):
                fp = os.path.join(d, f)
                try:
                    mtime = os.path.getmtime(fp)
                    if now - mtime < (minutes * 60):
                        if not session_id or session_id in f:
                            count += 1
                except:
                    pass
    return count

# Function to get total sends today (across all sessions)
def get_total_sends_today():
    total_sends = 0
    db_path = "${dbPath}"
    sqlite_success = False
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT timestamp, role FROM messages")
            rows = cursor.fetchall()
            conn.close()
            sqlite_success = True
            for m_timestamp, role in rows:
                if role in ['assistant', 'agent']:
                    ts = None
                    if isinstance(m_timestamp, (int, float)):
                        ts = m_timestamp
                    elif isinstance(m_timestamp, str) and m_timestamp.strip():
                        try:
                            dt = datetime.datetime.fromisoformat(m_timestamp.replace('Z', '+00:00'))
                            ts = dt.timestamp()
                        except:
                            pass
                    if ts and ts >= today_start_ts:
                        total_sends += 1
        except Exception as e:
            print(f"SQLite daily count error: {e}")
            
    if not sqlite_success or total_sends == 0:
        total_sends = 0
        sessions_dir = "${sessionsDir}"
        if os.path.exists(sessions_dir):
            for f in os.listdir(sessions_dir):
                if f.endswith('.jsonl'):
                    try:
                        with open(os.path.join(sessions_dir, f), 'r', encoding='utf-8') as jf:
                            for line in jf:
                                try:
                                    data = json.loads(line.strip())
                                    role = data.get('role', '')
                                    timestamp_str = data.get('timestamp', '')
                                    if role in ['assistant', 'agent'] or data.get('isBot', False):
                                        if timestamp_str:
                                            dt = datetime.datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                                            ts = dt.timestamp()
                                            if ts >= today_start_ts:
                                                total_sends += 1
                                except:
                                    pass
                    except:
                        pass
    return total_sends

# Check daily message limits first
total_sends_today = get_total_sends_today()
if daily_limit > 0 and total_sends_today >= daily_limit:
    print(f"EMERGENCY: Daily limit reached ({total_sends_today}/{daily_limit}). Stopping hermes gateway...")
    subprocess.run(${stopCmds}, capture_output=True)
    
    payload = {
        "clientId": client_id,
        "phone": "SYSTEM",
        "reason": f"Daily message limit reached ({total_sends_today} / {daily_limit})",
        "messageCount": total_sends_today,
        "estimatedCost": round(total_sends_today * 0.30, 2)
    }
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + heartbeat_token
        }
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            pass
    except Exception as e:
        print(f"Daily limit Webhook failed: {e}")
    sys.exit(0)

# 1. Read sessions
sessions = {}
if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
    except:
        pass

alerts = []

for key, val in sessions.items():
    phone = key.split(':')[-1]
    sid = val.get('session_id') if isinstance(val, dict) else val
    if not sid:
        continue
    
    # Try reading from SQLite state.db first
    messages_1h = []
    db_read_success = False
    db_path = "${dbPath}"
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT role, timestamp FROM messages WHERE session_id = ? ORDER BY id ASC",
                (sid,)
            )
            rows = cursor.fetchall()
            conn.close()
            db_read_success = True
            for role, m_timestamp in rows:
                if role in ['assistant', 'agent']:
                    ts = None
                    if isinstance(m_timestamp, (int, float)):
                        ts = m_timestamp
                    elif isinstance(m_timestamp, str) and m_timestamp.strip():
                        try:
                            dt = datetime.datetime.fromisoformat(m_timestamp.replace('Z', '+00:00'))
                            ts = dt.timestamp()
                        except:
                            pass
                    if ts and (now - ts < 3600):
                        messages_1h.append(ts)
        except Exception as e:
            print(f"Error reading SQLite db for session {sid}: {e}")
            db_read_success = False

    # Fallback to jsonl files if SQLite failed or returned empty
    if not db_read_success:
        jsonl_path = os.path.expanduser(f'${sessionsDir}/{sid}.jsonl')
        if os.path.exists(jsonl_path):
            try:
                with open(jsonl_path, 'r', encoding='utf-8') as jf:
                    for line in jf:
                        try:
                            data = json.loads(line.strip())
                            role = data.get('role', '')
                            timestamp_str = data.get('timestamp', '')
                            if role in ['assistant', 'agent'] or data.get('isBot', False):
                                if timestamp_str:
                                    try:
                                        dt = datetime.datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                                        ts = dt.timestamp()
                                        if now - ts < 3600:
                                            messages_1h.append(ts)
                                    except:
                                        pass
                        except:
                            pass
            except:
                pass
        
    msg_count = len(messages_1h)
    dumps_30m = count_dumps(sid, 30)
    
    is_rapid_fire = False
    if len(messages_1h) >= 10:
        sorted_ts = sorted(messages_1h)
        if sorted_ts[-1] - sorted_ts[-10] < 600:
            is_rapid_fire = True
            
    alert_reason = []
    if msg_count > 20:
        alert_reason.append(f"More than 20 messages in 1 hour ({msg_count} messages)")
    if dumps_30m > 10:
        alert_reason.append(f"More than 10 API request dumps in 30 mins ({dumps_30m} dumps)")
    if is_rapid_fire:
        alert_reason.append("Messages arriving faster than 1 per minute for > 10 minutes")
        
    if alert_reason:
        reason_str = ", ".join(alert_reason)
        cost_estimate = round(msg_count * 0.30, 2)
        alerts.append({
            "phone": phone,
            "reason": reason_str,
            "messageCount": msg_count,
            "estimatedCost": cost_estimate
        })

if alerts:
    blocked_phones = set()
    if os.path.exists(blocklist_file):
        try:
            with open(blocklist_file, 'r') as bf:
                for line in bf:
                    if line.strip():
                        blocked_phones.add(line.strip())
        except:
            pass
            
    for a in alerts:
        blocked_phones.add(a['phone'])
        
    try:
        with open(blocklist_file, 'w') as bf:
            for bp in sorted(blocked_phones):
                bf.write(f"{bp}\\n")
    except:
        pass
        
    normal_blocklist = "${normalBlocklist}"
    try:
        with open(normal_blocklist, 'a') as bf:
            for a in alerts:
                bf.write(f"\\n{a['phone']}")
    except:
        pass
            
    for a in alerts:
        payload = {
            "clientId": client_id,
            "phone": a['phone'],
            "reason": a['reason'],
            "messageCount": a['messageCount'],
            "estimatedCost": a['estimatedCost']
        }
        try:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + heartbeat_token
            }
            req = urllib.request.Request(
                webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                pass
        except Exception as e:
            print(f"Webhook failed: {e}")
            
    max_msgs = max(a['messageCount'] for a in alerts)
    if max_msgs > 50:
        print("EMERGENCY: Stopping hermes gateway...")
        subprocess.run(${stopCmds}, capture_output=True)
`;
    const botGuardPath = ctx ? ctx.botGuardPath : '/home/ubuntu/bot_guard.py';
    const botGuardLogPath = ctx ? ctx.botGuardLogPath : '/home/ubuntu/bot_guard.log';
    await uploadFile(ip, privateKey, botGuardScript, botGuardPath, username);

    // 4. Install cron job
    const cronCmd = `crontab -l 2>/dev/null | grep -v "${botGuardPath}" | { cat; echo "*/5 * * * * python3 ${botGuardPath} >> ${botGuardLogPath} 2>&1"; } | crontab -`;
    await executeCommand(ip, privateKey, cronCmd, username);

    return await restartAgent(ctx || ip, privateKey, username);
}

// Emergency pause the agent and notify owner
export async function pauseAgentEmergency(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    count: number,
    cost: number,
    username = 'ubuntu'
): Promise<boolean> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);

    // 1. Fetch client details from Supabase first
    const clientRecord = ctx 
        ? await getAgentClientByClientId(ctx.clientId) 
        : await getAgentClientByServerIp(ip);

    if (clientRecord) {
        const businessName = clientRecord.businessName || 'Your Business';
        const ownerPhone = clientRecord.ownerPhone || '';

        // 2. Send WhatsApp alert via local bridge BEFORE stopping it
        if (ownerPhone) {
            const cleanPhone = ownerPhone.replace(/[^\d]/g, '');
            if (cleanPhone) {
                const message = `SCALECRAFT ALERT for ${businessName}\n\nYour agent may be in a bot loop!\nMessages sent today: ${count}\nEstimated API cost: Rs.${cost}\n\nAgent has been paused automatically.\n\nLogin to check:\nhttps://thescalecraft.in/dashboard\n\nReply RESUME to restart or IGNORE to keep paused.`;
                const sendPayload = JSON.stringify({
                    chatId: `${cleanPhone}@s.whatsapp.net`,
                    message: message
                });

                let sendIp = ip;
                if (ctx && ctx.mode === 'shared') {
                    try {
                        const { supabaseAdmin } = await import('./supabase');
                        const { data: dbActiveClient } = await supabaseAdmin
                          .from('agent_clients')
                          .select('server_ip')
                          .neq('id', clientRecord._id)
                          .in('status', ['active', 'installed'])
                          .not('server_ip', 'is', null)
                          .limit(1)
                          .maybeSingle();
                        if (dbActiveClient && dbActiveClient.server_ip) {
                            sendIp = dbActiveClient.server_ip;
                        }
                    } catch {}
                }

                // Escape payload single quotes safely
                const curlCmd = `curl -s -X POST -H "Content-Type: application/json" -d '${sendPayload.replace(/'/g, "'\\''")}' http://${ctx && ctx.mode === 'shared' ? sendIp : '127.0.0.1'}:3009/send || true`;
                await executeCommand(sendIp, privateKey, curlCmd, username);
            }
        }

        // 3. Update Supabase status to "paused_emergency"
        await updateAgentClientStatus(clientRecord._id, 'paused_emergency');
    }

    // 4. Stop gateway service
    const serviceName = ctx ? ctx.serviceName : 'hermes-gateway';
    const stopCmd = ctx && ctx.profile
        ? hermesCmd(`systemctl --user stop ${serviceName} --no-block || hermes -p ${ctx.profile} gateway stop || true`)
        : hermesCmd(`systemctl --user stop ${serviceName} --no-block || hermes gateway stop || true`);
    await executeCommand(ip, privateKey, stopCmd, username);

    return true;
}


// Fetch all leads by running a local Python extractor on target VPS
export async function getLeads(
    clientOrCtxOrIp: AgentClient | HermesContext | string,
    _privateKey: string,
    username = 'ubuntu'
): Promise<any[]> {
    let ctx: HermesContext | null = null;
    let ip = '';
    if (typeof clientOrCtxOrIp === 'string') {
        ip = clientOrCtxOrIp;
    } else if (clientOrCtxOrIp && 'profileRoot' in clientOrCtxOrIp) {
        ctx = clientOrCtxOrIp;
        ip = ctx.ip;
    } else if (clientOrCtxOrIp) {
        ctx = resolveHermesContext(clientOrCtxOrIp as AgentClient);
        ip = ctx.ip;
    }

    const privateKey = getPrivateKeyForIp(ip);

    const profile = ctx ? ctx.profile : null;
    const homeDir = username === 'root' ? '/root' : `/home/${username}`;
    const profileRoot = ctx ? ctx.profileRoot : `${homeDir}/.hermes`;
    const sessionsFile = `${profileRoot}/sessions/sessions.json`;
    const leadMemoryFile = `${profileRoot}/lead_memory.json`;
    const stateDbPath = `${profileRoot}/state.db`;
    const sessionsDir = `${profileRoot}/sessions`;

    const getLeadsPython = `
import json, os, re
sessions_file = os.path.expanduser('${sessionsFile}')
memory_file = os.path.expanduser('${leadMemoryFile}')

leads = []
if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
    except Exception:
        sessions = {}
    
    memories = {}
    if os.path.exists(memory_file):
        try:
            with open(memory_file) as f:
                memories = json.load(f)
        except Exception:
            pass

    for key, val in sessions.items():
        phone = key.split(':')[-1]
        sid = val.get('session_id') if isinstance(val, dict) else val
        jsonl_path = os.path.expanduser(f'${sessionsDir}/{sid}.jsonl')
        
        messages = []
        last_msg = ""
        last_time = ""
        first_time = ""
        
        # Try SQLite state.db first
        db_path = os.path.expanduser('${stateDbPath}')
        if os.path.exists(db_path):
            try:
                import sqlite3, datetime
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY id ASC",
                    (sid,)
                )
                for m_role, m_content, m_timestamp in cursor.fetchall():
                    if m_role in ['session_meta', 'tool', 'system']:
                        continue
                    is_bot = m_role in ['assistant', 'agent']
                    
                    ts_str = ""
                    if isinstance(m_timestamp, (int, float)):
                        try:
                            # Use UTC for consistency
                            ts_str = datetime.datetime.fromtimestamp(m_timestamp, datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
                        except:
                            ts_str = str(m_timestamp)
                    else:
                        ts_str = str(m_timestamp or '')
                        
                    messages.append({
                        "role": "assistant" if is_bot else "user",
                        "content": m_content or '',
                        "timestamp": ts_str
                    })
                conn.close()
            except Exception:
                messages = []

        # Fallback to jsonl files if state.db read failed or was empty
        if not messages and os.path.exists(jsonl_path):
            try:
                with open(jsonl_path, 'rb') as jf:
                    for line in jf:
                        try:
                            data = json.loads(line.decode('utf-8'))
                            role = data.get('role', '')
                            sender = data.get('sender', '')
                            if role in ['session_meta', 'tool', 'system']:
                                continue
                            is_bot = role in ['assistant', 'agent'] or data.get('isBot', False) or 'agent' in sender
                            
                            text = data.get('content') or data.get('message', {}).get('text') or data.get('text')
                            if isinstance(text, list):
                                text_parts = []
                                for part in text:
                                    if isinstance(part, dict):
                                        text_parts.append(part.get('text') or part.get('content') or '')
                                    elif isinstance(part, str):
                                        text_parts.append(part)
                                text = " ".join(filter(None, text_parts))
                            elif isinstance(text, dict):
                                text = text.get('text') or text.get('content') or ''
                            elif not isinstance(text, str):
                                text = str(text) if text is not None else ''
                                
                            if not text and 'message' in data and isinstance(data['message'], str):
                                text = data['message']
                                
                            messages.append({
                                "role": "assistant" if is_bot else "user",
                                "content": text or '',
                                "timestamp": data.get('timestamp', '')
                            })
                        except Exception:
                            pass
            except Exception:
                pass
                
        if messages:
            last_msg = messages[-1]['content']
            last_time = messages[-1]['timestamp']
            first_time = messages[0]['timestamp']
            
        # Parse fields
        name = ""
        if isinstance(val, dict):
            name = val.get('display_name') or (val.get('origin', {}).get('chat_name') if isinstance(val.get('origin'), dict) else '')
        contact_phone = ""
        table_booking = False
        party_size = 0
        booking_time = ""
        special_requests = ""
        service_required = ""
        appointment_date = ""
        property_type = ""
        budget = ""
        location = ""
        product_interest = []
        price_discussed = ""
        objection = ""
        next_action = ""
        
        # Helper regexes
        name_patterns = [
            r"(?i)\\bmy name is\\s+([a-zA-Z\\s]{2,30})",
            r"(?i)\\bthis is\\s+([a-zA-Z\\s]{2,30})",
            r"(?i)\\bcalls? me\\s+([a-zA-Z\\s]{2,30})"
        ]
        
        phone_pattern = r"(\\+91|91)?[6-9]\\d{9}"
        
        party_patterns = [
            r"(?i)(\\d+)\\s*(?:people|person|pax|guest|seat|member)",
            r"(?i)(?:table for|party of)\\s*(\\d+)",
            r"(?i)family of\\s*(\\d+)"
        ]
        
        booking_keywords = ["book", "reserve", "appointment", "schedule", "slot", "table", "booking", "reservation"]
        date_time_patterns = [
            r"(?i)\\b(?:today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b",
            r"\\b\\d{1,2}(?:am|pm)\\b",
            r"\\b\\d{1,2}[:.]\\d{2}\\s*(?:am|pm)?\\b"
        ]
        
        realestate_kws = ["bhk", "apartment", "flat", "villa", "plot", "house", "rent", "sale", "buy"]
        salon_kws = ["haircut", "facial", "massage", "pedicure", "manicure", "salon", "spa", "threading", "waxing"]
        restaurant_kws = ["table", "seat", "dine", "lunch", "dinner", "food", "menu", "biriyani", "curry", "pizza", "burger"]
        
        last_agent_was_name_prompt = False
        user_messages_count = 0
        questions_count = 0
        asked_questions = False
        
        for msg in messages:
            role = msg['role']
            content = msg['content']
            
            if role == 'assistant':
                if any(p in content.lower() for p in ["your name", "good name", "who am i speaking to", "speaking with"]):
                    last_agent_was_name_prompt = True
                else:
                    last_agent_was_name_prompt = False
                    
                if any(ob in content.lower() for ob in ["expensive", "too high", "no budget", "other provider", "cannot afford"]):
                    objection = "Pricing/Budget objection"
            else:
                user_messages_count += 1
                if "?" in content:
                    questions_count += 1
                    asked_questions = True
                
                if last_agent_was_name_prompt and not name:
                    words = content.strip().split()
                    if words:
                        filler = ["my", "name", "is", "this", "speaking", "here"]
                        filtered = [w for w in words if w.lower() not in filler]
                        if filtered:
                            name = " ".join(filtered[:3])
                            
                for pat in name_patterns:
                    m = re.search(pat, content)
                    if m and not name:
                        name = m.group(1).strip()
                        break
                        
                m_phone = re.search(phone_pattern, content)
                if m_phone:
                    contact_phone = m_phone.group(0)
                    
                for pat in party_patterns:
                    m = re.search(pat, content)
                    if m:
                        try:
                            party_size = int(m.group(1))
                        except:
                            pass
                        break
                        
                if any(kw in content.lower() for kw in booking_keywords):
                    table_booking = True
                    
                for pat in date_time_patterns:
                    m = re.search(pat, content)
                    if m:
                        booking_time = content
                        appointment_date = content
                        break
                        
                if any(kw in content.lower() for kw in realestate_kws):
                    property_type = "Residential"
                    if "flat" in content.lower() or "apartment" in content.lower():
                        property_type = "Apartment"
                    elif "villa" in content.lower():
                        property_type = "Villa"
                    elif "plot" in content.lower():
                        property_type = "Plot"
                        
                    if any(loc in content.lower() for loc in ["kochi", "ernakulam", "bangalore", "mumbai"]):
                        location = "Kochi" if "kochi" in content.lower() else "Bangalore"
                        
                for kw in salon_kws:
                    if kw in content.lower():
                        service_required = kw.capitalize()
                        
                price_match = re.search(r"(?:Rs\\.?|INR|₹)\\s*(\\d+(?:\\s*(?:Lakh|Cr|k|thousand))?)", content)
                if price_match:
                    price_discussed = price_match.group(0)
                    budget = price_match.group(0)
                    
                for kw in restaurant_kws + realestate_kws + salon_kws:
                    if kw in content.lower() and kw not in product_interest:
                        product_interest.append(kw)
                        
        user_text_lower = " ".join([m['content'].lower() for m in messages if m['role'] == 'user'])
        
        def has_any_phrase(text, phrases):
            for p in phrases:
                if p in text:
                    return True
            return False
            
        is_dead = has_any_phrase(user_text_lower, [
            "not interested", "no thank you", "no thanks", "wrong number", 
            "stop", "unsubscribe", "please stop", "don't message", 
            "dont message", "not looking", "wrong person", "remove me"
        ])
        
        is_converted = has_any_phrase(user_text_lower, [
            "payment done", "payment completed", "payment successful",
            "completed onboarding", "onboarding completed", "booking confirmed",
            "table booked", "booked table", "already paid", "paid successfully",
            "successfully paid", "amount paid", "done payment"
        ])
        
        is_hot = has_any_phrase(user_text_lower, [
            "confirm", "book it", "please book", "reserve", "appointment", 
            "interested", "want to buy", "send link", "send the link", 
            "details please", "need details", "yes", "sure"
        ])
        
        asked_pricing = has_any_phrase(user_text_lower, [
            "price", "cost", "how much", "rate", "charge", "fee", "pricing", 
            "discount", "plans", "pricing plans"
        ])
        last_message_from = "unknown"
        last_customer_message_time = None
        if messages:
            last_message_from = "agent" if messages[-1]['role'] == 'assistant' else "customer"
            customer_msgs = [m for m in messages if m['role'] == 'user']
            if customer_msgs:
                last_customer_message_time = customer_msgs[-1]['timestamp']

        customer_questions = sum(m['content'].count('?') for m in messages if m['role'] == 'user')

        # Check user combined text for email
        email_match = re.search(r'[\\w\\.-]+@[\\w\\.-]+\\.\\w+', user_text_lower)
        shared_email = email_match.group(0) if email_match else None
        shared_contact = bool(contact_phone or shared_email)

        # Follow-up detection logic rules
        follow_up_score = 0
        follow_up_reasons = []

        # Rule 1 - Explicit follow-up signals
        rule1_keywords = [
            "later", "tomorrow", "next week", "will think", "will decide", "let me know", "will check",
            "planning to", "will come", "might", "maybe", "will get back", "send more info", "need time",
            "discuss with family", "will discuss", "considering", "next month", "will try", "will see"
        ]
        has_rule1 = any(kw in user_text_lower for kw in rule1_keywords)
        if has_rule1:
            follow_up_score += 3
            follow_up_reasons.append("Customer said will think about it")

        # Rule 2 - Conversation ended without resolution
        user_msgs = [m for m in messages if m['role'] == 'user']
        last_user_msg = user_msgs[-1]['content'].lower() if user_msgs else ""
        last_customer_msg_not_negative = not has_any_phrase(last_user_msg, [
            "not interested", "no thank you", "no thanks", "wrong number", "stop", "unsubscribe", "bye", "ok bye"
        ])
        
        # Calculate days since last message (in python)
        days_since_last = 999
        if last_time:
            try:
                # simple parser for last_time which is ISO string
                import datetime
                lt_clean = last_time.replace('Z', '+00:00')
                lt_dt = datetime.datetime.fromisoformat(lt_clean)
                now_dt = datetime.datetime.now(datetime.timezone.utc)
                days_since_last = (now_dt - lt_dt).days
                if days_since_last < 0:
                    days_since_last = 0
            except:
                pass

        has_rule2 = (
            last_message_from == "agent" and 
            len(messages) >= 4 and 
            last_customer_msg_not_negative and 
            days_since_last >= 2
        )
        if has_rule2:
            follow_up_score += 3
            follow_up_reasons.append("Conversation ended without response from customer")

        # Rule 3 - Price sensitivity signals
        price_keywords = ["price", "cost", "how much", "rate", "expensive", "discount", "offer", "cheaper", "budget", "affordable", "any offer"]
        mentioned_price = any(pk in user_text_lower for pk in price_keywords)
        has_rule3 = mentioned_price and not is_dead
        if has_rule3:
            follow_up_score += 3
            follow_up_reasons.append("Customer asked about pricing but did not commit")

        # Rule 4 - Partial interest
        has_rule4 = customer_questions >= 2 and not is_converted and not is_dead
        if has_rule4:
            follow_up_score += 2
            follow_up_reasons.append("Customer asked multiple questions without committing")

        # Rule 5 - Long conversation, no conversion
        has_rule5 = len(messages) >= 8 and not is_converted and not is_dead
        if has_rule5:
            follow_up_score += 2
            follow_up_reasons.append(f"Long conversation ({len(messages)} messages) with no resolution")

        # Rule 6 - Shared contact but no follow through
        has_rule6 = shared_contact and not is_converted
        if has_rule6:
            follow_up_score += 2
            follow_up_reasons.append("Customer shared contact but no booking confirmed")

        follow_up_reason = "; ".join(follow_up_reasons) if follow_up_reasons else "No follow-up reason"

        # Price sensitive detection
        price_signals = [
            "how much", "what is the price", "too expensive",
            "any discount", "cheaper", "offer", "coupon",
            "budget", "affordable", "any deal", "less price",
            "can you reduce", "any offer", "price high",
            "cost too much", "out of budget"
        ]
        price_signals_found = [sig for sig in price_signals if sig in user_text_lower]
        is_price_sensitive = (
            len(price_signals_found) > 0 and 
            len(messages) >= 4 and 
            not is_dead and 
            not is_converted
        )

        fallback_intent = "cold"
        fallback_status = "Follow-up Needed"
        
        if is_dead:
            fallback_intent = "dead"
            fallback_status = "No Follow-up"
        elif is_converted:
            fallback_intent = "hot"
            fallback_status = "Converted"
        elif follow_up_score >= 2:
            fallback_intent = "follow_up"
            fallback_status = "Follow-up Needed"
        elif is_hot:
            fallback_intent = "hot"
            fallback_status = "Follow-up Needed"
        elif asked_pricing or asked_questions:
            fallback_intent = "warm"
            fallback_status = "Follow-up Needed"
            
        if fallback_intent == "hot":
            next_action = f"Call to confirm reservation ({contact_phone or phone})"
        elif fallback_intent == "warm":
            next_action = "Send brochure or details"
        else:
            next_action = "Follow up via message"
            
        mem = memories.get(phone, {})
        name = mem.get('name', '') or name or phone
        intent = mem.get('intent', '') or fallback_intent
        status = mem.get('status', '') or fallback_status
        summary = mem.get('summary', '') or "No summary available"
        objection = mem.get('objections', '') or objection or "None"
        
        leads.append({
            "phone": phone,
            "name": name,
            "profession": mem.get('profession', 'Unknown'),
            "intent": intent,
            "summary": summary,
            "objections": objection,
            "lastMessage": last_msg,
            "lastContact": last_time,
            "firstContact": first_time,
            "messagesCount": len(messages),
            "status": status,
            "notes": mem.get('notes', ''),
            "requirements": {
                "tableBooking": table_booking,
                "partySize": party_size,
                "bookingTime": booking_time,
                "contactPhone": contact_phone or phone,
                "specialRequests": special_requests,
                "serviceRequired": service_required,
                "appointmentDate": appointment_date,
                "propertyType": property_type,
                "budget": budget,
                "location": location,
                "productInterest": product_interest,
                "priceDiscussed": price_discussed,
                "objection": objection,
                "nextAction": next_action
            },
            "conversationSummary": summary,
            "fullConversation": messages,
            "follow_up_score": follow_up_score,
            "follow_up_reason": follow_up_reason,
            "is_price_sensitive": is_price_sensitive,
            "price_signals_found": price_signals_found,
            "customer_questions": customer_questions,
            "last_message_from": last_message_from,
            "last_customer_message_time": last_customer_message_time
        })
print(json.dumps(leads))
  `;

    // Write temporary python script on VPS and run it
    const scriptPath = `/home/ubuntu/get_leads_tmp_${profile || 'legacy'}.py`;
    const uploadSuccess = await uploadFile(ip, privateKey, getLeadsPython, scriptPath, username);
    if (!uploadSuccess) return [];

    const res = await executeCommand(ip, privateKey, `python3 ${scriptPath}`, username);
    // Clean up
    await executeCommand(ip, privateKey, `rm ${scriptPath}`, username);

    try {
        return JSON.parse(res.stdout);
    } catch {
        return [];
    }
}

// Send concurrent-batched WhatsApp Cloud API messages (non-blocking, direct Graph API integration).
// Uses Promise.all in chunks of BATCH_SIZE for high-throughput sends, with session-aware
// 24h window enforcement, periodic DB log flushes, and dynamic throughput rate-limiting.
export async function sendCloudApiBroadcast(
  phoneList: string[],
  message: string,
  phoneNumberId: string,
  accessToken: string,
  _delaySeconds: number,          // kept for signature compatibility; throughput controlled by maxThroughput
  templateName?: string,
  templateLanguage = 'en',
  imageUrl?: string,
  personalizedMessages?: Record<string, string>,
  auditId?: string,
  supabaseUrl?: string,
  supabaseKey?: string,
  tableName = 'broadcast_audit',
  initialSent = 0,
  initialFailed = 0,
  clientId?: string,
  maxThroughput = 80,             // messages per second; default safe for standard Meta tiers
  templateComponents?: any[],    // full Meta template components array (from live re-fetch)
  recipientNameMap?: Record<string, string>, // phone → name, dual-source: contacts + leads_cache
  templateVarMapping?: Record<string, string>, // "1","2" = body vars; "header_1" = TEXT header var
  serverIP?: string,
  sshPrivateKey?: string,
  serverUser?: string,
  hermesProfile?: string,
): Promise<void> {
  let sentCount = initialSent;
  let failedCount = initialFailed;
  const BATCH_SIZE = 15;
  const LOG_FLUSH_EVERY_N_BATCHES = 10; // flush logs every 150 recipients
  const accumulatedLogs: string[] = [];
  let batchIndex = 0;

  // Chunk phoneList into batches
  const batches: string[][] = [];
  for (let i = 0; i < phoneList.length; i += BATCH_SIZE) {
    batches.push(phoneList.slice(i, i + BATCH_SIZE));
  }

  const flushToDb = async (final = false) => {
    if (!auditId || !supabaseUrl || !supabaseKey) return;
    try {
      // Fetch current logs and append
      let existingLogs: string[] = [];
      const getRes = await fetch(
        `${supabaseUrl}/rest/v1/${tableName}?id=eq.${auditId}&select=logs`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );
      if (getRes.ok) {
        const records = await getRes.json();
        if (records?.[0]?.logs) existingLogs = records[0].logs;
      }

      const updatedLogs = [...existingLogs, ...accumulatedLogs.splice(0)]; // drain accumulator

      const payload: any = {
        sent: sentCount,
        failed: failedCount,
        ...(final ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
      };
      if (tableName !== 'broadcast_jobs') {
        payload.logs = updatedLogs;
      }

      await fetch(
        `${supabaseUrl}/rest/v1/${tableName}?id=eq.${auditId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
    } catch (err: any) {
      console.error('[CloudBroadcast] DB flush error:', err.message);
    }
  };

  let backoffMs = 30_000; // exponential backoff starting point: 30s, max 120s
  const MAX_BACKOFF_MS = 120_000;

  for (const batch of batches) {
    const batchStartTime = Date.now();
    const batchLogs: string[] = [];
    const recipientLogEntries: { client_id: string; campaign_id: string; phone: string; is_new_session: boolean; message_id?: string | null; status?: string }[] = [];
    let throttledInBatch = false;

    // 1. Fetch session info for this batch in ONE query (not N individual lookups)
    const batchPhones = batch.map(p => p.replace(/[^0-9]/g, ''));
    const sessionMap = new Map<string, string | null>(); // phone → last_customer_message_at

    if (clientId && supabaseUrl && supabaseKey) {
      try {
        const sessionRes = await fetch(
          `${supabaseUrl}/rest/v1/leads_cache?client_id=eq.${clientId}&phone=in.(${batchPhones.join(',')})&select=phone,last_customer_message_at`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            }
          }
        );
        if (sessionRes.ok) {
          const records: { phone: string; last_customer_message_at: string | null }[] = await sessionRes.json();
          for (const r of records) {
            sessionMap.set(r.phone, r.last_customer_message_at);
          }
        }
      } catch (err: any) {
        console.error('[CloudBroadcast] Session lookup error:', err.message);
      }
    }

    // 2. Send batch concurrently
    await Promise.all(batch.map(async (phone) => {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const personalizedMsg = personalizedMessages?.[phone] || message;

      // 2a. Session / template requirement check
      const lastCustomerMsgAt = sessionMap.get(cleanPhone) ?? null;
      const isWithin24h = lastCustomerMsgAt
        ? Date.now() - new Date(lastCustomerMsgAt).getTime() < 24 * 60 * 60 * 1000
        : false;

      if (!templateName && !isWithin24h) {
        failedCount++;
        const reason = '[Skipped] +' + cleanPhone + ' - Outside 24h session window; templateName required for new conversations';
        batchLogs.push(reason);
        console.log('[CloudBroadcast] ' + cleanPhone + ': skipped - no template and outside 24h window');
        return;
      }

      // 2b. Build Meta message body
      let body: Record<string, unknown>;
      let loggedMessageContent = personalizedMsg;
      if (templateName) {
        // Resolve a variable for a specific component scope.
        // scope='header' → looks up templateVarMapping["header_N"]
        // scope='body'   → looks up templateVarMapping["N"]
        // Falls back to recipientNameMap (phone → name) or phone itself — never blank.
        const resolveVariable = (varIndex: number, scope: 'body' | 'header'): string => {
          const key = scope === 'header' ? `header_${varIndex}` : String(varIndex);
          const mapping = templateVarMapping?.[key];
          if (!mapping)                      return recipientNameMap?.[cleanPhone] || cleanPhone;
          if (mapping === 'name')            return recipientNameMap?.[cleanPhone] || cleanPhone;
          if (mapping === 'phone')           return cleanPhone;
          if (mapping.startsWith('custom:')) return mapping.slice(7) || cleanPhone;
          return recipientNameMap?.[cleanPhone] || cleanPhone;
        };

        const components: Record<string, unknown>[] = [];

        if (templateComponents) {
          for (const comp of templateComponents) {
            // HEADER — IMAGE
            if (comp.type === 'HEADER' && comp.format === 'IMAGE' && imageUrl) {
              components.push({
                type: 'header',
                parameters: [{ type: 'image', image: { link: imageUrl } }],
              });
            }

            // HEADER — TEXT with variable(s)
            if (comp.type === 'HEADER' && comp.format === 'TEXT' && comp.text) {
              const varMatches: string[] = comp.text.match(/\{\{\d+\}\}/g) || [];
              if (varMatches.length > 0) {
                const indices = varMatches.map((m: string) => parseInt(m.replace(/\D/g, ''), 10));
                components.push({
                  type: 'header',
                  parameters: indices.map((n: number) => ({
                    type: 'text',
                    text: resolveVariable(n, 'header'),
                  })),
                });
              }
            }

            // BODY — with variable(s)
            if (comp.type === 'BODY' && comp.text) {
              const varMatches: string[] = comp.text.match(/\{\{\d+\}\}/g) || [];
              if (varMatches.length > 0) {
                const indices = varMatches.map((m: string) => parseInt(m.replace(/\D/g, ''), 10));
                components.push({
                  type: 'body',
                  parameters: indices.map((n: number) => ({
                    type: 'text',
                    text: resolveVariable(n, 'body'),
                  })),
                });
              }
            }
            // BUTTONS with static URLs or quick-replies need no parameters — skip
          }

          // Build resolved logged message content for the CRM thread
          const bodyComp = templateComponents.find((c: any) => c.type === 'BODY');
          if (bodyComp && bodyComp.text) {
            loggedMessageContent = bodyComp.text.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => {
              return resolveVariable(parseInt(n, 10), 'body');
            });
          }
        } else {
          // No templateComponents provided: fallback to flat personalised body text
          // (handles legacy callers and Baileys path)
          components.push({
            type: 'body',
            parameters: [{ type: 'text', text: personalizedMsg }],
          });
        }

        body = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLanguage },
            ...(components.length > 0 ? { components } : {}),
          },
        };
      } else if (imageUrl) {
        body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'image',
          image: { link: imageUrl, caption: personalizedMsg },
        };
      } else {
        body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { body: personalizedMsg },
        };
      }

      // 2c. Send to Meta Graph API
      try {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );
        const result = await res.json();
        const isThrottled = res.status === 429 || result?.error?.code === 130429 || result?.error?.code === 80007;
        const success = res.ok && !result.error;

        if (isThrottled) {
          // Signal the outer batch loop to back off — increment failedCount and mark for retry-skip
          failedCount++;
          batchLogs.push('[Throttled] +' + cleanPhone + ' - Meta rate limit hit (code ' + (result?.error?.code || 429) + '); backing off');
          console.warn('[CloudBroadcast] Meta throttled ' + cleanPhone + ' — signalling batch backoff');
          // Use a shared ref via closure to signal backoff needed
          throttledInBatch = true;
        } else if (success) {
          sentCount++;
          batchLogs.push('[Sent] +' + cleanPhone + ' - Success');
          if (clientId && auditId) {
            const messageId = result.messages?.[0]?.id || null;
            const e164Phone = cleanPhone;
            recipientLogEntries.push({
              client_id: clientId,
              campaign_id: auditId,
              phone: e164Phone,
              is_new_session: !isWithin24h,
              message_id: messageId,
              status: 'sent',
            });
          }

          // Asynchronously write to Inbox/conversation history (VPS) and update leads_cache (Supabase)
          if (serverIP && sshPrivateKey) {
            const profile = hermesProfile || '';
            const profilePrefix = profile ? `profiles/${profile}/` : '';
            
            // Format message content with media prefix if there is a header image
            let finalLoggedContent = loggedMessageContent.trim();
            if (imageUrl) {
              finalLoggedContent = `[media:image:${imageUrl}]${finalLoggedContent}`;
            }
            
            // Append footer and buttons markers if templateComponents is provided
            if (templateComponents) {
              const footerComp = templateComponents.find((c: any) => c.type === 'FOOTER');
              if (footerComp && footerComp.text) {
                finalLoggedContent += `\n[footer:${footerComp.text.trim()}]`;
              }
              const buttonsComp = templateComponents.find((c: any) => c.type === 'BUTTONS');
              if (buttonsComp && buttonsComp.buttons) {
                buttonsComp.buttons.forEach((btn: any) => {
                  if (btn.text) {
                    finalLoggedContent += `\n[button:${btn.text.trim()}]`;
                  }
                });
              }
            }
            const base64Msg = Buffer.from(finalLoggedContent).toString('base64');
            
            const logMsgScript = `python3 -c '
import sys, sqlite3, json, os, time, datetime, base64, uuid
phone = sys.argv[1]
msg = base64.b64decode(sys.argv[2]).decode("utf-8")
sessions_file = os.path.expanduser("~/.hermes/${profilePrefix}sessions/sessions.json")

profile = "${profile}"
if profile:
    db_path = f"/home/ubuntu/.hermes/profiles/{profile}/state.db"
else:
    db_path = "/home/ubuntu/.hermes/state.db"

phone_clean = phone.replace("+", "").split(":")[0].split("@", 1)[0]
sid = None
sessions = {}

if os.path.exists(sessions_file):
    try:
        with open(sessions_file) as f:
            sessions = json.load(f)
        def find_session_id(sessions, target_phone):
            target_clean = target_phone.replace("+", "").split(":")[0].split("@", 1)[0]
            for key, val in sessions.items():
                key_lower = key.lower()
                if "whatsapp" not in key_lower and "whatsapp_cloud" not in key_lower:
                    continue
                k_phone = key.split(":")[-1] if ":" in key else ""
                if k_phone == target_clean:
                    sid_val = val.get("session_id") if isinstance(val, dict) else val
                    if sid_val:
                        return sid_val
            return None
        sid = find_session_id(sessions, phone)
    except:
        pass

if not sid and os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.id, s.session_key
            FROM sessions s  
            WHERE (s.session_key LIKE ? OR s.session_key LIKE ?)
            ORDER BY s.id DESC
            LIMIT 1
        """, (
            f"%whatsapp_cloud%dm%{phone_clean}%",
            f"%whatsapp%dm%{phone_clean}%"
        ))
        row = cursor.fetchone()
        if row:
            sid = row[0]
        conn.close()
    except Exception as e:
        pass

# If no session ID found, create a new session record dynamically
if not sid:
    try:
        hex_part = uuid.uuid4().hex[:8]
        sid = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S_") + hex_part
        now_ts = time.time()
        iso_ts = datetime.datetime.fromtimestamp(now_ts, datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        
        session_key = f"agent:main:whatsapp_cloud:dm:{phone_clean}"
        sessions[session_key] = {
            "session_key": session_key,
            "session_id": sid,
            "created_at": iso_ts,
            "updated_at": iso_ts,
            "display_name": phone,
            "platform": "whatsapp_cloud",
            "chat_type": "dm",
            "origin": {
                "platform": "whatsapp_cloud",
                "chat_id": f"{phone}@s.whatsapp.net",
                "chat_name": phone,
                "chat_type": "dm",
                "user_id": f"{phone}@s.whatsapp.net",
                "user_name": phone
            }
        }
        
        # Ensure sessions directory exists
        session_dir = os.path.dirname(sessions_file)
        if session_dir and not os.path.exists(session_dir):
            os.makedirs(session_dir, exist_ok=True)
            
        with open(sessions_file, "w", encoding="utf-8") as f:
            json.dump(sessions, f, indent=2)
    except Exception as e:
        print("CREATE_SESSION_JSON_ERR:", e)
        
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            # Try inserting with session_key first
            try:
                conn.execute(
                    "INSERT INTO sessions (id, session_key, source, started_at, message_count, archived) VALUES (?, ?, ?, ?, ?, ?)",
                    (sid, session_key, "whatsapp_cloud", now_ts, 1, 0)
                )
            except Exception:
                try:
                    conn.execute(
                        "INSERT INTO sessions (id, source, started_at, message_count, archived) VALUES (?, ?, ?, ?, ?)",
                        (sid, "whatsapp_cloud", now_ts, 1, 0)
                    )
                except Exception as e2:
                    print("CREATE_SESSION_DB_ERR:", e2)
            conn.commit()
            conn.close()
        except Exception as e:
            print("CREATE_SESSION_CONN_ERR:", e)

# Now log the message to state.db database
if sid and os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        try:
            conn.execute("INSERT INTO messages (session_id, role, content, timestamp, observed, active) VALUES (?, ?, ?, ?, ?, ?)", (sid, "assistant", msg, time.time(), 1, 1))
        except Exception:
            try:
                conn.execute("INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)", (sid, "assistant", msg, time.time()))
            except Exception as e2:
                print("DB_INSERT_ERR:", e2)
        conn.commit()
        conn.close()
    except Exception as e:
        print("DB_LOG_ERR:", e)
' "${cleanPhone}" "${base64Msg}"`;
            console.log('[Broadcast->Inbox] Writing message for', cleanPhone, 'to VPS server', serverIP, 'with profile', profile);
            executeCommand(serverIP, sshPrivateKey, logMsgScript, serverUser || 'ubuntu')
              .then(res => {
                if (res.exitCode !== 0) {
                  console.error('[Broadcast->Inbox] VPS log message script failed for', cleanPhone, 'Exit code:', res.exitCode);
                  console.error('[Broadcast->Inbox] STDERR:', res.stderr);
                  console.error('[Broadcast->Inbox] STDOUT:', res.stdout);
                } else {
                  console.log('[Broadcast->Inbox] VPS log message script succeeded for', cleanPhone);
                  console.log('[Broadcast->Inbox] STDOUT:', res.stdout);
                }
              })
              .catch(err => console.error('[Broadcast->Inbox] VPS log message error for', cleanPhone, ':', err.message));
          }

          // Update leads_cache last_message_at and updated_at in Supabase
          if (clientId && supabaseUrl && supabaseKey) {
            const nowIso = new Date().toISOString();
            fetch(
              `${supabaseUrl}/rest/v1/leads_cache?client_id=eq.${clientId}&phone=eq.${cleanPhone}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                  last_message_at: nowIso,
                  updated_at: nowIso,
                }),
              }
            ).catch((err) => console.error('[CloudBroadcast] leads_cache update error:', err.message));
          }
        } else {
          failedCount++;
          batchLogs.push('[Failed] +' + cleanPhone + ' - ' + (result.error?.message || 'Meta API error'));
        }
        console.log('[CloudBroadcast] ' + cleanPhone + ': ' + (isThrottled ? 'throttled' : success ? 'sent' : 'failed') + ' - ' + (result.error?.message || 'ok'));
      } catch (err: any) {
        failedCount++;
        batchLogs.push('[Error] +' + cleanPhone + ' - ' + (err.message || 'Network exception'));
        console.error('[CloudBroadcast] ' + cleanPhone + ': exception', err.message);
      }
    }));

    // 3. Write recipient logs reliably
    if (recipientLogEntries.length > 0 && supabaseUrl && supabaseKey) {
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/broadcast_recipient_logs`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(recipientLogEntries),
          }
        );
      } catch (err: any) {
        console.error('[CloudBroadcast] Recipient log insert error:', err.message);
      }
    }

    // 4. Accumulate logs and flush periodically (every LOG_FLUSH_EVERY_N_BATCHES batches)
    accumulatedLogs.push(...batchLogs);
    batchIndex++;
    if (batchIndex % LOG_FLUSH_EVERY_N_BATCHES === 0) {
      await flushToDb();
    }

    // 5. Throttle handling + dynamic throughput rate-limiter
    if (throttledInBatch) {
      // Meta signalled we're too fast — apply exponential backoff before the next batch
      console.warn(`[CloudBroadcast] Throttle detected; pausing ${backoffMs / 1000}s before continuing`);
      await new Promise(r => setTimeout(r, backoffMs));
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    } else {
      // Normal throughput pacing: ensure we don't exceed maxThroughput msg/sec
      backoffMs = Math.max(30_000, backoffMs / 2); // gradually recover if no throttle for a while
      const elapsed = Date.now() - batchStartTime;
      const targetDuration = Math.ceil((batch.length / maxThroughput) * 1000);
      if (elapsed < targetDuration) {
        await new Promise(r => setTimeout(r, targetDuration - elapsed));
      }
    }
  }

  // Final flush: commit any remaining logs and mark campaign completed
  await flushToDb(true);
}

// Send background broadcast campaign via tmux background session
export async function sendBroadcast(
    ip: string,
    _privateKey: string,
    message: string,
    phoneList: string[],
    delaySeconds: number,
    imageUrl?: string,
    username = 'ubuntu',
    useAi = false,
    aiPrompt = '',
    personalizedMessages?: Record<string, string>,
    auditId?: string,
    supabaseUrl?: string,
    supabaseServiceKey?: string
): Promise<string> {
    const privateKey = getPrivateKeyForIp(ip);
    const broadcastScript = `
import json, time, sys, requests, os, datetime

with open('/home/ubuntu/broadcast_campaign.json') as f:
    campaign = json.load(f)

message = campaign['message']
phones = campaign['phones']
delay = campaign['delay']
imageUrl = campaign.get('imageUrl')
useAi = campaign.get('useAi', False)
aiPrompt = campaign.get('aiPrompt', '')
personalized_messages = campaign.get('personalized_messages', {})
audit_id = campaign.get('auditId')
supabase_url = campaign.get('supabaseUrl')
supabase_key = campaign.get('supabaseServiceKey')

total = len(phones)
sent = 0
failed = 0

def update_supabase(status_val="running", finished=False):
    if not supabase_url or not supabase_key or not audit_id:
        return
    try:
        url = f"{supabase_url}/rest/v1/broadcast_audit?id=eq.{audit_id}"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "sent": sent,
            "failed": failed,
            "status": status_val
        }
        if finished:
            payload["completed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        requests.patch(url, json=payload, headers=headers, timeout=10)
    except Exception as e:
        with open('/home/ubuntu/broadcast_details.log', 'a') as df:
            df.write(f"SUPABASE_UPDATE_ERROR | {str(e)}\\n")

def log_sent_message(phone, text, name=""):
    try:
        import sqlite3, os, time, json, datetime, fcntl
        sessions_file = os.path.expanduser("~/.hermes/sessions/sessions.json")
        db_path = os.path.expanduser("~/.hermes/state.db")
        sessions_dir = os.path.expanduser("~/.hermes/sessions")
        
        if not os.path.exists(sessions_dir):
            os.makedirs(sessions_dir, exist_ok=True)
            
        sid = None
        sessions = {}
        if os.path.exists(sessions_file):
            try:
                with open(sessions_file, 'r', encoding='utf-8') as f:
                    sessions = json.load(f)
            except Exception:
                pass
                
        key = f"agent:main:whatsapp:dm:{phone}"
        sid = None
        def find_session_id(sessions, target_phone):
            target_clean = target_phone.replace("+", "").split(":")[0].split("@", 1)[0]
            for k, val in sessions.items():
                if "whatsapp" not in k.lower():
                    continue
                k_phone = k.split(":")[-1] if ":" in k else ""
                if k_phone == target_clean:
                    sid_val = val.get("session_id") if isinstance(val, dict) else val
                    if sid_val:
                        return sid_val, k
            session_dir = os.path.expanduser("~/.hermes/whatsapp/session")
            mapped_clean = None
            for suffix in ("", "_reverse"):
                mapping_path = os.path.join(session_dir, f"lid-mapping-{target_clean}{suffix}.json")
                if os.path.exists(mapping_path):
                    try:
                        with open(mapping_path) as mf:
                            mapped = json.load(mf)
                            mapped_clean = mapped.replace("+", "").split(":")[0].split("@", 1)[0]
                            break
                    except:
                        pass
            if mapped_clean:
                for k, val in sessions.items():
                    if "whatsapp" not in k.lower():
                        continue
                    k_phone = k.split(":")[-1] if ":" in k else ""
                    if k_phone == mapped_clean:
                        sid_val = val.get("session_id") if isinstance(val, dict) else val
                        if sid_val:
                            return sid_val, k
            for k, val in sessions.items():
                if "whatsapp" not in k.lower():
                    continue
                if isinstance(val, dict) and "origin" in val:
                    origin = val["origin"]
                    chat_id = origin.get("chat_id", "")
                    user_id = origin.get("user_id", "")
                    chat_clean = chat_id.replace("+", "").split(":")[0].split("@", 1)[0]
                    user_clean = user_id.replace("+", "").split(":")[0].split("@", 1)[0]
                    if target_clean in [chat_clean, user_clean] or (mapped_clean and mapped_clean in [chat_clean, user_clean]):
                        sid_val = val.get("session_id")
                        if sid_val:
                            return sid_val, k
            return None, None

        sid, resolved_key = find_session_id(sessions, phone)
        if resolved_key:
            key = resolved_key
        
        now_ts = time.time()
        iso_ts = datetime.datetime.fromtimestamp(now_ts, datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        
        if not sid:
            import uuid
            hex_part = uuid.uuid4().hex[:8]
            sid = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S_') + hex_part
            sessions[key] = {
                "session_key": key,
                "session_id": sid,
                "created_at": iso_ts,
                "updated_at": iso_ts,
                "display_name": name or phone,
                "platform": "whatsapp",
                "chat_type": "dm",
                "origin": {
                    "platform": "whatsapp",
                    "chat_id": f"{phone}@s.whatsapp.net",
                    "chat_name": name or phone,
                    "chat_type": "dm",
                    "user_id": f"{phone}@s.whatsapp.net",
                    "user_name": name or phone
                }
            }
            try:
                with open(sessions_file, 'w', encoding='utf-8') as f:
                    json.dump(sessions, f, indent=2)
            except Exception:
                pass
                
            if os.path.exists(db_path):
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO sessions (id, source, started_at, message_count, archived) VALUES (?, ?, ?, ?, ?)",
                        (sid, "whatsapp", now_ts, 1, 0)
                    )
                    conn.commit()
                    conn.close()
                except Exception:
                    pass
        else:
            if isinstance(sessions[key], dict):
                sessions[key]["updated_at"] = iso_ts
                try:
                    with open(sessions_file, 'w', encoding='utf-8') as f:
                        json.dump(sessions, f, indent=2)
                except Exception:
                    pass
            if os.path.exists(db_path):
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE sessions SET message_count = message_count + 1 WHERE id = ?",
                        (sid,)
                    )
                    conn.commit()
                    conn.close()
                except Exception:
                    pass

        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO messages (session_id, role, content, timestamp, observed, active) VALUES (?, ?, ?, ?, ?, ?)",
                        (sid, "assistant", text, now_ts, 1, 1)
                    )
                except Exception:
                    try:
                        cursor.execute(
                            "INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
                            (sid, "assistant", text, now_ts)
                        )
                    except Exception as e2:
                        print("DB_INSERT_ERR:", e2)
                conn.commit()
                conn.close()
            except Exception:
                pass
                    
        jsonl_path = os.path.join(sessions_dir, f"{sid}.jsonl")
        msg_data = {
            "role": "assistant",
            "content": text,
            "timestamp": iso_ts
        }
        with open(jsonl_path, 'a', encoding='utf-8') as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            f.write(json.dumps(msg_data) + '\\n')
            fcntl.flock(f, fcntl.LOCK_UN)
    except Exception:
        pass

def update_lead_memory(phone, name, details_dict):
    try:
        import json, os, time
        lead_memory_file = os.path.expanduser('~/.hermes/lead_memory.json')
        memories = {}
        if os.path.exists(lead_memory_file):
            try:
                with open(lead_memory_file, 'r', encoding='utf-8') as mf:
                    memories = json.load(mf)
            except Exception:
                pass
        
        lead_mem = memories.get(phone, {})
        for k, v in details_dict.items():
            lead_mem[k] = v
            
        lead_mem["lastProcessedAt"] = time.time()
        memories[phone] = lead_mem
        
        try:
            with open(lead_memory_file, 'w', encoding='utf-8') as mf:
                json.dump(memories, mf, indent=2)
        except Exception:
            pass
    except Exception:
        pass

with open('/home/ubuntu/broadcast_log.txt', 'w') as f:
    f.write(json.dumps({"sent": sent, "failed": failed, "total": total, "running": True}) + '\\n')

update_supabase("running")

local_image_path = None
if imageUrl:
    import tempfile
    try:
        r = requests.get(imageUrl, timeout=30)
        if r.status_code == 200:
            fd, temp_path = tempfile.mkstemp(suffix=".jpg")
            os.close(fd)
            with open(temp_path, 'wb') as img_f:
                img_f.write(r.content)
            local_image_path = temp_path
    except Exception as e:
        with open('/home/ubuntu/broadcast_details.log', 'a') as df:
            df.write(f"WARNING | Failed to download campaign image: {str(e)}\\n")

memories = {}
try:
    if os.path.exists('/home/ubuntu/.hermes/lead_memory.json'):
        with open('/home/ubuntu/.hermes/lead_memory.json') as mf:
            memories = json.load(mf)
except Exception:
    pass

sessions = {}
try:
    if os.path.exists('/home/ubuntu/.hermes/sessions/sessions.json'):
        with open('/home/ubuntu/.hermes/sessions/sessions.json') as sf:
            sessions = json.load(sf)
except Exception:
    pass

api_key = ""
try:
    if os.path.exists('/home/ubuntu/.hermes/.env'):
        with open('/home/ubuntu/.hermes/.env') as env_f:
            for line in env_f:
                if 'GEMINI_API_KEY' in line:
                    api_key = line.split('=')[-1].strip().strip('"').strip("'")
                elif 'GOOGLE_API_KEY' in line and not api_key:
                    api_key = line.split('=')[-1].strip().strip('"').strip("'")
except Exception:
    pass

try:
    for phone in phones:
        if os.path.exists('/home/ubuntu/broadcast_abort'):
            break
            
        # Check if campaign is paused
        while os.path.exists('/home/ubuntu/broadcast_pause'):
            if os.path.exists('/home/ubuntu/broadcast_abort'):
                break
            time.sleep(5)
            
        lead_name = memories.get(phone, {}).get('name', '')
        lead_objections = memories.get(phone, {}).get('objections', 'None')
        lead_summary = memories.get(phone, {}).get('summary', 'No summary available')
        
        personalized_msg = personalized_messages.get(phone, message)
        
        if useAi and api_key and not personalized_messages.get(phone):
            session_id = None
            for k, val in sessions.items():
                if "whatsapp" not in k.lower():
                    continue
                k_phone = k.split(":")[-1] if ":" in k else ""
                if k_phone == phone:
                    session_id = val.get("session_id") if isinstance(val, dict) else val
                    break
            if not session_id:
                session_dir = os.path.expanduser("~/.hermes/whatsapp/session")
                mapped_clean = None
                for suffix in ("", "_reverse"):
                    mapping_path = os.path.join(session_dir, f"lid-mapping-{phone}{suffix}.json")
                    if os.path.exists(mapping_path):
                        try:
                            with open(mapping_path) as mf:
                                mapped = json.load(mf)
                                mapped_clean = mapped.replace("+", "").split(":")[0].split("@", 1)[0]
                                break
                        except:
                            pass
                if mapped_clean:
                    for k, val in sessions.items():
                        if "whatsapp" not in k.lower():
                            continue
                        k_phone = k.split(":")[-1] if ":" in k else ""
                        if k_phone == mapped_clean:
                            session_id = val.get("session_id") if isinstance(val, dict) else val
                            break
            chat_history = []
            if session_id:
                jsonl_path = f"/home/ubuntu/.hermes/sessions/{session_id}.jsonl"
                if os.path.exists(jsonl_path):
                    try:
                        with open(jsonl_path, 'r', encoding='utf-8') as jf:
                            for line in jf:
                                data = json.loads(line.strip())
                                role = data.get('role', '')
                                if role in ['session_meta', 'tool', 'system']:
                                    continue
                                is_bot = role in ['assistant', 'agent'] or data.get('isBot', False) or 'agent' in data.get('sender', '')
                                sender = "agent" if is_bot else "customer"
                                text = data.get('content') or data.get('message', {}).get('text') or data.get('text')
                                if isinstance(text, list):
                                    text_parts = []
                                    for part in text:
                                        if isinstance(part, dict):
                                            text_parts.append(part.get('text') or part.get('content') or '')
                                        elif isinstance(part, str):
                                            text_parts.append(part)
                                    text = " ".join(filter(None, text_parts))
                                elif isinstance(text, dict):
                                    text = text.get('text') or text.get('content') or ''
                                elif not isinstance(text, str):
                                    text = str(text) if text is not None else ''
                                    
                                if not text and 'message' in data and isinstance(data['message'], str):
                                    text = data['message']
                                if text:
                                    chat_history.append(f"{sender}: {text}")
                    except Exception:
                        pass
            
            # Prune conversation history to keep context under 2500 characters
            combined_len = 0
            pruned_history = []
            for h_msg in reversed(chat_history):
                if combined_len + len(h_msg) + 1 > 2500:
                    break
                combined_len += len(h_msg) + 1
                pruned_history.insert(0, h_msg)
            history_str = "\\n".join(pruned_history)
            system_instruction = (
                f"You are writing a personalized follow-up message to the customer on WhatsApp.\\n"
                f"Customer Name: {lead_name or 'there'}\\n"
                f"Customer summary: {lead_summary}\\n"
                f"Customer objections: {lead_objections}\\n"
                f"Follow-up Goal/Offer instructions: {aiPrompt}\\n\\n"
                f"Recent chat history:\\n{history_str}\\n\\n"
                f"Write a warm, friendly follow-up message to this customer. Keep it short and natural for WhatsApp "
                f"(max 2-3 sentences). Address their objections or interests naturally. Never mention that you are a script or bot. "
                f"Do not prefix the output with anything (just return the raw message)."
            )
            
            try:
                headers = {
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key
                }
                url_v1 = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"
                url_beta = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
                payload = {
                    "contents": [{
                        "parts": [{"text": system_instruction}]
                    }],
                    "generationConfig": {
                        "maxOutputTokens": 150,
                        "temperature": 0.7
                    }
                }
                r = None
                try:
                    r = requests.post(url_v1, json=payload, headers=headers, timeout=20)
                    if r.status_code != 200:
                        r = requests.post(url_beta, json=payload, headers=headers, timeout=20)
                except Exception:
                    r = requests.post(url_beta, json=payload, headers=headers, timeout=20)

                if r and r.status_code == 200:
                    res_data = r.json()
                    generated_text = res_data['candidates'][0]['content']['parts'][0]['text'].strip()
                    if generated_text:
                        if generated_text.startswith('"') and generated_text.endswith('"'):
                            generated_text = generated_text[1:-1]
                        personalized_msg = generated_text
            except Exception as e:
                with open('/home/ubuntu/broadcast_details.log', 'a') as df:
                    df.write(f"WARNING | Gemini call failed for {phone}: {str(e)}\\n")
        else:
            if lead_name:
                personalized_msg = personalized_msg.replace('{name}', lead_name)
                first_name = lead_name.split()[0]
                personalized_msg = personalized_msg.replace('{first_name}', first_name)
            else:
                personalized_msg = personalized_msg.replace('{name}', 'there').replace('{first_name}', 'there')

        if not personalized_msg:
            personalized_msg = aiPrompt if aiPrompt else "Hi there!"

        chat_id = f"{phone}@s.whatsapp.net"
        if local_image_path and os.path.exists(local_image_path):
            url = "http://127.0.0.1:3009/send-media"
            payload = {
                "chatId": chat_id,
                "filePath": local_image_path,
                "mediaType": "image"
            }
            if personalized_msg:
                payload["caption"] = personalized_msg
        else:
            url = "http://127.0.0.1:3009/send"
            payload = {"chatId": chat_id, "message": personalized_msg}
            
        headers = {"Content-Type": "application/json"}
        
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=15)
            if r.status_code == 200:
                sent += 1
                log_line = f"SUCCESS | {phone} | {time.strftime('%Y-%m-%d %H:%M:%S')}"
                log_sent_message(phone, personalized_msg, lead_name)
                update_lead_memory(phone, lead_name, {
                    "name": lead_name or phone,
                    "summary": f"Sent broadcast: {personalized_msg[:60]}...",
                    "status": "Follow-up Needed"
                })
            else:
                failed += 1
                try:
                    err_msg = r.json().get('error', f"Status {r.status_code}")
                except:
                    err_msg = f"Status {r.status_code}"
                log_line = f"FAILED | {phone} | {err_msg} | {time.strftime('%Y-%m-%d %H:%M:%S')}"
        except Exception as e:
            failed += 1
            log_line = f"FAILED | {phone} | {str(e)} | {time.strftime('%Y-%m-%d %H:%M:%S')}"
            
        with open('/home/ubuntu/broadcast_details.log', 'a') as df:
            df.write(log_line + '\\n')
            
        with open('/home/ubuntu/broadcast_log.txt', 'w') as f:
            f.write(json.dumps({"sent": sent, "failed": failed, "total": total, "running": True}) + '\\n')
            
        update_supabase("running")
        time.sleep(delay)
finally:
    if local_image_path and os.path.exists(local_image_path):
        try:
            os.remove(local_image_path)
        except:
            pass

status_final = "completed"
if os.path.exists('/home/ubuntu/broadcast_abort'):
    status_final = "stopped"

with open('/home/ubuntu/broadcast_log.txt', 'w') as f:
    f.write(json.dumps({"sent": sent, "failed": failed, "total": total, "running": False}) + '\\n')

update_supabase(status_final, finished=True)
`;

    // Upload campaign file
    const campaignData = JSON.stringify({
        message,
        phones: phoneList,
        delay: delaySeconds,
        imageUrl,
        useAi,
        aiPrompt,
        personalized_messages: personalizedMessages || {},
        auditId,
        supabaseUrl,
        supabaseServiceKey
    });
    await uploadFile(ip, privateKey, campaignData, '/home/ubuntu/broadcast_campaign.json', username);

    // Upload runner script
    await uploadFile(ip, privateKey, broadcastScript, '/home/ubuntu/broadcast.py', username);

    // Clean up any abort and pause flags
    await executeCommand(ip, privateKey, 'rm -f /home/ubuntu/broadcast_abort /home/ubuntu/broadcast_pause', username);
    await executeCommand(ip, privateKey, 'rm -f /home/ubuntu/broadcast_details.log', username);

    // Launch in tmux session
    const tmuxSession = 'broadcast_campaign';
    await executeCommand(
        ip,
        privateKey,
        `tmux kill-session -t ${tmuxSession} 2>/dev/null; tmux new-session -d -s ${tmuxSession} "python3 /home/ubuntu/broadcast.py"`,
        username
    );

    return tmuxSession;
}

// Fetch live broadcast campaign stats
export async function getBroadcastProgress(
    ip: string,
    _privateKey: string,
    username = 'ubuntu'
): Promise<{ sent: number; failed: number; total: number; running: boolean; paused: boolean }> {
    const privateKey = getPrivateKeyForIp(ip);

    const result = await executeCommand(
        ip,
        privateKey,
        'cat /home/ubuntu/broadcast_log.txt 2>/dev/null; echo "---PAUSE_CHECK---"; [ -f /home/ubuntu/broadcast_pause ] && echo "paused" || echo "not_paused"',
        username
    );

    const parts = result.stdout.split('---PAUSE_CHECK---');
    const logContent = parts[0]?.trim();
    const pauseStatus = parts[1]?.trim();
    const paused = pauseStatus === 'paused';

    try {
        if (logContent) {
            const parsed = JSON.parse(logContent);
            return { ...parsed, paused };
        }
    } catch { }
    return { sent: 0, failed: 0, total: 0, running: false, paused: false };
}


// Send background cold outreach campaign via tmux
export async function sendColdOutreach(
    ip: string,
    _privateKey: string,
    leads: any[],
    templates: Record<string, string>,
    singleTemplate: string,
    isSingleTemplate: boolean,
    delaySeconds: number,
    timeWindow: boolean,
    jobId: string,
    supabaseUrl: string,
    supabaseServiceKey: string,
    dailyLimit: number,
    imageUrl: string,
    username = 'ubuntu',
    timezone = 'UTC',
    initialSent = 0,
    initialFailed = 0
): Promise<string> {
    const privateKey = getPrivateKeyForIp(ip);

    const outreachScript = `
import json, time, sys, requests, os, datetime

with open('/home/ubuntu/cold_outreach_campaign.json') as f:
    campaign = json.load(f)

leads = campaign['leads']
templates = campaign.get('templates', {})
single_template = campaign.get('singleTemplate', '')
is_single = campaign.get('isSingleTemplate', False)
delay = campaign.get('delay', 150)
time_window = campaign.get('timeWindow', True)
job_id = campaign.get('jobId')
supabase_url = campaign.get('supabaseUrl')
supabase_key = campaign.get('supabaseServiceKey')
daily_limit = campaign.get('dailyLimit', 15)
imageUrl = campaign.get('imageUrl')

total = len(leads)
sent = campaign.get('initialSent', 0)
failed = campaign.get('initialFailed', 0)
sends_today = 0

def update_supabase(status_val="running", finished=False):
    if not supabase_url or not supabase_key or not job_id:
        return
    try:
        url = f"{supabase_url}/rest/v1/broadcast_jobs?id=eq.{job_id}"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        payload = {
            "sent": sent,
            "failed": failed,
            "status": status_val
        }
        if finished:
            payload["completed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        requests.patch(url, json=payload, headers=headers, timeout=10)
    except Exception as e:
        with open('/home/ubuntu/cold_outreach_details.log', 'a') as df:
            df.write(f"SUPABASE_UPDATE_ERROR | {str(e)}\\n")

def log_sent_message(phone, text, name=""):
    try:
        import sqlite3, os, time, json, datetime, fcntl
        sessions_file = os.path.expanduser("~/.hermes/sessions/sessions.json")
        db_path = os.path.expanduser("~/.hermes/state.db")
        sessions_dir = os.path.expanduser("~/.hermes/sessions")
        
        if not os.path.exists(sessions_dir):
            os.makedirs(sessions_dir, exist_ok=True)
            
        sid = None
        sessions = {}
        if os.path.exists(sessions_file):
            try:
                with open(sessions_file, 'r', encoding='utf-8') as f:
                    sessions = json.load(f)
            except Exception:
                pass
                
        key = f"agent:main:whatsapp:dm:{phone}"
        sid = None
        def find_session_id(sessions, target_phone):
            target_clean = target_phone.replace("+", "").split(":")[0].split("@", 1)[0]
            for k, val in sessions.items():
                if "whatsapp" not in k.lower():
                    continue
                k_phone = k.split(":")[-1] if ":" in k else ""
                if k_phone == target_clean:
                    sid_val = val.get("session_id") if isinstance(val, dict) else val
                    if sid_val:
                        return sid_val, k
            session_dir = os.path.expanduser("~/.hermes/whatsapp/session")
            mapped_clean = None
            for suffix in ("", "_reverse"):
                mapping_path = os.path.join(session_dir, f"lid-mapping-{target_clean}{suffix}.json")
                if os.path.exists(mapping_path):
                    try:
                        with open(mapping_path) as mf:
                            mapped = json.load(mf)
                            mapped_clean = mapped.replace("+", "").split(":")[0].split("@", 1)[0]
                            break
                    except:
                        pass
            if mapped_clean:
                for k, val in sessions.items():
                    if "whatsapp" not in k.lower():
                        continue
                    k_phone = k.split(":")[-1] if ":" in k else ""
                    if k_phone == mapped_clean:
                        sid_val = val.get("session_id") if isinstance(val, dict) else val
                        if sid_val:
                            return sid_val, k
            for k, val in sessions.items():
                if "whatsapp" not in k.lower():
                    continue
                if isinstance(val, dict) and "origin" in val:
                    origin = val["origin"]
                    chat_id = origin.get("chat_id", "")
                    user_id = origin.get("user_id", "")
                    chat_clean = chat_id.replace("+", "").split(":")[0].split("@", 1)[0]
                    user_clean = user_id.replace("+", "").split(":")[0].split("@", 1)[0]
                    if target_clean in [chat_clean, user_clean] or (mapped_clean and mapped_clean in [chat_clean, user_clean]):
                        sid_val = val.get("session_id")
                        if sid_val:
                            return sid_val, k
            return None, None

        sid, resolved_key = find_session_id(sessions, phone)
        if resolved_key:
            key = resolved_key
        
        now_ts = time.time()
        iso_ts = datetime.datetime.fromtimestamp(now_ts, datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        
        if not sid:
            import uuid
            hex_part = uuid.uuid4().hex[:8]
            sid = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S_') + hex_part
            sessions[key] = {
                "session_key": key,
                "session_id": sid,
                "created_at": iso_ts,
                "updated_at": iso_ts,
                "display_name": name or phone,
                "platform": "whatsapp",
                "chat_type": "dm",
                "origin": {
                    "platform": "whatsapp",
                    "chat_id": f"{phone}@s.whatsapp.net",
                    "chat_name": name or phone,
                    "chat_type": "dm",
                    "user_id": f"{phone}@s.whatsapp.net",
                    "user_name": name or phone
                }
            }
            try:
                with open(sessions_file, 'w', encoding='utf-8') as f:
                    json.dump(sessions, f, indent=2)
            except Exception:
                pass
                
            if os.path.exists(db_path):
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO sessions (id, source, started_at, message_count, archived) VALUES (?, ?, ?, ?, ?)",
                        (sid, "whatsapp", now_ts, 1, 0)
                    )
                    conn.commit()
                    conn.close()
                except Exception:
                    pass
        else:
            if isinstance(sessions[key], dict):
                sessions[key]["updated_at"] = iso_ts
                try:
                    with open(sessions_file, 'w', encoding='utf-8') as f:
                        json.dump(sessions, f, indent=2)
                except Exception:
                    pass
            if os.path.exists(db_path):
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE sessions SET message_count = message_count + 1 WHERE id = ?",
                        (sid,)
                    )
                    conn.commit()
                    conn.close()
                except Exception:
                    pass

        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO messages (session_id, role, content, timestamp, observed, active) VALUES (?, ?, ?, ?, ?, ?)",
                        (sid, "assistant", text, now_ts, 1, 1)
                    )
                except Exception:
                    try:
                        cursor.execute(
                            "INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
                            (sid, "assistant", text, now_ts)
                        )
                    except Exception as e2:
                        print("DB_INSERT_ERR:", e2)
                conn.commit()
                conn.close()
            except Exception:
                pass
                    
        jsonl_path = os.path.join(sessions_dir, f"{sid}.jsonl")
        msg_data = {
            "role": "assistant",
            "content": text,
            "timestamp": iso_ts
        }
        with open(jsonl_path, 'a', encoding='utf-8') as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            f.write(json.dumps(msg_data) + '\\n')
            fcntl.flock(f, fcntl.LOCK_UN)
    except Exception:
        pass

def update_lead_memory(phone, name, details_dict):
    try:
        import json, os, time
        lead_memory_file = os.path.expanduser('~/.hermes/lead_memory.json')
        memories = {}
        if os.path.exists(lead_memory_file):
            try:
                with open(lead_memory_file, 'r', encoding='utf-8') as mf:
                    memories = json.load(mf)
            except Exception:
                pass
        
        lead_mem = memories.get(phone, {})
        for k, v in details_dict.items():
            lead_mem[k] = v
            
        lead_mem["lastProcessedAt"] = time.time()
        memories[phone] = lead_mem
        
        try:
            with open(lead_memory_file, 'w', encoding='utf-8') as mf:
                json.dump(memories, mf, indent=2)
        except Exception:
            pass
    except Exception:
        pass

def check_time_window():
    if not time_window:
        return True
    # Get timezone-aware local time
    timezone_str = campaign.get('timezone', 'UTC')
    try:
        from zoneinfo import ZoneInfo
        now = datetime.datetime.now(ZoneInfo(timezone_str))
    except Exception:
        try:
            import pytz
            now = datetime.datetime.now(pytz.timezone(timezone_str))
        except Exception:
            now = datetime.datetime.now()
    if 9 <= now.hour < 21:
        return True
    return False

local_image_path = None
if imageUrl:
    import tempfile
    try:
        r = requests.get(imageUrl, timeout=30)
        if r.status_code == 200:
            fd, temp_path = tempfile.mkstemp(suffix=".jpg")
            os.close(fd)
            with open(temp_path, 'wb') as img_f:
                img_f.write(r.content)
            local_image_path = temp_path
    except Exception as e:
        with open('/home/ubuntu/cold_outreach_details.log', 'a') as df:
            df.write(f"WARNING | Failed to download campaign image: {str(e)}\\n")

# Initialize status
update_supabase("running")

try:
    for idx, lead in enumerate(leads):
        if os.path.exists('/home/ubuntu/cold_outreach_abort'):
            break

        # Check if campaign is paused
        while os.path.exists('/home/ubuntu/cold_outreach_pause'):
            if os.path.exists('/home/ubuntu/cold_outreach_abort'):
                break
            time.sleep(5)

        # Check daily limit restriction
        if daily_limit > 0 and sends_today >= daily_limit:
            sends_today = 0
            with open('/home/ubuntu/cold_outreach_details.log', 'a') as df:
                df.write(f"DAILY_LIMIT | Reached daily limit of {daily_limit}. Pausing outreach until tomorrow 9:00 AM... | {time.strftime('%Y-%m-%d %H:%M:%S')}\\n")
            
            # Calculate sleep seconds until tomorrow 9:00 AM local time
            timezone_str = campaign.get('timezone', 'UTC')
            try:
                from zoneinfo import ZoneInfo
                tz = ZoneInfo(timezone_str)
            except Exception:
                try:
                    import pytz
                    tz = pytz.timezone(timezone_str)
                except Exception:
                    tz = None
            
            if tz:
                now = datetime.datetime.now(tz)
                tomorrow_9am = datetime.datetime(now.year, now.month, now.day, 9, 0, 0, tzinfo=tz) + datetime.timedelta(days=1)
            else:
                now = datetime.datetime.now()
                tomorrow_9am = datetime.datetime(now.year, now.month, now.day, 9, 0, 0) + datetime.timedelta(days=1)
                
            sleep_seconds = (tomorrow_9am - now).total_seconds()
            
            while sleep_seconds > 0:
                if os.path.exists('/home/ubuntu/cold_outreach_abort'):
                    break
                time.sleep(min(60, sleep_seconds))
                sleep_seconds -= 60

        if os.path.exists('/home/ubuntu/cold_outreach_abort'):
            break

        # Check time window restrictions
        waiting_logged = False
        while not check_time_window():
            if os.path.exists('/home/ubuntu/cold_outreach_abort'):
                break
            if not waiting_logged:
                with open('/home/ubuntu/cold_outreach_details.log', 'a') as df:
                    df.write(f"WAITING | Outside 9AM-9PM window. Waiting... | {time.strftime('%Y-%m-%d %H:%M:%S')}\\n")
                waiting_logged = True
            time.sleep(60)

        if os.path.exists('/home/ubuntu/cold_outreach_abort'):
            break

        phone = str(lead.get('phone', '')).strip().replace('+', '')
        if not phone:
            failed += 1
            continue

        # Skip already contacted leads (session exists in sessions.json)
        sessions_file = os.path.expanduser("~/.hermes/sessions/sessions.json")
        if os.path.exists(sessions_file):
            try:
                with open(sessions_file, 'r', encoding='utf-8') as sf:
                    sessions_data = json.load(sf)
                has_session = False
                target_clean = phone.replace("+", "").split(":")[0].split("@", 1)[0]
                for k in sessions_data.keys():
                    if "whatsapp" not in k.lower():
                        continue
                    k_phone = k.split(":")[-1] if ":" in k else ""
                    if k_phone == target_clean:
                        has_session = True
                        break
                if not has_session:
                    session_dir = os.path.expanduser("~/.hermes/whatsapp/session")
                    mapped_clean = None
                    for suffix in ("", "_reverse"):
                        mapping_path = os.path.join(session_dir, f"lid-mapping-{target_clean}{suffix}.json")
                        if os.path.exists(mapping_path):
                            try:
                                with open(mapping_path) as mf:
                                    mapped = json.load(mf)
                                    mapped_clean = mapped.replace("+", "").split(":")[0].split("@", 1)[0]
                                    break
                            except:
                                pass
                    if mapped_clean:
                        for k in sessions_data.keys():
                            if "whatsapp" not in k.lower():
                                continue
                            k_phone = k.split(":")[-1] if ":" in k else ""
                            if k_phone == mapped_clean:
                                has_session = True
                                break
                if has_session:
                    with open('/home/ubuntu/cold_outreach_details.log', 'a') as df:
                        df.write(f"SKIPPED | {phone} | Lead already contacted (session exists) | {time.strftime('%Y-%m-%d %H:%M:%S')}\\n")
                    continue
            except Exception:
                pass

        # Map template
        if is_single:
            template_text = single_template
        else:
            cat_group = lead.get('category_group', 'Other')
            template_text = templates.get(cat_group)
            if not template_text:
                # Fallback to first available template or default
                template_text = next(iter(templates.values())) if templates else "Hello {business_name}"

        # Replace variables
        msg = template_text
        msg = msg.replace('{business_name}', str(lead.get('business_name', 'there')))
        msg = msg.replace('{city}', str(lead.get('city', '')))
        msg = msg.replace('{rating}', str(lead.get('rating', '')))
        msg = msg.replace('{reviews_count}', str(lead.get('reviews_count', '')))
        msg = msg.replace('{category}', str(lead.get('category', '')))

        chat_id = f"{phone}@s.whatsapp.net"
        if local_image_path and os.path.exists(local_image_path):
            url = "http://127.0.0.1:3009/send-media"
            payload = {
                "chatId": chat_id,
                "filePath": local_image_path,
                "mediaType": "image"
            }
            if msg:
                payload["caption"] = msg
        else:
            url = "http://127.0.0.1:3009/send"
            payload = {"chatId": chat_id, "message": msg}
            
        headers = {"Content-Type": "application/json"}

        try:
            r = requests.post(url, json=payload, headers=headers, timeout=15)
            if r.status_code == 200:
                sent += 1
                sends_today += 1
                log_line = f"SUCCESS | {phone} | {lead.get('business_name')} | {time.strftime('%Y-%m-%d %H:%M:%S')}"
                log_sent_message(phone, msg, lead.get('business_name', ''))
                update_lead_memory(phone, lead.get('business_name', ''), {
                    "name": lead.get('business_name', phone),
                    "profession": lead.get('category', 'Unknown'),
                    "intent": "cold",
                    "objections": "None",
                    "summary": f"Sent cold outreach: {msg[:60]}...",
                    "notes": f"City: {lead.get('city', '')}, Rating: {lead.get('rating', '')}, Reviews: {lead.get('reviews_count', '')}",
                    "status": "Follow-up Needed"
                })
            else:
                failed += 1
                try:
                    err_msg = r.json().get('error', f"Status {r.status_code}")
                except:
                    err_msg = f"Status {r.status_code}"
                log_line = f"FAILED | {phone} | {err_msg} | {time.strftime('%Y-%m-%d %H:%M:%S')}"
        except Exception as e:
            failed += 1
            log_line = f"FAILED | {phone} | {str(e)} | {time.strftime('%Y-%m-%d %H:%M:%S')}"

        with open('/home/ubuntu/cold_outreach_details.log', 'a') as df:
            df.write(log_line + '\\n')

        # Update Supabase and local progress status
        update_supabase("running")

        # Sleep for delay
        if idx < len(leads) - 1:
            time.sleep(delay)

    # Done
    status_final = "completed"
    if os.path.exists('/home/ubuntu/cold_outreach_abort'):
        status_final = "stopped"
    update_supabase(status_final, finished=True)

except Exception as e:
    with open('/home/ubuntu/cold_outreach_details.log', 'a') as df:
        df.write(f"FATAL_ERROR | {str(e)}\\n")
    update_supabase("failed", finished=True)
finally:
    if local_image_path and os.path.exists(local_image_path):
        try:
            os.remove(local_image_path)
        except:
            pass
`;

    // Upload campaign file
    const campaignData = JSON.stringify({
        leads,
        templates,
        singleTemplate,
        isSingleTemplate,
        delay: delaySeconds,
        timeWindow,
        jobId,
        supabaseUrl,
        supabaseServiceKey,
        dailyLimit,
        imageUrl,
        timezone,
        initialSent,
        initialFailed
    });

    await uploadFile(ip, privateKey, campaignData, '/home/ubuntu/cold_outreach_campaign.json', username);
    await uploadFile(ip, privateKey, campaignData, `/home/ubuntu/cold_outreach_campaign_${jobId}.json`, username);
    await uploadFile(ip, privateKey, outreachScript, '/home/ubuntu/cold_outreach.py', username);

    // Clean up any abort and pause flags
    await executeCommand(ip, privateKey, 'rm -f /home/ubuntu/cold_outreach_abort /home/ubuntu/cold_outreach_pause', username);
    await executeCommand(ip, privateKey, 'rm -f /home/ubuntu/cold_outreach_details.log', username);

    const tmuxSession = 'cold_outreach';
    await executeCommand(
        ip,
        privateKey,
        `tmux kill-session -t ${tmuxSession} 2>/dev/null; tmux new-session -d -s ${tmuxSession} "python3 /home/ubuntu/cold_outreach.py"`,
        username
    );

    return tmuxSession;
}

