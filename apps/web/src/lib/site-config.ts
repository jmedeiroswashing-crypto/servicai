/**
 * Canais públicos da empresa, definidos por variável de ambiente. O que não estiver
 * configurado simplesmente não aparece, para o site nunca mostrar contato inventado.
 */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? '';

export const SOCIAL_LINKS = [
  { label: 'Instagram', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL },
  { label: 'Facebook', href: process.env.NEXT_PUBLIC_FACEBOOK_URL },
  { label: 'TikTok', href: process.env.NEXT_PUBLIC_TIKTOK_URL },
].filter((link): link is { label: string; href: string } => !!link.href);

export function whatsappSupportUrl(message = 'Olá! Preciso de ajuda com o ServiçAi.') {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const SITE_URL = 'https://servicai.vercel.app';
