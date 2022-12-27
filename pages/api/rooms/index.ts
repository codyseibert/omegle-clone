// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../libs/dbConnect";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { RtmTokenBuilder, RtmRole } from "agora-access-token";
import Room from "../../../models/Room";

type Room = {
  status: String;
};

type ResponseData = Room[] | string;

function getRtmToken(userId: string) {
  const appID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERT!;
  const account = userId;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const token = RtmTokenBuilder.buildToken(
    appID,
    appCertificate,
    account,
    RtmRole.Rtm_User,
    privilegeExpiredTs
  );
  return token;
}

function getRtcToken(roomId: string, userId: string) {
  const appID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERT!;
  const channelName = roomId;
  const account = userId;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithAccount(
    appID,
    appCertificate,
    channelName,
    account,
    role,
    privilegeExpiredTs
  );

  return token;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const { method, query } = req;
  const userId = query.userId as string;

  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const rooms = await Room.aggregate([
          { $match: { status: "waiting" } },
          { $sample: { size: 1 } },
        ]);
        if (rooms.length > 0) {
          const roomId = rooms[0]._id.toString();
          await Room.findByIdAndUpdate(roomId, {
            status: "chatting",
          });
          res.status(200).json({
            rooms,
            rtcToken: getRtcToken(roomId, userId),
            rtmToken: getRtmToken(userId),
          });
        } else {
          res.status(200).json({ rooms: [], token: null });
        }
      } catch (error) {
        res.status(400).json((error as any).message);
      }
      break;
    case "POST":
      const room = await Room.create({
        status: "waiting",
      });
      res.status(200).json({
        room,
        rtcToken: getRtcToken(room._id.toString(), userId),
        rtmToken: getRtmToken(userId),
      });
      break;
    default:
      res.status(400).json("no method for this endpoint");
      break;
  }
}
