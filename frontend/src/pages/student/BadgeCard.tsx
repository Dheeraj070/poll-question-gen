import { getBadgeTier } from "@/shared/getBadgeTier";
import { UserAchievement } from "@/shared/types";
import { Sparkles } from "lucide-react"

interface Props {
    badge: UserAchievement;
}

export default function BadgeCard({ badge }: Props) {

    const tier = getBadgeTier(badge.badgeId?.category, badge.badgeId?.name);
    const Icon = tier.Icon;
    return (
        <div
            className={`group relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-default overflow-hidden ${tier.bg}`}
        >
            {/* Decorative background glow on hover */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 shadow-sm" />

            {/* Primary Content Container (fades out slightly on hover to focus on description) */}
            <div className="flex flex-col items-center transition-all duration-300 group-hover:opacity-0 group-hover:scale-90">
                {/* Icon Wrapper with Ring Effect */}
                <div className="relative mb-3">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transform transition-transform duration-300 ${tier.iconContainer}`}>
                        <Icon className={`w-7 h-7 ${tier.iconColor}`} />
                    </div>
                    {/* Level Indicator or Sparkle */}
                    <div className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-gray-100">
                        <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col items-center">
                    <span className={`text-sm font-bold text-center leading-tight mb-1 ${tier.text}`}>
                        {badge.badgeId?.name || "Achievement"}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 border border-current/10 ${tier.categoryText}`}>
                            {badge.badgeId?.category || "General"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Hover Description Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
                <p className={`text-[11px] font-medium leading-relaxed ${tier.text}`}>
                    {badge.badgeId?.description || "No description available."}
                </p>
                <div className={`mt-2 w-8 h-0.5 rounded-full opacity-30 ${tier.categoryText} bg-current`} />
            </div>

            {/* Progress Bar (at bottom) */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 overflow-hidden">
                <div className={`h-full opacity-30 w-full bg-current ${tier.categoryText}`} />
            </div>
        </div>
    );

}