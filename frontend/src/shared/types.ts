export type CohostUser = {
  userId: string;
  firstName: string;
  lastName: string;
  email:string;
  addedAt: Date;
  isMicMuted?: boolean;
};

export interface Badge {
  _id: string;
  name: string;
  description: string;
  icon: string;
  category: "performance" | "engagement" | "speed" | "milestone";
  criteria: string;
}

export interface UserAchievement {
  _id: string;
  badgeId: Badge;
  earnedAt: string;
}