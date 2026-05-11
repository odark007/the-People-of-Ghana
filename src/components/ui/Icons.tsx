// ─────────────────────────────────────────────────────────────────────────────
// Icons — People of Ghana
// All icons use Lucide React for consistent cross-platform rendering.
// Import from here, never use emojis in UI components.
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Navigation
  Home,
  Users,
  Rss,
  Search,
  User,
  Bell,
  LogOut,
  ArrowLeft,
  ChevronRight,
  X,
  Check,
  Plus,
  Minus,
  Settings,
  Globe,
  Info,

  // Reports / Categories
  Construction,    // road
  Droplets,        // water
  Trash2,          // sanitation
  Zap,             // electricity
  HeartPulse,      // health
  BookOpen,        // education
  Shield,          // security
  Leaf,            // environment
  MapPin,          // other / location

  // Officials / Directory
  Landmark,        // officials / governance
  UserCircle,      // person placeholder

  // Admin
  LayoutDashboard, // dashboard
  ClipboardList,   // reports list
  Scale,           // moderation
  HardDrive,       // storage
  BarChart2,       // stats

  // Actions
  Megaphone,       // report issue / submit
  Pencil,          // edit / compose
  Link,            // share
  Lock,            // privacy
  Trash,           // delete
  Upload,          // upload
  Download,        // download
  Eye,             // view
  EyeOff,          // hide
  Camera,          // photo

  // Status
  CheckCircle,     // resolved / verified
  Clock,           // pending
  HelpCircle,      // unverified / unknown
  AlertCircle,     // error / warning
  XCircle,         // rejected

  // Anonymity (abstract)
  EyeOff as AnonL1Icon,       // L1 fully anonymous
  Shuffle as AnonL2Icon,       // L2 pseudonym
  UserCheck as AnonL3Icon,     // L3 display name

  // Contact
  Phone,
  Mail,
  Building2,
  Calendar,
  Map,

  // Misc
  Image,
  Folder,
  Star,
  Flag,
  RefreshCw,
  Filter,
  SortDesc,
} from "lucide-react";

// ── Category icon map ─────────────────────────────────────────────────────────
// Use this in report cards, feed, forms instead of emoji strings

import {
  Construction,
  Droplets,
  Trash2,
  Zap,
  HeartPulse,
  BookOpen,
  Shield,
  Leaf,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export type ReportCategoryKey =
  | "road" | "water" | "sanitation" | "electricity"
  | "health" | "education" | "security" | "environment" | "other";

export const CATEGORY_ICONS: Record<ReportCategoryKey, LucideIcon> = {
  road:        Construction,
  water:       Droplets,
  sanitation:  Trash2,
  electricity: Zap,
  health:      HeartPulse,
  education:   BookOpen,
  security:    Shield,
  environment: Leaf,
  other:       MapPin,
};

export const CATEGORY_COLORS: Record<ReportCategoryKey, string> = {
  road:        "text-ghana-red   bg-ghana-red/10",
  water:       "text-blue-600    bg-blue-50",
  sanitation:  "text-amber-700   bg-amber-50",
  electricity: "text-yellow-600  bg-yellow-50",
  health:      "text-ghana-green bg-ghana-green/10",
  education:   "text-purple-600  bg-purple-50",
  security:    "text-gray-700    bg-gray-100",
  environment: "text-green-700   bg-green-50",
  other:       "text-ghana-red   bg-ghana-red/10",
};

// ── Category icon component ───────────────────────────────────────────────────

interface CategoryIconProps {
  category: ReportCategoryKey;
  size?: number;
  className?: string;
}

export function CategoryIcon({ category, size = 18, className = "" }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[category] ?? MapPin;
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  return (
    <span className={`inline-flex items-center justify-center rounded-lg p-1.5 ${colors} ${className}`}>
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}

// ── Status icon component ─────────────────────────────────────────────────────

import { CheckCircle, Clock, HelpCircle, XCircle, AlertCircle } from "lucide-react";

type StatusKey = "pending" | "published" | "in_progress" | "resolved" | "rejected" | "verified" | "unverified";

export const STATUS_ICONS: Record<StatusKey, LucideIcon> = {
  pending:    Clock,
  published:  AlertCircle,
  in_progress:RefreshCw,
  resolved:   CheckCircle,
  rejected:   XCircle,
  verified:   CheckCircle,
  unverified: HelpCircle,
};

export const STATUS_COLORS: Record<StatusKey, string> = {
  pending:     "text-amber-600",
  published:   "text-blue-600",
  in_progress: "text-ghana-gold",
  resolved:    "text-ghana-green",
  rejected:    "text-ghana-red",
  verified:    "text-ghana-green",
  unverified:  "text-gray-400",
};

import { RefreshCw } from "lucide-react";

interface StatusIconProps {
  status: StatusKey;
  size?: number;
}

export function StatusIcon({ status, size = 16 }: StatusIconProps) {
  const Icon = STATUS_ICONS[status] ?? HelpCircle;
  const color = STATUS_COLORS[status] ?? "text-gray-400";
  return <Icon size={size} className={color} strokeWidth={2} />;
}

// ── Anonymity icons ───────────────────────────────────────────────────────────

import { EyeOff, Shuffle, UserCheck } from "lucide-react";

export const ANON_ICONS = {
  L1: EyeOff,
  L2: Shuffle,
  L3: UserCheck,
} as const;

export const ANON_COLORS = {
  L1: "text-gray-400  bg-gray-100",
  L2: "text-amber-700 bg-amber-50",
  L3: "text-ghana-green bg-ghana-green/10",
} as const;

interface AnonIconProps {
  level: "L1" | "L2" | "L3";
  size?: number;
  withBackground?: boolean;
}

export function AnonIcon({ level, size = 16, withBackground = false }: AnonIconProps) {
  const Icon   = ANON_ICONS[level];
  const colors = ANON_COLORS[level];
  if (withBackground) {
    return (
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${colors}`}>
        <Icon size={size} strokeWidth={2} />
      </span>
    );
  }
  return <Icon size={size} className={colors.split(" ")[0]} strokeWidth={2} />;
}
