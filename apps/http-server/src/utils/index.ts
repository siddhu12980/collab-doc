import e, { Request, Response } from "express";
import prisma from "@repo/db";
import { createJwtTOken } from "../helper";
import { CustomRequest } from "../middelware/token";

enum EDIT_TYPE {
  INSERT = "INSERT",
  DELETE = "DELETE",
}

export async function Signin(req: Request, res: Response) {
  console.log("Signin");
  try {
    const body = req.body

    const { email, password } = body;

    if (!email || !password) {
      console.log("Email and password are required");
      res.status(399).send("Email and password are required");
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      console.log("User not found");
      res.status(403).send("User not found");
      return;
    }

    if (user.password !== password) {
      console.log("Invalid password");
      res.status(400).send("Invalid password");
      return;
    }

    console.log("User found");

    const token = await createJwtTOken({
      email: user.email,
      id: user.id,
      username: user.username,
    });

    console.log("Token created", token);

    if (!token) {
      res.status(500).send("Token not created");
      return;
    }

    res.status(200).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(499).send("Internal server error");
  }
}

export async function Signup(req: Request, res: Response) {
  console.log("Signup");
  try {
    const body = req.body;

    const { email, password, username } = body;

    if (!email || !password) {
      res.status(400).send("Email and password are required");
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password,
        username,
      },
    });

    if (!user) {
      res.status(500).send("User not created");
      return;
    }

    const token = await createJwtTOken({
      email: user.email,
      id: user.id,
      username: user.username,
    });

    if (!token) {
      res.status(500).send("Internal server error");
      return;
    }

    res.status(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).send("Internal server error");
  }
}

export async function CreateSheet(req: CustomRequest, res: Response) {
  try {
    console.log("CreateSheet");

    const body = req.body;

    const user = req.user;

    if (!user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const { title } = body;

    const content = "";

    if (!title) {
      res.status(400).send("Title  is required");
      return;
    }

    const sheet = await prisma.sheet.create({
      data: {
        title,
        content,
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    res.status(201).send({
      message: "Sheet created",
      doc: sheet,
    });
  } catch (error) {
    res.status(500).send("Internal server error");
  }
}

export async function CreateSheetEvent(req: CustomRequest, res: Response) {
  try {
    const body = req.body;

    const user = req.user;

    if (!user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const {
      sheetId,
      column,
      line,
      editType,
      content,
    }: {
      sheetId: string;
      column: number;
      line: number;
      editType: EDIT_TYPE;
      content: string;
    } = body;

    if (!sheetId || !column || !line || !editType) {
      res.status(400).send("Sheet id, column, line and edit type are required");
      return;
    }

    const event = prisma.event.create({
      data: {
        column,
        line,
        content,
        editType,
        sheet: {
          connect: {
            id: sheetId,
          },
        },
      },
    });

    res.status(201).send(event);
  } catch (error) {
    res.status(500).send("Internal server error");
  }
}

export async function getSheetEvent(req: Request, res: Response) {
  try {
    const sheetId = req.query.id as string;

    if (!sheetId) {
      res.status(400).send("Sheet id is required");
      return;
    }

    const events = await prisma.event.findMany({
      where: {
        sheetId,
      },
    });

    res.status(200).send(events);
  } catch (error) {
    res.status(500).send("Internal server error");
    return;
  }
}

export async function getSheet(req: Request, res: Response) {
  try {
    const sheetId = req.params.id;

    if (!sheetId) {
      res.status(400).send("Sheet id is required");
      return;
    }

    const sheet = await prisma.sheet.findUnique({
      where: {
        id: sheetId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        slug: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!sheet) {
      res.status(404).send("Sheet not found");
      return;
    }

    res.status(200).send(sheet);
  } catch (error) {
    res.status(500).send("Internal server error");
    return;
  }
}

export async function deletSheet(req: Request, res: Response) {
  try {
    const sheetId = req.params.id;

    if (!sheetId) {
      res.status(400).send("Sheet id is required");
      return;
    }

    const sheet = await prisma.sheet.delete({
      where: {
        id: sheetId,
      },
    });

    res.status(200).send(sheet);
  } catch (error) {
    res.status(500).send("Internal server error");
    return;
  }
}

interface UpdateSheetBody {
  title?: string;
  content?: string;
  lastUpdateId?: string;
}

export async function updateSheet(req: Request, res: Response) {
  try {
    const body = req.body;

    //parse body

    const { title, content, lastUpdateId } = body as UpdateSheetBody;

    const sheetId = req.params.id;

    if (!sheetId) {
      res.status(400).send("Sheet id is required");
      return;
    }

    const sheet = await prisma.sheet.update({
      where: {
        id: sheetId,
      },
      data: {
        ...body,
      },
    });

    res.status(200).send(sheet);
  } catch (error) {
    res.status(500).send("Internal server error");
    return;
  }
}

export async function getAllSheet(
  req: CustomRequest,
  res: Response
): Promise<void> {
  console.log("getAllSheet");
  try {
    const user = req.user;

    if (!user || !user.id) {
      res.status(401).send("Unauthorized");
      return;
    }

    const sheets = await prisma.sheet.findMany({
      where: {
        userId: user.id,
      },
    });

    res.status(200).send(sheets);
  } catch (error) {
    res.status(500).send("Internal server error");
    return;
  }
}

export async function joinSheet(req: CustomRequest, res: Response) {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const sheetId = req.query.code as string;

    if (!sheetId) {
      res.status(400).send("Sheet id is required");
      return;
    }

    const sheet = await prisma.sheet.findUnique({
      where: {
        slug: sheetId,
      },
    });

    if (!sheet) {
      res.status(404).send("Sheet not found");
      return;
    }

    res.status(200).send(sheet);
  } catch (error) {
    res.status(500).send("Internal server error");
    return;
  }
}
