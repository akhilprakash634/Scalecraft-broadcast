import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessType, businessName, location, services, primaryLanguage } = await request.json();

    const geminiApiKey = client.geminiApiKey;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured in your settings' }, { status: 400 });
    }

    const systemInstruction = `Generate 5 most common customer objections and responses for the business described.
Return a JSON array of objects, where each object has these exact keys:
- trigger: "the objection or concern phrased in the customer's voice"
- response: "a short, polite, professional, and convincing answer (under 50 words)"
- action: "continue"

Language: ${primaryLanguage || 'English'}
Output format MUST be a valid JSON array. Do not wrap in markdown code blocks like \`\`\`json.`;

    const userPrompt = `Generate 5 objections and responses for a ${businessType || 'business'} called "${businessName || client.businessName}" in "${location || 'our location'}" offering "${services || 'our services'}".`;

    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey
    };
    const body = JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`,
        { method: 'POST', headers, body }
      );
      if (!res.ok) {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
          { method: 'POST', headers, body }
        );
      }
    } catch (err) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        { method: 'POST', headers, body }
      );
    }

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const resData = await res.json();
    const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';

    try {
      const parsedObjections = JSON.parse(generatedText);
      return NextResponse.json({ success: true, objections: parsedObjections });
    } catch {
      return NextResponse.json({ error: 'Failed to parse generated objections JSON' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Generate Objections API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
