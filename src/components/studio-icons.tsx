import type { ComponentType, SVGProps } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ArrowsRightLeftIcon,
  BookmarkIcon,
  CameraIcon,
  CheckIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LinkIcon as HeroLinkIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  Square3Stack3DIcon,
  UserCircleIcon,
  VideoCameraSlashIcon,
  ViewfinderCircleIcon,
  WalletIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

// Keep the existing size API while using Heroicons' 24px outline family.
function sizedIcon(Icon: ComponentType<SVGProps<SVGSVGElement>>) {
  return function StudioIcon({ size = 24, ...props }: IconProps) {
    return <Icon width={size} height={size} {...props} />;
  };
}

export const ArrowDown = sizedIcon(ArrowDownIcon);
export const ArrowLeft = sizedIcon(ArrowLeftIcon);
export const ArrowRight = sizedIcon(ArrowRightIcon);
export const ArrowUpRight = sizedIcon(ArrowUpRightIcon);
export const RefreshCw = sizedIcon(ArrowPathIcon);
export const ScanLine = sizedIcon(ViewfinderCircleIcon);
export const Search = sizedIcon(MagnifyingGlassIcon);
export const SlidersHorizontal = sizedIcon(AdjustmentsHorizontalIcon);
export const X = sizedIcon(XMarkIcon);
export const Barcode = sizedIcon(QrCodeIcon);
export const Camera = sizedIcon(CameraIcon);
export const CameraOff = sizedIcon(VideoCameraSlashIcon);
export const Check = sizedIcon(CheckIcon);
export const LinkSymbol = sizedIcon(HeroLinkIcon);
export const LockKeyhole = sizedIcon(LockClosedIcon);
export const ReceiptText = sizedIcon(DocumentTextIcon);
export const ShieldCheck = sizedIcon(ShieldCheckIcon);
export const SwitchCamera = sizedIcon(ArrowsRightLeftIcon);
export const Upload = sizedIcon(ArrowUpTrayIcon);
export const Layers3 = sizedIcon(Square3Stack3DIcon);
export const Bookmark = sizedIcon(BookmarkIcon);
export const Compass = sizedIcon(GlobeAltIcon);
export const WalletCards = sizedIcon(WalletIcon);
export const CircleUserRound = sizedIcon(UserCircleIcon);
