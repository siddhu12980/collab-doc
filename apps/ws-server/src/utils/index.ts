import jwt from "jsonwebtoken";
import prisma from "@repo/db";
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

