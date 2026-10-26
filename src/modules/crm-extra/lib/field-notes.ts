export const NOTE_TYPES = [
  { id: 'whatsapp', label: 'WhatsApp' }, { id: 'call', label: 'Phone call' }, { id: 'meeting', label: 'Meeting' },
  { id: 'email', label: 'Email / SMS' }, { id: 'note', label: 'General note' },
] as const;
export function whatsappNumber(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '61' + d.slice(1);
  return d;
}
/** Mobile timeline needs formatting only: no attributes, links, images or active HTML. */
export function noteDisplayHtml(body: string) {
  return body.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, tag => {
    const m = /^<\s*(\/?)\s*(p|br|strong|b|em|i|u|ul|ol|li|blockquote)\b[^>]*>$/i.exec(tag);
    return m ? `<${m[1]}${m[2].toLowerCase()}>` : '';
  });
}
