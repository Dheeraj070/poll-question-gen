import { useCallback, useEffect, useState } from "react";
import BadgeCard from "./BadgeCard";
import { useAuthStore } from "@/lib/store/auth-store";
import api from "@/lib/api/api";
import { ShieldCheck, Star } from "lucide-react";

const Badges = () => {

  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuthStore();

  const getUserBadges = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/livequizzes/rooms/achievement/${currentUser?.uid}`);
      setBadges(res.data || []);
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
          <p className="text-2xl font-bold text-indigo-600">{badges.length}</p>
        </div>
      </div>

      {/* Grid Container */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : badges.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {badges.map((b: any) => (
            <BadgeCard key={b._id} badge={b} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Star className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No achievements yet.</p>
        </div>
      )}
    </section>

  )
}

export default Badges