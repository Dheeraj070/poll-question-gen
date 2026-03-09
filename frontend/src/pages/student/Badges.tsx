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
                      key={badge._id}
                      className="group relative flex flex-col items-center justify-center p-5 rounded-2xl border bg-slate-100/70 border-slate-200 opacity-75"
                    >
                      <div className="relative mb-3">
                        <div className={`flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br ${tier.iconContainer} grayscale`}>
                          <Icon className={`w-7 h-7 ${tier.iconColor}`} />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-gray-100">
                          <Lock className="w-3 h-3 text-slate-500" />
                        </div>
                      </div>

                      <span className="text-sm font-bold text-center leading-tight mb-1 text-slate-700">
                        {badge.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-500">
                        {badge.category}
                      </span>

                      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                        {badge.criteria || "Complete more polls to unlock this badge."}
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
