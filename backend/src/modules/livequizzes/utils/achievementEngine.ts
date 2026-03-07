import Badge from "#root/shared/database/models/Badge.js";
import UserAchievement from "#root/shared/database/models/UserAchievement.js";
import { checkRule } from "./ruleEvaluator.js";


export async function evaluateBadges(userId:string, roomCode:string, stats){

  const badges = await Badge.find();

  for(const badge of badges){

    const alreadyEarned = await UserAchievement.findOne({
      userId,
      badgeId: badge._id,
      roomCode
    });

    if(alreadyEarned) continue;

    const unlocked = checkRule(badge.rule, stats);

    if(unlocked){

      await UserAchievement.create({
        userId,
        badgeId: badge._id,
        roomCode
      });

    }

  }

}