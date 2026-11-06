'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buildSearchUrl } from '@/components/SearchBar';
import { HERO_IMAGES } from '@/lib/images';
import { useCityStore } from '@/store/city-store';
import { HeroSearch } from './HeroSearch';

export const QUICK_CHIPS = ['Eletricista', 'Diarista', 'Encanador', 'Ar-condicionado', 'Conserto de celular', 'Frete'];

export function HomeHero() {
  const city = useCityStore((s) => s.city);
  const hasMosaic = HERO_IMAGES.length >= 3;

  return (
    <section className="bg-brand-dark text-on-brand-dark">
      <div
        className={`mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 md:py-16 ${
          hasMosaic ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''
        }`}
      >
        <div className={hasMosaic ? 'min-w-0' : 'mx-auto w-full min-w-0 max-w-3xl text-center'}>
          <h1 className="text-[2rem] font-bold leading-tight tracking-tight md:text-display">
            Encontre o profissional certo, perto de você
          </h1>
          <p className="mt-3 text-base text-on-brand-dark/80 md:text-lg">
            Receba propostas grátis e converse pelo chat antes de contratar.
          </p>

          <div className="mt-6 text-left">
            <HeroSearch />
          </div>

          <div className={`mt-4 flex flex-wrap gap-2 ${hasMosaic ? '' : 'justify-center'}`}>
            {QUICK_CHIPS.map((chip) => (
              <Link
                key={chip}
                href={buildSearchUrl(chip, city)}
                className="flex min-h-11 items-center rounded-pill border border-white/25 px-4 text-sm font-medium transition-colors duration-150 hover:bg-white/10"
              >
                {chip}
              </Link>
            ))}
          </div>

          <p className="mt-5 text-sm text-on-brand-dark/80">
            Não achou?{' '}
            <Link href="/solicitar" className="inline-flex items-center gap-1 font-semibold text-on-brand-dark underline underline-offset-2">
              Publique seu pedido e receba propostas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>
        </div>

        {hasMosaic && (
          <div aria-hidden="true" className="hidden grid-cols-2 gap-3 lg:grid">
            {HERO_IMAGES.slice(0, 4).map((image, index) => (
              <div
                key={image.src}
                className={`relative aspect-[4/5] overflow-hidden rounded-card ${index % 2 === 1 ? 'translate-y-6' : ''}`}
              >
                <Image src={image.src} alt="" fill sizes="20vw" priority={index === 0} className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
