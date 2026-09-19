import { api } from './api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush() {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) throw new Error('Push não suportado neste navegador');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificação negada');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = subscription.toJSON();
  await api.post('/notifications/push-subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.post('/notifications/push-unsubscribe', { endpoint });
}
