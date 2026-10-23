export const SERVICE_HUB_WHATSAPP = '255797813597';
export const SERVICE_HUB_EMAIL = 'smartshoppos795@gmail.com';
export const SERVICE_HUB_URL = 'https://kiduka.shop/servicehub';
export function serviceHubMessage(title = 'Tumerudi, tayari kukuhudumia!', description = 'Kiduka inapatikana tena. Simamia mauzo, stoo, madeni na matawi; uliza maswali au omba miadi ya kuoneshwa mfumo.') {
 return `*Kiduka · ServiceHUB*\n\n*${title}*\n${description}\n\nHuduma, picha za mfumo na bei: ${SERVICE_HUB_URL}\nWhatsApp: +255 797 813 597\nKaribu, tuijenge biashara yako pamoja!`;
}
export function hubWhatsAppLink(message: string, direct = false) { return `https://wa.me/${direct ? SERVICE_HUB_WHATSAPP : ''}?text=${encodeURIComponent(message)}`; }
export function appointmentToIso(value: string) { return value ? new Date(`${value}:00+03:00`).toISOString() : null; }
