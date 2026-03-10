import { useCallback, useEffect, useState } from "react";
import BadgeCard from "./BadgeCard";
import { useAuthStore } from "@/lib/store/auth-store";
import api from "@/lib/api/api";
import { Lock, ShieldCheck, Star } from "lucide-react";
import type { Badge, UserAchievement } from "@/shared/types";
import { getBadgeTier } from "@/shared/getBadgeTier";

type BadgeResponse = {
  achievedBadges: UserAchievement[];
  unachievedBadges: Badge[];
};

const Badges = () => {

  const [achievedBadges, setAchievedBadges] = useState<UserAchievement[]>([]);
  const [unachievedBadges, setUnachievedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuthStore();

  const getUserBadges = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get<BadgeResponse>(`/livequizzes/rooms/achievement/${currentUser?.uid}`);
      setAchievedBadges(res.data?.achievedBadges || []);
      setUnachievedBadges(res.data?.unachievedBadges || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false)
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    getUserBadges();
  }, [getUserBadges]);

  return (
    <section className="p-6 bg-gray-50 rounded-3xl min-h-[400px]">
      {/* Header Section */}
      <div className="flex items-end justify-between mb-8 px-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Rewards</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Achievements
          </h2>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-gray-500">Total Earned</span>
          <p className="text-2xl text-center font-bold text-indigo-600">{achievedBadges.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-800">Earned Badges</h3>
            </div>

            {achievedBadges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {achievedBadges.map((badge) => (
                  <BadgeCard key={badge._id} badge={badge} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <Star className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No earned badges yet.</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-slate-600" />
              <h3 className="text-lg font-bold text-gray-800">Unearned Badges</h3>
            </div>

            {unachievedBadges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {unachievedBadges.map((badge) => {
                  const tier = getBadgeTier(badge.category, badge.name);
                  const Icon = tier.Icon;
                  return (
                    <div
                      className={`group relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-default overflow-hidden bg-slate-100/70 border-slate-200 opacity-75`}
                    >
                      {/* Decorative background glow on hover */}
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10 shadow-sm" />

                      {/* Primary Content Container (fades out slightly on hover to focus on criteria) */}
                      <div className="flex flex-col items-center transition-all duration-300 group-hover:opacity-0 group-hover:scale-90">
                        {/* Icon Wrapper with Ring Effect */}
                        <div className="relative mb-3">
                          <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transform transition-transform duration-300 ${tier.iconContainer} grayscale`}>
                            <Icon className={`w-7 h-7 ${tier.iconColor}`} />
                          </div>
                          {/* Lock Indicator */}
                          <div className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-gray-100">
                            <Lock className="w-3 h-3 text-slate-500" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-center leading-tight mb-1 text-slate-700">
                            {badge.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-500">
                              {badge.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Hover Criteria Overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
                        <p className="text-[11px] font-medium leading-relaxed text-slate-700">
                          {badge.criteria || "Complete more polls to unlock this badge."}
                        </p>
                        <div className="mt-2 w-8 h-0.5 rounded-full opacity-30 bg-slate-500" />
                      </div>

                      {/* Progress Bar (at bottom) - optional for unearned */}
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 overflow-hidden">
                        <div className="h-full opacity-30 w-0 bg-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl border-2 border-dashed border-emerald-200">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-emerald-600 font-semibold">All badges unlocked.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>

  )
}

export default Badges
