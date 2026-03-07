import { Award, Star, Zap, CheckCircle, ShieldCheck, CakeSlice } from "lucide-react";

export const getBadgeTier = (category = "", name = "") => {
  const cat = category.toLowerCase();
  const title = (name || "").toLowerCase();

  // pick an icon based on keywords in the badge name; fall back to a generic shape
  let Icon = Award;
  if (title.includes("first")) {
    Icon = Star;
  } else if (title.includes("quick")) {
    Icon = Zap;
  } else if (title.includes("correct")) {
    Icon = CheckCircle;
  } else if (title.includes("accuracy")) {
    Icon = ShieldCheck;
  } else if (title.includes("question") || title.includes("questions")) {
    Icon = CakeSlice;
  }

  // each category gets its own distinct colour palette/style
  if (cat === "engagement") {
    const text = "text-amber-800 dark:text-amber-200";
    return {
      bg: "from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20",
      border: "border-amber-200/70 dark:border-amber-700/50",
      iconContainer: "from-amber-400 to-yellow-600",
      text,
      categoryText: "text-amber-600 dark:text-amber-300",
      iconColor: text,
      Icon,
    };
  }

  if (cat === "speed") {
    const text = "text-emerald-800 dark:text-emerald-200";
    return {
      bg: "from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20",
      border: "border-emerald-200/70 dark:border-emerald-700/50",
      iconContainer: "from-emerald-400 to-green-600",
      text,
      categoryText: "text-emerald-600 dark:text-emerald-300",
      iconColor: text,
      Icon,
    };
  }

  if (cat === "performance") {
    const text = "text-violet-800 dark:text-violet-200";
    return {
      bg: "from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20",
      border: "border-violet-200/70 dark:border-violet-700/50",
      iconContainer: "from-violet-400 to-purple-600",
      text,
      categoryText: "text-violet-600 dark:text-violet-300",
      iconColor: text,
      Icon,
    };
  }

  if (cat === "milestone") {
    const text = "text-blue-800 dark:text-blue-200";
    return {
      bg: "from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20",
      border: "border-blue-200/70 dark:border-blue-700/50",
      iconContainer: "from-blue-400 to-indigo-600",
      text,
      categoryText: "text-blue-600 dark:text-blue-300",
      iconColor: text,
      Icon,
    };
  }

  // fallback 
  const text = "text-indigo-900 dark:text-indigo-200";
  return {
    bg: "from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/30 dark:to-purple-900/30",
    border: "border-indigo-200/70 dark:border-indigo-700/50",
    iconContainer: "from-indigo-400 to-purple-500",
    text,
    categoryText: "text-indigo-600 dark:text-indigo-300",
    iconColor: text,
    Icon,
  };
};