import { Award, Medal, Trophy } from "lucide-react";

export const getBadgeTier = (category = "") => {
  const cat = category.toLowerCase();
  if (cat.includes("engagement") || cat.includes("speed")) {
    return {
      bg: "from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20",
      border: "border-amber-200/70 dark:border-amber-700/50",
      iconContainer: "from-amber-400 to-yellow-600",
      text: "text-amber-800 dark:text-amber-200",
      categoryText: "text-amber-600 dark:text-amber-300",
      Icon: Trophy,
    };
  }
  if (cat.includes("performance") || cat.includes("milestone")) {
    return {
      bg: "from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30",
      border: "border-slate-200/70 dark:border-slate-700/50",
      iconContainer: "from-slate-300 to-slate-500",
      text: "text-slate-800 dark:text-slate-200",
      categoryText: "text-slate-600 dark:text-slate-300",
      Icon: Medal,
    };
  }
  return {
    bg: "from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/30 dark:to-purple-900/30",
    border: "border-indigo-200/70 dark:border-indigo-700/50",
    iconContainer: "from-indigo-400 to-purple-500",
    text: "text-indigo-900 dark:text-indigo-200",
    categoryText: "text-indigo-600 dark:text-indigo-300",
    Icon: Award,
  };
};