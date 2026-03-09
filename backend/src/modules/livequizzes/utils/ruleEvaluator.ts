import { UserRoomStats } from "./achievementEngine.js";

type Rule = {
  type: string;
  threshold: number;
}

export function checkRule(rule: Rule, stats: UserRoomStats): boolean {

  switch (rule.type) {

    case "correct_streak":
      return stats.maxStreak >= rule.threshold;

    case "accuracy":
      return stats.accuracy >= rule.threshold;

    case "questions_answered":
      return stats.totalAnswers >= rule.threshold;

    case "fast_response":
      return stats.fastestResponse <= rule.threshold;

    default:
      return false;

  }

}