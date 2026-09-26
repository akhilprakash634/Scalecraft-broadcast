import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'whatsapp-flow-endpoint'
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (appSecret && signature) {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    let body;
    
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = body;

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      return NextResponse.json({ error: 'Missing encryption parameters' }, { status: 400 });
    }

    const privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
    const passphrase = process.env.WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE;
    
    if (!privateKeyPem) {
      console.error('Missing WHATSAPP_FLOW_PRIVATE_KEY');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // 1. Decrypt AES Key
    let aesKey;
    try {
      const privateKey = crypto.createPrivateKey({
        key: privateKeyPem.replace(/\\n/g, '\n'),
        passphrase: passphrase || undefined
      });

      aesKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encrypted_aes_key, 'base64')
      );
    } catch (err) {
      console.error('Failed to decrypt AES key:', err);
      return NextResponse.json({ error: 'Failed to decrypt AES key' }, { status: 400 });
    }

    // 2. Decrypt Flow Data
    let decryptedData;
    const iv = Buffer.from(initial_vector, 'base64');
    
    try {
      const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
      const authTag = flowDataBuffer.subarray(-16);
      const ciphertext = flowDataBuffer.subarray(0, -16);

      const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, iv);
      decipher.setAuthTag(authTag);

      let decryptedBytes = decipher.update(ciphertext);
      decryptedBytes = Buffer.concat([decryptedBytes, decipher.final()]);

      decryptedData = JSON.parse(decryptedBytes.toString('utf8'));
    } catch (err) {
      console.error('Failed to decrypt flow data:', err);
      return NextResponse.json({ error: 'Failed to decrypt flow data' }, { status: 400 });
    }

    // Log the request server-side
    console.log('\n--- FLOW REQUEST ---');
    console.log(`action: ${decryptedData.action}`);
    console.log(`screen: ${decryptedData.screen}`);
    console.log('data:', decryptedData.data || {});
    console.log('--------------------\n');

    // 3. Prepare Response
    const { action, screen, data, flow_token } = decryptedData;

    let responsePayload: any = {
      data: {
        ...data // Echo back data to satisfy generic flow conditions
      }
    };

    if (action === 'ping') {
      responsePayload.data.status = 'active';
    } else if (action === 'INIT') {
      responsePayload.data.is_init = true;
    }

    // 4. Encrypt Response
    const flippedIv = Buffer.alloc(iv.length);
    for (let i = 0; i < iv.length; i++) {
      flippedIv[i] = ~iv[i] & 0xFF;
    }

    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIv);
    let encrypted = cipher.update(JSON.stringify(responsePayload), 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const responseAuthTag = cipher.getAuthTag();
    const finalEncryptedBuffer = Buffer.concat([encrypted, responseAuthTag]);

    // According to Meta, the response must just be the base64 string
    // Wait, let's verify if they expect a plain string or a JSON object.
    // The docs say: "The encrypted response is returned as a base64 encoded string in the body of the HTTP response."
    // BUT the Node.js example usually sends it as plain text. I will return it as plain text.
    return new Response(finalEncryptedBuffer.toString('base64'), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (err: any) {
    console.error('Flow Endpoint Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
