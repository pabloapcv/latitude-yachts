import {
  createTextStreamResponse,
  isStepCount,
  streamText,
  tool,
  toTextStream,
} from 'ai';
import { z } from 'zod';
import { corsHeaders } from '../lib/cors.ts';
import { fleetSummary, formatYacht, searchYachts } from '../lib/fleet.ts';
import { SITE_KNOWLEDGE, whatsappGuidance } from '../lib/knowledge.ts';
import { lastUserMessage, sanitizeMessages } from '../lib/messages.ts';
import { mockReply, streamTextChunks } from '../lib/mock.ts';
import { clientKey, rateLimit } from '../lib/rate-limit.ts';

export const maxDuration = 30;

const DEFAULT_MODEL = 'google/gemini-3.5-flash-lite';
const MAX_BODY_BYTES = 24_000;

function jsonError(status: number, message: string, request: Request, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request.headers.get('origin')),
      ...extra,
    },
  });
}

function buildInstructions(whatsappNumber: string): string {
  return `You are the Latitude °25 concierge on latitude25.us — a warm, concise luxury charter concierge.

Voice: polished, calm, never salesy. Short paragraphs. No exclamation spam. No emojis unless the guest used one first.

Language: reply in English or Spanish to match the guest.

Grounding:
${SITE_KNOWLEDGE}

Fleet snapshot:
${fleetSummary()}

Rules:
- Use the searchYachts tool whenever the guest asks about specific boats, sizes, areas, prices, guest counts, jacuzzi, or jet ski.
- Quote only listed weekend rates returned by the tool or this snapshot. Always label them as listed estimates, not confirmed prices.
- Never invent availability, live calendar, deposits, cancellation terms, insurance, or policies that are not in the site knowledge.
- Never claim a yacht is free on a date. Direct booking intent to #booking.
- Guest counts are estimates. Say so.
- Do not mention owner or operator names or phone numbers. The concierge is the only contact.
- When you cannot answer, the guest wants to book, or they want a human: point to the booking request (#booking) and/or contact (#contact).
- You may link in-site with markdown: [Browse the fleet](#fleet), [Request a charter](#booking), [Contact](#contact), [How it works](#how), [FAQ](#faq), or a vessel as [Yacht name](#vessel/ID) using IDs from the tool.
${whatsappGuidance(whatsappNumber)}
- Keep answers under ~180 words unless listing a few yachts.`;
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  const limited = rateLimit(clientKey(request));
  if (!limited.ok) {
    return jsonError(429, 'Please wait a moment before sending another message.', request, {
      'Retry-After': String(limited.retryAfterSec),
    });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonError(413, 'Message is too long.', request);
  }

  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    return jsonError(400, 'Invalid JSON.', request);
  }

  const body = parsed && typeof parsed === 'object' ? (parsed as { messages?: unknown }) : {};
  const messages = sanitizeMessages(body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return jsonError(400, 'Please include a question.', request);
  }

  const whatsappNumber = (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const userText = lastUserMessage(messages);
  const useMock = process.env.MOCK_CHAT === '1' || process.env.MOCK_CHAT === 'true';

  if (useMock) {
    const text = mockReply(userText, whatsappNumber);
    return createTextStreamResponse({
      headers,
      stream: streamTextChunks(text),
    });
  }

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return jsonError(503, 'Chat API is not configured yet. Set AI_GATEWAY_API_KEY or enable Vercel OIDC.', request);
  }

  const model = process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;

  try {
    const result = streamText({
      model,
      instructions: buildInstructions(whatsappNumber),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: {
        searchYachts: tool({
          description:
            'Search the Latitude °25 fleet by area, size, listed price, guest estimate, jacuzzi, or jet ski. Use this before recommending specific yachts.',
          inputSchema: z.object({
            query: z.string().optional().describe('Name, brand, or keyword'),
            area: z.string().optional().describe('Boarding area such as Miami Beach or Fort Lauderdale'),
            minSize: z.number().optional().describe('Minimum length in feet'),
            maxSize: z.number().optional().describe('Maximum length in feet'),
            minPrice: z.number().optional().describe('Minimum listed rate in USD'),
            maxPrice: z.number().optional().describe('Maximum listed rate in USD'),
            duration: z.enum(['4h', '6h', '8h']).optional().describe('Which listed duration rate to filter on'),
            guests: z.number().optional().describe('Minimum listed guest estimate'),
            jacuzzi: z.boolean().optional(),
            jetski: z.boolean().optional(),
          }),
          execute: async (input) => {
            const matches = searchYachts({ ...input, limit: 6 });
            return {
              matchCount: matches.length,
              note: 'Rates are listed weekend estimates, not confirmed quotes. Availability is not live.',
              yachts: matches.map(formatYacht),
            };
          },
        }),
      },
      stopWhen: isStepCount(4),
      onError({ error }) {
        console.error('chat stream error', error);
      },
    });

    return createTextStreamResponse({
      headers,
      stream: toTextStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error('chat handler error', error);
    return jsonError(502, 'The concierge is momentarily unavailable. Please try again, or send a request from the site.', request);
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return OPTIONS(request);
  if (request.method === 'POST') return POST(request);
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST, OPTIONS', ...corsHeaders(request.headers.get('origin')) },
  });
}
