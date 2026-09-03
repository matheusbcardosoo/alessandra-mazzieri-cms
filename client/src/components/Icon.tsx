import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCloudMoon,
  faMasksTheater,
  faCircleHalfStroke,
  faEyeSlash,
  faCompass,
  faHandHoldingHeart,
  faUser,
  faHeartCrack,
  faSpa,
  faHeart,
  faArrowRight,
  faCheck,
  faPlus,
  faEye,
  faSun,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { faCircle as faCircleRegular, faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faWhatsapp, faInstagram } from '@fortawesome/free-brands-svg-icons';

// Nomes exatos dos ícones Font Awesome usados na referência (reference/index.html),
// para que blocos de conteúdo (cards, botões, badges) referenciem um ícone vetorial
// pelo nome em vez de colar um emoji no texto.
export const ICON_REGISTRY: Record<string, IconDefinition> = {
  'cloud-moon': faCloudMoon,
  'masks-theater': faMasksTheater,
  'circle-half-stroke': faCircleHalfStroke,
  'eye-slash': faEyeSlash,
  compass: faCompass,
  'hand-holding-heart': faHandHoldingHeart,
  user: faUser,
  'heart-crack': faHeartCrack,
  spa: faSpa,
  heart: faHeart,
  'heart-outline': faHeartRegular,
  'arrow-right': faArrowRight,
  check: faCheck,
  plus: faPlus,
  eye: faEye,
  sun: faSun,
  star: faStar,
  'circle-outline': faCircleRegular,
  whatsapp: faWhatsapp,
  instagram: faInstagram
};

export function isRegisteredIcon(name: string | null | undefined): boolean {
  return !!name && name in ICON_REGISTRY;
}

export function Icon({ name, className }: { name: string; className?: string }) {
  const icon = ICON_REGISTRY[name];
  if (!icon) return null;
  return <FontAwesomeIcon icon={icon} className={className} aria-hidden="true" />;
}
