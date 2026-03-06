export type CohostUser = {
  userId: string;
  firstName: string;
  lastName: string;
  email:string;
  addedAt: Date;
  isMicMuted?: boolean;
};
