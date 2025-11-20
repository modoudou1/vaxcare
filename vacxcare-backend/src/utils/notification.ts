import Notification from "../models/Notification";

export const createNotification = async (
  userId: string,
  message: string,
  type: string,
  refId?: string
) => {
  const notif = new Notification({
    user: userId,
    message,
    type,
    refId,
  });
  await notif.save();
  return notif;
};
