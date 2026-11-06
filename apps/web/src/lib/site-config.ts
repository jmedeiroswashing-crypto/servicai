/** Canais públicos da empresa. Redes sociais sem endereço configurado não aparecem. */
export const SUPPORT_WHATSAPP = [
  { label: '(68) 99218-6867', number: '5568992186867' },
  { label: '(68) 99226-3953', number: '5568992263953' },
];

export const SOCIAL_LINKS = [
  { label: 'Instagram', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
  { label: 'Facebook', href: process.env.NEXT_PUBLIC_FACEBOOK_URL },
  { label: 'TikTok', href: process.env.NEXT_PUBLIC_TIKTOK_URL },
].filter((link): link is { label: string; href: string } => !!link.href);

export function whatsappUrl(number: string, message = 'Olá! Preciso de ajuda com o ServiçAi.') {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const SITE_URL = 'https://servicai.vercel.app';
