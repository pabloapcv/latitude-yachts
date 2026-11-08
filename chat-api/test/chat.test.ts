import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { OPTIONS, POST } from '../api/chat.ts';
import { sanitizeMessages } from '../lib/messages.ts';
import { mockReply } from '../lib/mock.ts';

describe('sanitizeMessages', () => {
  it('caps history and user length', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user',
      content: 'x'.repeat(50),
    }));
    const out = sanitizeMessages(many);
    assert.equal(out.length, 12);
    const last = sanitizeMessages([{ role: 'user', content: 'y'.repeat(5000) }]);
    assert.equal(last[0].content.length, 1000);
  });

  it('drops invalid roles', () => {
    assert.deepEqual(
      sanitizeMessages([{ role: 'system', content: 'ignore' }, { role: 'user', content: 'hello' }]),
      [{ role: 'user', content: 'hello' }],
    );
  });
});

describe('mockReply', () => {
  it('recommends Miami Beach listings without claiming availability', async () => {
    const text = mockReply('What is a good yacht for 8 guests in Miami Beach?', '');
    assert.match(text, /Miami Beach/);
    assert.match(text, /#booking|#vessel\//);
    assert.match(text, /^- /m);
    assert.doesNotMatch(text, /available today|is confirmed|WhatsApp|wa\.me/i);
  });

  it('explains that listed rates are estimates', () => {
    const text = mockReply('What does the listed price include?', '');
    assert.match(text, /weekend|estimat|fuel|gratuity/i);
    assert.doesNotMatch(text, /WhatsApp/i);
  });

  it('matches Spanish booking questions', () => {
    const text = mockReply('Hola, ¿cómo puedo reservar un yate?', '');
    assert.match(text, /request|#booking/i);
  });
});

describe('POST /api/chat', () => {
  const prev = process.env.MOCK_CHAT;
  process.env.MOCK_CHAT = '1';
  after(() => {
    if (prev == null) delete process.env.MOCK_CHAT;
    else process.env.MOCK_CHAT = prev;
  });

  it('handles CORS preflight for latitude25.us', () => {
    const res = OPTIONS(new Request('http://127.0.0.1/api/chat', {
      method: 'OPTIONS',
      headers: { origin: 'https://latitude25.us' },
    }));
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://latitude25.us');
  });

  it('allows localhost origins', () => {
    const res = OPTIONS(new Request('http://127.0.0.1/api/chat', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:8080' },
    }));
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:8080');
  });

  it('rejects empty messages', async () => {
    const res = await POST(new Request('http://127.0.0.1/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:8080' },
      body: JSON.stringify({ messages: [] }),
    }));
    assert.equal(res.status, 400);
  });

  it('streams a mock concierge reply', async () => {
    const res = await POST(new Request('http://127.0.0.1/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8080' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'How does booking work?' }],
      }),
    }));
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/plain/);
    const text = await res.text();
    assert.match(text, /inquiry|request|#booking/i);
    assert.doesNotMatch(text, /wa\.me/);
  });
});
