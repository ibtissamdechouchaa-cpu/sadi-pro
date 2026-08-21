const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? 'AQ.Ab8RN6JF5t-m80wXnxNI8Vj1wAtUXszDM9rh3DnovhAcxNjmPQ';
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const DOC_TYPES = [
  'Contract', 'Decision', 'Agreement', 'Administrative Correspondence',
  'Draft Correspondence', 'Regular Correspondence', 'Certificate',
  'Statement', 'Resolution', 'Petition', 'Tender', 'Bid', 'Commitment',
  'Report', 'Invoice', 'Minutes', 'Memorandum', 'Circular', 'Order',
];

async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(`${GEMINI_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') ?? '';

    let action = 'chat';
    let question = '';
    let context = '';
    let docName: string | undefined;
    let targetFormat = '';
    let language = 'en';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      action = (formData.get('action') as string) ?? 'ocr';
      question = (formData.get('question') as string) ?? '';
      targetFormat = (formData.get('targetFormat') as string) ?? 'pdf';
      language = (formData.get('language') as string) ?? 'en';
      file = formData.get('file') as File | null;
    } else {
      const body = await req.json();
      action = body.action ?? 'chat';
      question = body.question ?? '';
      context = body.context ?? '';
      docName = body.docName;
      targetFormat = body.targetFormat ?? 'pdf';
      language = body.language ?? 'en';
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Set GEMINI_API_KEY in edge function secrets.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chat / RAG
    if (action === 'chat') {
      const systemInstruction = `You are SADI PRO, an intelligent document archive assistant. Answer questions about documents. If context is provided, base your answer on it. Support English, Arabic, and French. Provide compliance guidance based on ISO 15489, ISO 19005, ISO 14721, ISO 16175, ISO 23081, and Algerian codification roles (1504, 1807, 2109, 8809, 9011, 0663).`;

      const userContent = context
        ? `Document: ${docName ?? 'Unknown'}\n\nContent:\n${context}\n\nQuestion: ${question}`
        : `Question: ${question}`;

      const answer = await callGemini(userContent, systemInstruction);
      const citations = context ? [docName ?? 'Provided document'] : [];

      return new Response(
        JSON.stringify({ answer, citations, confidence: 0.85 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Classify document type from content
    if (action === 'classify') {
      const classifyPrompt = `Analyze the following document content and determine its type. Choose exactly ONE from this list: ${DOC_TYPES.join(', ')}. Also extract: the document number (if any), the issuing authority (if any), the subject/domain (if any), and 5 key keywords. Respond in JSON format: {"doc_type": "...", "document_number": "...", "authority": "...", "subject": "...", "keywords": ["...", "..."]}. If a field is not found, use null or empty array.\n\nDocument content:\n${context || question}`;

      const result = await callGemini(classifyPrompt);
      let parsed: Record<string, unknown> = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // If JSON parsing fails, return the raw text as doc_type
        parsed = { doc_type: result, document_number: null, authority: null, subject: null, keywords: [] };
      }

      return new Response(
        JSON.stringify(parsed),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OCR
    if (action === 'ocr' || (file && action !== 'convert')) {
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let base64 = '';
      for (let i = 0; i < uint8.length; i++) {
        base64 += String.fromCharCode(uint8[i]);
      }
      const fileBase64 = btoa(base64);

      const mimeType = file.type || 'image/png';
      const ocrPrompt = `Extract all text from this document. Language: ${language}. Return only the extracted text, preserving structure.`;

      const ocrResponse = await fetch(`${GEMINI_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ocrPrompt },
              { inlineData: { mimeType, data: fileBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      });

      if (!ocrResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'OCR failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ocrData = await ocrResponse.json();
      const text = ocrData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return new Response(
        JSON.stringify({ text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conversion
    if (action === 'convert') {
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let base64 = '';
      for (let i = 0; i < uint8.length; i++) {
        base64 += String.fromCharCode(uint8[i]);
      }
      const fileBase64 = btoa(base64);

      const convertPrompt = `Convert this document to ${targetFormat} format. Return the converted content.`;

      const convertResponse = await fetch(`${GEMINI_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: convertPrompt },
              { inlineData: { mimeType: file.type || 'application/octet-stream', data: fileBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      });

      if (!convertResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Conversion failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const convertData = await convertResponse.json();
      const convertedContent = convertData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const blob = new Blob([convertedContent], { type: `application/${targetFormat}` });

      return new Response(blob, {
        headers: {
          ...corsHeaders,
          'Content-Type': `application/${targetFormat}`,
          'Content-Disposition': `attachment; filename="converted.${targetFormat}"`,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
