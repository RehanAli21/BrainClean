import { getDeviceManufacturer } from '@/modules/blocker';

// Manufacturers known to enforce app-kill policies beyond standard Doze.
// On these devices, the BlockerService is killed within ~60 sec of going to
// background unless the user manually enables AutoStart / Background activity.
// There is no public Android API to query or toggle this — we can only
// deep-link the user to the OEM's settings screen.
const AGGRESSIVE_OEMS = [
  'infinix',
  'tecno',
  'itel',
  'transsion',
  'xiaomi',
  'redmi',
  'poco',
  'oppo',
  'realme',
  'vivo',
  'iqoo',
  'huawei',
  'honor',
];

export function useOemAutoStart() {
  let manufacturer = '';
  try {
    manufacturer = getDeviceManufacturer();
  } catch {
    manufacturer = '';
  }
  const requiresAutoStart = AGGRESSIVE_OEMS.some((oem) => manufacturer.includes(oem));
  return { manufacturer, requiresAutoStart };
}
