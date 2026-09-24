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

    const systemInstruction = `Generate 5 most common customer questions and answers for the business described.
Format as:
Q: [Question]
A: [Answer under 50 words]

Keep answers under 50 words each.
Language: ${primaryLanguage || 'English'}
Return ONLY the Q&A pairs, separated by empty lines. Do not add any introductory or concluding text.`;

    const userPrompt = `Generate 5 most common Q&As for a ${businessType || 'business'} called "${businessName || client.businessName}" in "${location || 'our location'}" offering "${services || 'our services'}".`;

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
    const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return NextResponse.json({ success: true, faqs: generatedText });
  } catch (error: any) {
    console.error('Generate FAQs API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
