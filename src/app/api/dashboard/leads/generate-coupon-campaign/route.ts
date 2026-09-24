import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const client = await getSessionClient();
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      leads,
      couponCode,
      discountType,
      discountValue,
      expiryDate,
      businessName,
      geminiApiKey
    } = await request.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Leads list is required and cannot be empty' }, { status: 400 });
    }

    const apiKey = geminiApiKey || client.geminiApiKey || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured. Please save it first.' }, { status: 400 });
    }

    const bName = businessName || client.businessName || 'our business';
    const discountDescription = discountType === 'percentage'
      ? `${discountValue}% off`
      : `Rs. ${discountValue} off`;



    const generatePromises = leads.map(async (lead: any) => {
      const messagesStr = Array.isArray(lead.last_5_messages)
        ? lead.last_5_messages.map((m: any) => `${m.sender === 'agent' ? 'Agent' : 'Customer'}: ${m.text}`).join('\n')
        : lead.last_5_messages || 'No recent messages.';

      const priceSignalsStr = Array.isArray(lead.price_signals)
        ? lead.price_signals.join(', ')
        : lead.price_signals || 'price concerns';

      const systemInstruction = `You are a friendly sales assistant for ${bName}. Write a short WhatsApp coupon discount follow-up.`;
      
      const userPrompt = `You are a friendly sales assistant for ${bName}.
This customer was interested but hesitated on price.

Their conversation (last 5 messages):
${messagesStr}

Price signals they mentioned: ${priceSignalsStr}

Write a SHORT WhatsApp message (2-3 sentences) that:
1. References their specific interest naturally
2. Offers them an exclusive coupon code: ${couponCode}
3. Mentions the discount: ${discountDescription}
4. Creates mild urgency with expiry: valid until ${expiryDate}
5. Sounds personal and genuine, not like a bulk message
6. Does NOT start with Dear or formal greetings
7. Generate the message in the customer's language if they spoke Malayalam (use Malayalam script) or Arabic, otherwise default to English.
8. Do not use any emojis in the generated message.

Return ONLY the message, nothing else.`;

      try {
        const headers = {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
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
          throw new Error(`Gemini status ${res.status}`);
        }

        const data = await res.json();
        let message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        // Clean any quotes
        if (message.startsWith('"') && message.endswith('"')) {
          message = message.substring(1, message.length - 1);
        }

        return {
          phone: lead.phone,
          message,
          editable: true,
          success: true
        };
      } catch (err: any) {
        console.error(`Gemini failed for lead ${lead.phone} in coupon campaign:`, err.message);
        // Fallback message
        const fallbackMsg = `Hey! Just wanted to share an exclusive offer. Use code ${couponCode} to get ${discountDescription} on your purchase! Valid until ${expiryDate}. Let me know if you would like to proceed.`;
        return {
          phone: lead.phone,
          message: fallbackMsg,
          editable: true,
          success: false
        };
      }
    });

    const results = await Promise.all(generatePromises);
    return NextResponse.json({ success: true, messages: results });
  } catch (error: any) {
    console.error('Leads generate-coupon-campaign API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
