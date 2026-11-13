import { searchYachts } from './fleet.ts';

function looksSpanish(text: string): boolean {
  return /\b(hola|yate|yates|precio|precios|alquiler|reservar|gracias|cuánto|cuanto|horas|invitados|playa|disponible)\b/i.test(text)
    || /[¿¡]/.test(text);
}

function parseSearch(text: string) {
  const guests = text.match(/(\d+)\s*(guests?|people|pax|invitad)/i);
  const size = text.match(/(\d+)\s*(ft|foot|feet|pies|['’])/i);
  const maxPrice = text.match(/under\s*\$?\s*([\d,]+)|menos de\s*\$?\s*([\d,]+)/i);
  const jacuzzi = /jacuzzi|hot tub|spa/i.test(text);
  const jetski = /jet\s*ski|jetski|moto acu/i.test(text);
  let minSize: number | undefined;
  let maxSize: number | undefined;
  if (/(superyacht|large|luxury|88|100)/i.test(text) && !size) {
    minSize = 70;
  } else if (size) {
    const n = Number(size[1]);
    minSize = Math.max(21, n - 8);
    maxSize = n + 8;
  } else if (/(day boat|small|starter)/i.test(text)) {
    maxSize = 40;
  }
  return {
    guests: guests ? Number(guests[1]) : undefined,
    minSize,
    maxSize,
    maxPrice: maxPrice ? Number((maxPrice[1] || maxPrice[2]).replace(/,/g, '')) : undefined,
    jacuzzi: jacuzzi || undefined,
    jetski: jetski || undefined,
    query: undefined as string | undefined,
    area: text,
  };
}

export function mockReply(userText: string, whatsappNumber: string): string {
  const es = looksSpanish(userText);
  const lower = userText.toLowerCase();

  if (/book|reserv|human|concierge|hablar|persona|agente|contact/i.test(lower) && !/how does|cómo funciona|how do i/i.test(lower)) {
    if (es) {
      return 'Con gusto. Un request en el sitio no es una reserva confirmada: nuestro concierge verifica disponibilidad y la tarifa final con el operador, y te escribe antes de que te comprometas. Empieza aquí: #booking. También puedes escribir a concierge@latitude25.us.';
    }
    return 'Gladly. A request on the site is an inquiry, not a confirmed reservation. Your concierge checks availability and the final rate, then writes to you before you commit. Start here: #booking. You may also email concierge@latitude25.us.';
  }

  if (/how (does|do)|process|work|pago|pay|fee|precio|price|include|disponib|available|guest|capacity|capacidad/i.test(lower) && !/\d+\s*(ft|foot|guest)/i.test(lower)) {
    if (/pay|pago|fee|online|price|precio|rate|tarifa|include|incluye/i.test(lower)) {
      return es
        ? 'No hay tarifas por navegar ni por enviar un request. El sitio no cobra en línea; el pago se coordina después de la confirmación, fuera de la web, con el concierge. Las tarifas publicadas son tarifas de partida para fines de semana de 4, 6 y 8 horas, y pueden variar por día, combustible, propina y extras.'
        : 'There are no browsing or request fees. The site does not take payment online; payment is arranged after confirmation, off-site, with the concierge. Listed rates are starting weekend rates for 4, 6 and 8 hours, and may change with date, fuel, gratuity and extras.';
    }
    if (/available|disponib|date/i.test(lower)) {
      return es
        ? 'Las fichas no son disponibilidad en vivo. Confirmamos tu fecha con el operador después del inquiry. Si ese yate no está libre, proponemos una fecha cercana o un barco comparable en la misma zona y eslora.'
        : 'Listings are not live availability. We verify your date after you inquire. If that yacht is taken, we can offer a nearby date or a comparable vessel in the same area and size class.';
    }
    if (/guest|capacit|cuántos|cuantos/i.test(lower)) {
      return es
        ? 'Los cupos que ves son una estimación editorial según la eslora, no un certificado USCG. El concierge confirma la capacidad exacta al reservar.'
        : 'Guest counts shown are an editorial estimate based on length, not a USCG certificate. Your concierge confirms exact capacity when booking.';
    }
    return es
      ? 'El flujo es simple: eliges un yate (o nos pides recomendación), envías un request con fecha, duración y grupo, y el concierge confirma con el operador. Recibes confirmación por escrito antes de comprometerte. Empieza en [Request a charter](#booking) o lee [How it works](#how).'
      : 'The path is simple: choose a yacht (or ask us to match you), send a request with date, duration and party size, and your concierge confirms availability. You receive written confirmation before you commit. Start at [Request a charter](#booking) or see [How it works](#how).';
  }

  const parsed = parseSearch(userText);
  const hasSearchIntent = /yacht|yate|boat|barco|ft|foot|guest|miami|lauderdale|brickell|beach|jacuzzi|jet/i.test(lower);
  if (hasSearchIntent) {
    const found = searchYachts({
      area: parsed.area,
      guests: parsed.guests,
      minSize: parsed.minSize,
      maxSize: parsed.maxSize,
      maxPrice: parsed.maxPrice,
      jacuzzi: parsed.jacuzzi,
      jetski: parsed.jetski,
      limit: 3,
    });
    if (found.length) {
      const lines = found.slice(0, 3).map((y) => {
        const shortName = y.name.replace(/^\d+['"]\s*/, '');
        const rate = y.prices['4h'] ? `$${y.prices['4h'].toLocaleString()} / 4h listed` : 'rate on request';
        return `- [${y.size} ft ${shortName}](#vessel/${y.id}) · ${y.area} · about ${y.capacity ?? '?'} guests · **${rate}**`;
      });
      const disclaimer = es
        ? 'Estas son tarifas de fin de semana publicadas, no un precio confirmado ni disponibilidad. Si alguna te encaja, envía un [request](#booking) y lo revisamos con el operador.'
        : 'These are listed weekend estimates — not confirmed pricing or availability. If one of these suits, send a [charter request](#booking) and we will verify availability for you.';
      const intro = es
        ? 'Algunas opciones de la flota que encajan con lo que describes:'
        : 'A few listings from the fleet that match what you described:';
      return `${intro}\n${lines.join('\n')}\n\n${disclaimer}`;
    }
    return es
      ? 'No encuentro un listado que coincida con ese filtro exacto. Cuéntame zona, eslora o número de invitados, o deja que el concierge te ayude en #booking.'
      : 'I do not see a listing that matches that exact filter. Share an area, length, or guest count, or let the concierge match you at #booking.';
  }

  if (whatsappNumber) {
    const href = `https://wa.me/${whatsappNumber}`;
    return es
      ? `Puedo ayudarte con la flota, tarifas publicadas y cómo funciona un request. Pregunta por zona, eslora o invitados, o empieza un request en #booking. También puedes [escribirnos por WhatsApp](${href}).`
      : `I can help with the fleet, listed rates, and how a charter request works. Ask about area, length or guest count, or start a request at #booking. You can also [message us on WhatsApp](${href}).`;
  }

  return es
    ? 'Puedo ayudarte con la flota, tarifas publicadas y cómo funciona un request. Pregunta por zona, eslora o invitados, o empieza un request en #booking.'
    : 'I can help with the fleet, listed rates, and how a charter request works. Ask about area, length or guest count, or start a request at #booking.';
}

export function streamTextChunks(text: string, chunkSize = 24): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (let i = 0; i < text.length; i += chunkSize) {
        controller.enqueue(text.slice(i, i + chunkSize));
      }
      controller.close();
    },
  });
}
