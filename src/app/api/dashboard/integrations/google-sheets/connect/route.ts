import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { getGoogleOAuthUrl } from '@/lib/googleSheets';

export async function GET(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/dashboard/integrations/google-sheets/callback`;

    const googleClientId = process.env.GOOGLE_CLIENT_ID || 'dummy-client-id';

    const authUrl = getGoogleOAuthUrl(redirectUri, googleClientId);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[Google Connect Error]:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
