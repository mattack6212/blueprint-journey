// netlify/functions/coach.js
//
// Foundation Financial — Coach chatbot serverless function
//
// Receives messages from the floating chat widget, calls the
// Anthropic Claude API with the Coach system prompt, returns
// the response.
//
// Environment variables required (set in Netlify dashboard):
//   ANTHROPIC_API_KEY   — your Anthropic API key
//
// The system prompt is loaded from a sibling file so it can
// be edited without redeploying code.

const fs = require('fs');
const path = require('path');

// Load the system prompt once at cold start.
let SYSTEM_PROMPT = '';
try {
  SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, 'coach-system-prompt.md'),
    'utf8'
  );
} catch (err) {
  console.error('Failed to load coach-system-prompt.md:', err);
}

// CORS headers — adjust origin to your domain in production.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  // Handle CORS preflight.
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Only accept POST.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify API key is configured.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable not set');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Coach is temporarily unavailable. Please try again later.'
      })
    };
  }

  // Parse the incoming body.
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  const { messages } = payload;

  // Basic validation.
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'messages array required' })
    };
  }

  // Cap conversation length to prevent abuse / runaway costs.
  // Most coaching conversations should resolve in <20 turns.
  if (messages.length > 40) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'This conversation has gotten long. Please start a fresh chat or schedule a coaching call at https://learn.foundationfinancial.community/coaching/.'
      })
    };
  }

  // Sanity-check message shape and length.
  for (const m of messages) {
    if (!m.role || !m.content) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Each message needs role and content' })
      };
    }
    if (typeof m.content === 'string' && m.content.length > 4000) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'That message is too long. Try breaking it into a shorter question.'
        })
      };
    }
  }

  // Call the Anthropic API.
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API error:', response.status, errorBody);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Coach is having trouble right now. Please try again in a moment.'
        })
      };
    }

    const data = await response.json();

    // Extract the text content from the response.
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const reply = textBlocks.map(b => b.text).join('\n').trim();

    if (!reply) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Coach did not return a response. Please try again.'
        })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.error('Coach function error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Something went wrong. Please try again in a moment.'
      })
    };
  }
};
