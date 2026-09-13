import { isHubRoute } from '@/components/nav/navLinks';

export function shouldGoHomeOnEscape(
  key: string,
  pathname: string,
  overlayOpen: boolean,
  hasModifier: boolean,
): boolean {
  return key === 'Escape' && !hasModifier && !isHubRoute(pathname) && !overlayOpen;
}
