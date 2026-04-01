// WhatsApp utility - opens wa.me links to send real WhatsApp messages

export const formatPhoneForWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('0')) cleaned = `255${cleaned.slice(1)}`;
  if (cleaned.length === 9) cleaned = `255${cleaned}`;
  return cleaned;
};

export const openWhatsApp = (phone: string, message: string) => {
  const formatted = formatPhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${formatted}?text=${encoded}`, '_blank');
};

export const buildReceiptMessage = (sale: {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method?: string | null;
}, items: Array<{ name: string; quantity: number; unit_price: number; subtotal: number }>, businessName?: string): string => {
  let msg = `🧾 *RISITI YA MAUZO*\n`;
  if (businessName) msg += `🏪 ${businessName}\n`;
  msg += `📅 Tarehe: ${new Date(sale.created_at).toLocaleDateString('sw-TZ')}\n`;
  msg += `🔢 Namba: ${sale.id.slice(0, 8).toUpperCase()}\n\n`;
  msg += `📦 *BIDHAA:*\n`;
  items.forEach(item => {
    msg += `• ${item.name}\n`;
    msg += `  ${item.quantity} × TSh ${item.unit_price.toLocaleString()} = TSh ${item.subtotal.toLocaleString()}\n`;
  });
  msg += `\n💰 *JUMLA: TSh ${sale.total_amount.toLocaleString()}*\n`;
  msg += `💳 Malipo: ${sale.payment_method || 'Taslimu'}\n\n`;
  msg += `Asante kwa kununua! 🙏\nKaribu tena! 😊`;
  return msg;
};

export const buildDebtReminderMessage = (customerName: string, amount: number, businessName?: string): string => {
  let msg = `🔔 *UKUMBUSHO WA DENI*\n\n`;
  msg += `Habari ${customerName},\n\n`;
  msg += `Tunakukumbusha kuwa una deni la *TSh ${amount.toLocaleString()}*`;
  if (businessName) msg += ` kwenye ${businessName}`;
  msg += `.\n\n`;
  msg += `Tafadhali fanya malipo haraka iwezekanavyo.\n\n`;
  msg += `Asante! 🙏`;
  return msg;
};

export const buildOrderUpdateMessage = (trackingCode: string, status: string, customerName?: string): string => {
  const statusMap: Record<string, string> = {
    'new': '📥 Oda imepokelewa',
    'confirmed': '✅ Oda imethibitishwa',
    'processing': '⚙️ Oda inatengenezwa',
    'shipped': '🚚 Oda imetumwa',
    'delivered': '📦 Oda imefika',
    'cancelled': '❌ Oda imefutwa',
  };

  let msg = `📋 *HALI YA ODA*\n\n`;
  if (customerName) msg += `Habari ${customerName},\n\n`;
  msg += `Namba ya kufuatilia: *${trackingCode}*\n`;
  msg += `Hali: ${statusMap[status] || status}\n\n`;
  msg += `Asante kwa kununua! 🙏`;
  return msg;
};

export const buildBulkMessage = (message: string, businessName?: string): string => {
  let msg = '';
  if (businessName) msg += `🏪 *${businessName}*\n\n`;
  msg += message;
  return msg;
};
