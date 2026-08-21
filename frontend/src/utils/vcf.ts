export interface VcfContact {
  name: string;
  phone: string;
}

/** Parseur vCard minimal : extrait FN (nom) et le premier TEL de chaque contact. */
export function parseVcf(content: string): VcfContact[] {
  const contacts: VcfContact[] = [];
  const cards = content.split(/BEGIN:VCARD/i).slice(1);

  for (const card of cards) {
    const nameMatch = card.match(/FN(?:;[^:]*)?:(.+)/i);
    const phoneMatch = card.match(/TEL(?:;[^:]*)?:([+\d().\s-]+)/i);
    const phone = phoneMatch?.[1]?.trim().replace(/[^\d+]/g, "");
    if (phone) {
      contacts.push({ name: nameMatch?.[1]?.trim() || phone, phone });
    }
  }

  return contacts;
}
