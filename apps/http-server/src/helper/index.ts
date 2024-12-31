import jwt from "jsonwebtoken";

export async function createJwtTOken(payload: {
  email: string;
  id: string;
  username: string;
}) {
  const tokenSecret = process.env.JWT_SECRET;

  if (!tokenSecret) {
    console.log("JWT_SECRET is not defined");
    throw new Error("JWT_SECRET is not defined");
  }

  const token = await jwt.sign(payload, tokenSecret, { expiresIn: "1d" });

  return token;
}
