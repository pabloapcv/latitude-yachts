export const SITE_KNOWLEDGE = `
Latitude °25 (latitude25.us) is a concierge referral service for recreational yacht and boat charters in South Florida. It is not a yacht owner, not a charter operator, and not a U.S. Coast Guard–licensed captain. Every listed vessel is owned and operated by an independent third-party Operator.

Coverage: Miami Beach, Downtown Miami & Brickell, Key Biscayne, Fort Lauderdale, Coconut Grove, North Miami / Aventura, Boca Raton / Palm Beach, and the greater Miami area.

How booking works:
1. Browse and optionally save yachts (filter by area, size, amenities).
2. Submit a request-to-book inquiry with date, duration (4 / 6 / 8 hours), and party size. This is an inquiry, not a confirmed reservation. No online payment.
3. The concierge team checks availability and final pricing with the operator, then sends written confirmation before the guest commits.
4. Guest boards at the listed location; the operator and crew run the charter.

Pricing:
- Prices shown are operator-set weekend rates for 4, 6, and 8-hour charters, and are estimates only.
- Final pricing may change for weekday, holiday, fuel, gratuity, and extras. The concierge confirms before the guest commits.
- No browsing or request fees.
- The site does not process payments. Payment is arranged after confirmation, off-site, with the concierge or operator.

Availability:
- Listings are not live availability. Dates are checked with the operator after an inquiry.
- If a preferred yacht is unavailable, the concierge can offer a nearby date or a comparable vessel in the same area and size class.

Capacity:
- Guest counts are editorial estimates based on vessel length, not official USCG passenger certificates. Exact capacity is confirmed when booking.

Contact:
- Booking request flow on the site: #booking (or Request a charter).
- Contact form: #contact. Email concierge@latitude25.us.
- For a specific vessel it is faster to open that listing and use Request this yacht.
- Instagram: @lati.tude25

Legal notes the concierge may paraphrase, never contradict:
- Submitting a request is not a confirmed reservation.
- Latitude 25 is not a party to the charter and is not liable for the operator’s vessel, crew, or the charter itself.
`.trim();

export function whatsappGuidance(number: string): string {
  if (!number) {
    return 'WhatsApp is not available yet. Never mention WhatsApp, wa.me, or texting a phone number. Direct people who want a human to the booking request form (#booking) or the contact form (#contact), and mention concierge@latitude25.us.';
  }
  const href = `https://wa.me/${number}?text=${encodeURIComponent("Hi Latitude °25, I'd like help planning a yacht charter.")}`;
  return `WhatsApp is available. When a guest wants a human, to book, or you cannot answer from site content, include this markdown link exactly once: [Message us on WhatsApp](${href}). Still also point them to the booking request form (#booking).`;
}
