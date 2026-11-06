'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { PopularServices, RecentRequests } from '@/components/home/DemandSections';
import { Faq } from '@/components/home/Faq';
import { ForProviders } from '@/components/home/ForProviders';
import { HomeHero } from '@/components/home/HomeHero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Showcase } from '@/components/home/Showcase';
import { useAuthStore } from '@/store/auth-store';

export default function HomePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'PRESTADOR') router.push('/painel');
  }, [user, router]);

  if (user?.role === 'PRESTADOR') return null;

  return (
    <>
      <HomeHero />
      <CategoryGrid />
      <PopularServices />
      <Showcase />
      <RecentRequests />
      <HowItWorks />
      <ForProviders />
      <Faq />
    </>
  );
}
