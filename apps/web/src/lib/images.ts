import manifest from './image-manifest.json';

export interface SiteImage {
  src: string;
  alt: string;
}

/**
 * Fotos ilustrativas de banco de imagens, geradas por scripts/download-images.mjs.
 * Nunca usar como foto de prestador nem associadas a nomes ou notas.
 */
export const HERO_IMAGES: SiteImage[] = manifest.hero;

export function categoryImage(slug: string): SiteImage | undefined {
  return (manifest.categories as Record<string, SiteImage>)[slug];
}

export const HAS_IMAGE_CREDITS = HERO_IMAGES.length > 0 || Object.keys(manifest.categories).length > 0;
