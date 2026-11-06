import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CityState {
  city: string | null;
  setCity: (city: string | null) => void;
}

/** Última cidade escolhida: alimenta header, hero, vitrine e buscas. */
export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      city: null,
      setCity: (city) => set({ city }),
    }),
    { name: 'servicai-city' },
  ),
);
