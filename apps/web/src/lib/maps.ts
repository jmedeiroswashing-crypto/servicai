import type { ProviderProfile } from './types';

export function buildProviderAddress(provider: ProviderProfile): string {
  const { user, city } = provider;
  if (user.addressStreet && user.addressNumber) {
    const cep = user.addressCep ? `, ${user.addressCep}` : '';
    const state = user.addressState ? ` - ${user.addressState}` : '';
    return `${user.addressStreet}, ${user.addressNumber}, ${city}${state}${cep}, Brasil`;
  }
  const state = user.addressState ? ` - ${user.addressState}` : '';
  return `${city}${state}, Brasil`;
}

function getCurrentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000 },
    );
  });
}

export async function openRouteToProvider(provider: ProviderProfile) {
  const destination = encodeURIComponent(buildProviderAddress(provider));
  const position = await getCurrentPosition();

  const url = position
    ? `https://www.google.com/maps/dir/?api=1&origin=${position.coords.latitude},${position.coords.longitude}&destination=${destination}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
