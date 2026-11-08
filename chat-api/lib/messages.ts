export const MAX_USER_CHARS = 1_000;
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_MESSAGE_CHARS = 2_000;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export function sanitizeMessages(input: unknown): ChatTurn[] {
  if (!Array.isArray(input)) return [];
  const cleaned: ChatTurn[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    const text = content.replace(/\u0000/g, '').trim();
    if (!text) continue;
    cleaned.push({ role, content: text.slice(0, MAX_MESSAGE_CHARS) });
  }
  const sliced = cleaned.slice(-MAX_HISTORY_MESSAGES);
  if (sliced.length) {
    const last = sliced[sliced.length - 1];
    if (last.role === 'user') last.content = last.content.slice(0, MAX_USER_CHARS);
  }
  return sliced;
}

export function lastUserMessage(messages: ChatTurn[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}
