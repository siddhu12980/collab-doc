import jwt from "jsonwebtoken";

import { MyWebSocket } from "..";

export async function decodeToken(token: string): Promise<any> {
  const key = "JWT_SECRET_PASSWORD";
  try {
    const payload = jwt.verify(token, key);
    console.log("Payload:", payload);
    return payload;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
}

export function displaySheetANdUser(sheetMap: Map<string, MyWebSocket[]>) {
  const sheet = Array.from(sheetMap.keys());
  if (sheet.length === 0) {
    console.log("No sheet found");
    return;
  }
  for (const key of sheet) {
    console.log("\n SheetId:", key);

    const user = sheetMap.get(key);

    if (!user) {
      console.log("No user found for this sheet", key);
      return;
    }

    for (const value of user) {
      console.log(
        "UserId:",
        value.userId,
        value.username || "No username",
        value.sheetId
      );
    }
  }
}

import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

export async function createConnectRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const client = await createClient({ url: redisUrl });

  await client.connect();

  if (client.isOpen) {
    redisClient = client;
    console.log("Redis client connected successfully");
  }
}

export async function reconnectRedis(): Promise<void> {
  if (!redisClient || !redisClient.isOpen) {
    console.log("Redis client is not open, reconnecting...");
    await createConnectRedis();
  } else {
    console.log("Redis client is already open.");
  }
}
export { redisClient };
