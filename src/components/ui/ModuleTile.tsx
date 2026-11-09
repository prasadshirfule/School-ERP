import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  School,
  CalendarClock,
  Receipt,
  CreditCard,
  BookOpen,
  Megaphone,
  Calendar,
  FileCheck,
  UserCheck,
  CheckCircle2,
  Award,
  ClipboardList,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export type TileColor =
  | "blue"
  | "emerald"
  | "teal"
  | "amber"
  | "purple"
  | "rose"
  | "indigo"
  | "slate";

export type ModuleTileIconName =
  | "GraduationCap"
  | "Users"
  | "School"
  | "CalendarClock"
  | "Receipt"
  | "CreditCard"
  | "BookOpen"
  | "Megaphone"
  | "Calendar"
  | "FileCheck"
  | "UserCheck"
  | "CheckCircle2"
  | "Award"
  | "ClipboardList"
  | "AlertCircle"
  | "Sparkles";

const ICON_MAP: Record<ModuleTileIconName, React.ComponentType<{ size?: number; className?: string }>> = {
  GraduationCap,
  Users,
  School,
  CalendarClock,
  Receipt,
  CreditCard,
  BookOpen,
  Megaphone,
  Calendar,
  FileCheck,
  UserCheck,
  CheckCircle2,
  Award,
  ClipboardList,
  AlertCircle,
  Sparkles,
};

export type ModuleTileIcon =
  | ModuleTileIconName
  | React.ComponentType<{ size?: number; className?: string }>;

export interface ModuleTileProps {
  title: string;
  description: string;
  icon: ModuleTileIcon;
  href: string;
  colorScheme?: TileColor;
  badge?: string | number;
}

/**
 * Server Component: ModuleTile
 * Renders an institutional category tile. Accepts either a serializable
 * icon name string (recommended across Server-to-Client boundaries)
 * or a direct Lucide icon component.
 */
export default function ModuleTile({
  title,
  description,
  icon,
  href,
  colorScheme = "blue",
  badge,
}: ModuleTileProps) {
  const Icon: React.ComponentType<{ size?: number; className?: string }> =
    typeof icon === "string" ? ICON_MAP[icon] || School : icon;

  return (
    <Link
      href={href}
      className={`module-tile module-tile-${colorScheme}`}
      title={`Open ${title}`}
    >
      <div className="module-tile-header">
        <div className={`module-tile-icon-wrap module-tile-icon-${colorScheme}`}>
          <Icon size={20} />
        </div>
        <div className="module-tile-header-right">
          {badge !== undefined && (
            <span className="module-tile-badge">{badge}</span>
          )}
          <span className="module-tile-arrow">
            <ArrowUpRight size={15} />
          </span>
        </div>
      </div>

      <div className="module-tile-body">
        <h3 className="module-tile-title">{title}</h3>
        <p className="module-tile-description">{description}</p>
      </div>
    </Link>
  );
}
