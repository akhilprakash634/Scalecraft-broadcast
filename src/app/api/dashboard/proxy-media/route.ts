import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, getClientServerIp, shellEscape } from '@/lib/ssh';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath || !filePath.startsWith('/home/ubuntu/')) {
      return new NextResponse('Invalid path', { status: 400 });
    }

    const serverIP = getClientServerIp(client);
    const { sshPrivateKey, serverUser } = client;
    if (!serverIP || !sshPrivateKey) {
      return new NextResponse('Server details missing', { status: 400 });
    }

    // Base64 encode the binary file on the server to transfer it safely over the SSH stdout stream
    const command = `base64 -w 0 ${shellEscape(filePath)}`;
    const result = await executeCommand(serverIP, sshPrivateKey, command, serverUser || 'ubuntu');

    if (result.exitCode !== 0) {
      console.error('Failed to proxy media:', result.stderr);
      return new NextResponse('Failed to fetch media from server', { status: 404 });
    }

    const buffer = Buffer.from(result.stdout, 'base64');

    // Basic MIME type inference from extension
    let contentType = 'application/octet-stream';
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'ogg' || ext === 'oga') contentType = 'audio/ogg';
    else if (ext === 'mp3') contentType = 'audio/mpeg';
    else if (ext === 'webm') contentType = 'audio/webm';
    else if (ext === 'wav') contentType = 'audio/wav';
    else if (ext === 'm4a') contentType = 'audio/mp4';
    else if (ext === 'opus') contentType = 'audio/opus';
    else if (ext === 'aac') contentType = 'audio/aac';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'pdf') contentType = 'application/pdf';

    // Add cache headers so we don't repeatedly fetch over SSH
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    headers.set('Content-Disposition', `inline; filename="media.${ext}"`);

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Proxy Media API Error:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
