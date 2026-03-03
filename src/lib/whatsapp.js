/**
 * WhatsApp Share Utility
 * Opens WhatsApp (web or app) with a pre-filled message to the given phone number.
 */

/** Clean phone: strip spaces, dashes, parens; ensure international prefix */
export function cleanPhone(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[\s\-()]/g, '');
  // If it starts with 0 (local UAE), replace with +971
  if (p.startsWith('00')) p = '+' + p.slice(2);
  else if (p.startsWith('0')) p = '+971' + p.slice(1);
  // If no + prefix, assume it's already international digits
  if (!p.startsWith('+')) p = '+' + p;
  // Remove the + for wa.me URL (it only wants digits)
  return p.replace('+', '');
}

/** Open WhatsApp with a pre-filled message to the given phone */
export function shareViaWhatsApp(phone, message) {
  const cleaned = cleanPhone(phone);
  const encoded = encodeURIComponent(message);
  const url = cleaned
    ? `https://wa.me/${cleaned}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Build order details message */
export function buildOrderMessage(order, t, trackingUrl) {
  const lines = [];
  lines.push(`📦 *${t?.('whatsapp.order_details', 'Order Details')}*`);
  lines.push('');
  lines.push(`🔢 ${t?.('whatsapp.order_number', 'Order #')}: ${order.order_number || '—'}`);
  if (order.awb_number)
    lines.push(`📋 AWB: ${order.awb_number}`);
  lines.push(`📊 ${t?.('whatsapp.status', 'Status')}: ${(order.status || '').replace(/_/g, ' ').toUpperCase()}`);
  lines.push('');
  if (order.recipient_name)
    lines.push(`👤 ${t?.('whatsapp.recipient', 'Recipient')}: ${order.recipient_name}`);
  if (order.recipient_phone)
    lines.push(`📱 ${t?.('whatsapp.phone', 'Phone')}: ${order.recipient_phone}`);
  if (order.recipient_address || order.recipient_emirate)
    lines.push(`📍 ${t?.('whatsapp.address', 'Address')}: ${[order.recipient_address, order.recipient_emirate].filter(Boolean).join(', ')}`);
  lines.push('');
  if (order.payment_method)
    lines.push(`💳 ${t?.('whatsapp.payment', 'Payment')}: ${order.payment_method.toUpperCase()}`);
  if (order.cod_amount > 0)
    lines.push(`💰 COD: ${Number(order.cod_amount).toFixed(2)} AED`);
  if (order.total_amount > 0)
    lines.push(`💵 ${t?.('whatsapp.total', 'Total')}: ${Number(order.total_amount).toFixed(2)} AED`);
  if (order.tracking_token && trackingUrl) {
    lines.push('');
    lines.push(`🔗 ${t?.('whatsapp.track_shipment', 'Track Shipment')}:`);
    lines.push(`${trackingUrl}/track/${order.tracking_token}`);
  }
  lines.push('');
  lines.push(`— ${t?.('whatsapp.powered_by', 'Powered by Trasealla')}`);
  return lines.join('\n');
}

/** Build client credentials / portal info message */
export function buildClientMessage(client, t, portalUrl) {
  const lines = [];
  lines.push(`🏢 *${t?.('whatsapp.merchant_portal_access', 'Merchant Portal Access')}*`);
  lines.push('');
  lines.push(`👤 ${t?.('whatsapp.name', 'Name')}: ${client.full_name || '—'}`);
  if (client.company_name)
    lines.push(`🏪 ${t?.('whatsapp.company', 'Company')}: ${client.company_name}`);
  lines.push('');
  lines.push(`📧 ${t?.('whatsapp.login_email', 'Login Email')}: ${client.email || '—'}`);
  lines.push(`📱 ${t?.('whatsapp.login_phone', 'Login Phone')}: ${client.phone || '—'}`);
  if (portalUrl) {
    lines.push('');
    lines.push(`🔗 ${t?.('whatsapp.portal_link', 'Portal Link')}:`);
    lines.push(portalUrl);
  }
  lines.push('');
  lines.push(`💡 ${t?.('whatsapp.login_hint', 'Use your email or phone to log in. If you forgot your password, use the reset link on the login page.')}`);
  lines.push('');
  lines.push(`— ${t?.('whatsapp.powered_by', 'Powered by Trasealla')}`);
  return lines.join('\n');
}
