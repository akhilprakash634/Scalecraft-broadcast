import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leads, serviceType, customPitch, language } = await request.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    const geminiApiKey = client.geminiApiKey;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured in your settings' }, { status: 400 });
    }

    // Extract unique category groups
    const categoryGroups = Array.from(
      new Set(leads.map((l) => l.category_group || 'Other').filter(Boolean))
    );

    // Build the service pitch description
    let pitchDescription = '';
    if (serviceType === 'website') {
      pitchDescription = 'Website development (building a modern, responsive website to attract more customers and build trust online)';
    } else if (serviceType === 'ai_agent') {
      pitchDescription = 'WhatsApp AI Chatbot Agent (automating customer service, responding instantly 24/7, and booking appointments automatically)';
    } else if (serviceType === 'both') {
      pitchDescription = 'Both website development and a 24/7 WhatsApp AI Chatbot Agent to automate customer queries and grow their business';
    } else if (serviceType === 'custom') {
      pitchDescription = customPitch || 'Our premium business growth services';
    } else {
      pitchDescription = 'Our business automation and website development services';
    }

    const templates: Record<string, string> = {};

    // Generate template for each category group using Gemini API
    for (const group of categoryGroups) {
      const systemInstruction = `You are a professional marketing copywriter writing a high-converting cold outreach WhatsApp message for local businesses.
The service you are pitching: ${pitchDescription}
Language: ${language || 'English'}

Your goal is to write a template message. Keep it short, conversational, and highly personalized (exactly 2-3 sentences).
You MUST use these exact placeholder variables where appropriate:
- {business_name}: The name of the business
- {city}: The city of the business
- {rating}: The rating of the business
- {reviews_count}: The number of reviews
- {category}: The specific category of the business

Example message:
"Hi {business_name}! I saw your listing under {category} in {city}. I noticed you have a great rating of {rating} from {reviews_count} reviews, but no website! We build fast mobile-friendly sites that help you get even more bookings. Let me know if you are open to checking out a quick mockup?"

Do not include any quotes around the template.
Do not add any subject lines, explanations, or introductory text.
Return ONLY the raw message template ready to be sent. Use WhatsApp formatting like *bold* for emphasis.`;

      const userPrompt = `Write a highly engaging, custom template message specifically for businesses in the "${group}" category group.`;

      try {
        const headers = {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        };
        const body = JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            maxOutputTokens: 150,
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
        let generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        // Clean up quotes if returned
        if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
          generatedText = generatedText.slice(1, -1);
        }

        templates[group] = generatedText || `Hi {business_name}, I noticed your business listed under {category} in {city}. We help businesses like yours implement ${pitchDescription}. Let's chat!`;
      } catch (err: any) {
        console.error(`Gemini call failed for group "${group}":`, err.message);
        // Fallback template
        templates[group] = `Hi {business_name}, I noticed your business listed under {category} in {city}. We help businesses like yours implement ${pitchDescription}. Let's chat!`;
      }
    }

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Generate Cold Outreach API Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
