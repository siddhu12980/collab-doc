import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";

import {
  CreateSheet,
  deletSheet,
  getAllSheet,
  getSheet,
  getSheetEvent,
  joinSheet,
  Signin,
  Signup,
  updateSheet,
} from "./utils ";
import { token } from "./middelware/token";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
  return;
});

app.post("/auth/signin", Signin);

app.post("/auth/signup", Signup);

app.get("/join", token, joinSheet);

app.get("/docs/all", token, getAllSheet);
app.post("/docs", token, CreateSheet);

app.get("/docs/:id", token, getSheet);

app.delete("/docs/:id", token, deletSheet);
app.put("/docs/:id", token, updateSheet);

app.get("/sheet/event", getSheetEvent);

app.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});
