import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "@repo/db";

export interface CustomRequest extends Request {
  user?: {
    email: string;
    id: string;
    username: string;
  };
}

interface payload extends JwtPayload {
  email: string;
  id: string;
  username: string;
}

export const token = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  console.log("Token");
  try {
    console.log("Token", req.header("Authorization"));
    const header = req.header("Authorization");

    if (!header) {
      res.status(401).send("No header");
      return;
    }

    const token = header!.split(" ")[1];

    if (!token) {
      res.status(401).send("Access Denied");
      return;
    }

    const jwtPassword = process.env.JWT_SECRET;

    console.log(jwtPassword);

    if (!jwtPassword) {
      res.status(401).send("Env Fail");
      return;
    }

    const verified = jwt.verify(token, jwtPassword) as payload;

    console.log(verified);

    if (!verified) {
      res.status(401).send("Invalid Token");
      return;
    }

    console.log(verified);

    const user = prisma.user.findUnique({
      where: {
        id: verified.id,
        email: verified.email,
      },
    });

    if (!user) {
      res.status(401).send("User not found");
      return;
    }

    req.user = {
      email: verified.email,
      id: verified.id,
      username: verified.username,
    };

    next();
  } catch (err) {
    res.status(400).send("Invalid Token");
    return;
  }
};
