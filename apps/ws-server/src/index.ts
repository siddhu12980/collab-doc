import WebSocket from "ws";
import {
  decodeToken,
  displaySheetANdUser,
} from "./utils";
import { redisClient } from "./utils";

const wss = new WebSocket.Server({ port: 8081, host: "localhost" });

console.log(
  "WebSocket server started url:",
  wss.options.host,
  wss.options.port
);

let sheetMap = new Map<string, MyWebSocket[]>();

enum MESSAGE_TYPE {
  JOIN = "join",
  SERVER = "server",
  LEAVE = "leave",
  ERROR = "error",
  RESPONSE = "response",
  UPDATE = "update",
}

export interface MyWebSocket extends WebSocket {
  userId?: string;
  sheetId?: string;
  username?: string;
}

async function handleLeave(ws: MyWebSocket) {
  const sheetId = ws.sheetId;

  if (!sheetId) {
    console.log("No sheetId found for disconnecting user");
    return;
  }

  const users = sheetMap.get(sheetId);
  if (!users) {
    console.log("No users found for sheet", sheetId);
    return;
  }

  const index = users.indexOf(ws);
  if (index > -1) {
    users.splice(index, 1);
    console.log(
      `User removed from sheet ${sheetId}, remaining users: ${users.length}`
    );
  }

  if (users.length === 0) {
    console.log(`Deleting empty sheet ${sheetId}`);
    sheetMap.delete(sheetId);
  } else {
    sheetMap.set(sheetId, users);
    const message = JSON.stringify({
      type: MESSAGE_TYPE.SERVER,
      data: {
        type: MESSAGE_TYPE.LEAVE,
        userId: ws.userId,
        message: "User left",
      },
    });

    await broadcastMessage(message, sheetId, ws);
  }
}

async function handleJoin(
  data: {
    token: string;
    sheetId: string;
  },
  ws: MyWebSocket
) {
  try {
    const userFromToken = await decodeToken(data.token);

    if (!userFromToken) {
      ws.send(
        JSON.stringify({
          type: MESSAGE_TYPE.ERROR,
          data: {
            message: "Invalid token",
          },
        })
      );
      return;
    }

    ws.userId = userFromToken.id;
    ws.sheetId = data.sheetId;
    ws.username = userFromToken.username;

    const existingUsers = sheetMap.get(data.sheetId) || [];

    const existingUser = existingUsers.find(
      (user) => user.userId === userFromToken.id
    );

    if (existingUser) {
      const index = existingUsers.indexOf(existingUser);
      existingUsers.splice(index, 1);
      existingUsers.push(ws);
      sheetMap.set(data.sheetId, existingUsers);

      ws.send(
        JSON.stringify({
          type: MESSAGE_TYPE.RESPONSE,
          data: {
            type: MESSAGE_TYPE.JOIN,
            message: "User reconnected",
            userId: userFromToken.id,
            username: userFromToken.username,
          },
        })
      );

      await broadcastMessage(
        JSON.stringify({
          type: MESSAGE_TYPE.SERVER,
          data: {
            type: MESSAGE_TYPE.JOIN,
            userId: userFromToken.id,
            message: "User reconnected",
            usernam: userFromToken.username,
          },
        }),
        data.sheetId,
        ws
      );

      //now need to broadcast to this user the current state of the sheet i.e all the users

      await existingUsers.forEach((user) => {
        if (user.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: MESSAGE_TYPE.SERVER,
              data: {
                type: MESSAGE_TYPE.JOIN,
                message: "User already in sheet",
                userId: user.userId,
                username: user.username,
              },
            })
          );
        }
      });
    } else {
      existingUsers.push(ws);
      sheetMap.set(data.sheetId, existingUsers);

      ws.send(
        JSON.stringify({
          type: MESSAGE_TYPE.JOIN,
          data: {
            message:
              existingUsers.length === 1
                ? "Added as first user to sheet"
                : "User added to sheet",
            userId: userFromToken.id,
            username: userFromToken.username,
          },
        })
      );

      if (existingUsers.length > 1) {
        await broadcastMessage(
          JSON.stringify({
            type: MESSAGE_TYPE.SERVER,
            data: {
              type: MESSAGE_TYPE.JOIN,
              userId: userFromToken.id,
              username: userFromToken.username,
              message: "User joined",
            },
          }),
          data.sheetId,
          ws
        );
      }

      //list all the users in the sheet

      await existingUsers.forEach((user) => {
        if (user.readyState === WebSocket.OPEN && user.userId !== ws.userId) {
          ws.send(
            JSON.stringify({
              type: MESSAGE_TYPE.SERVER,
              data: {
                type: MESSAGE_TYPE.JOIN,
                message: "User already in sheet",
                userId: user.userId,
                username: user.username,
              },
            })
          );
        }
      });
    }

    displaySheetANdUser(sheetMap);
  } catch (error) {
    console.error("Error in handleJoin:", error);
    ws.send(
      JSON.stringify({
        type: MESSAGE_TYPE.ERROR,
        data: {
          message: "Internal server error",
        },
      })
    );
  }
}

async function broadcastMessage(
  message: string,
  sheetId: string,
  sender: MyWebSocket
) {
  const sheetUsers = sheetMap.get(sheetId);

  if (!sheetUsers || sheetUsers.length === 0) {
    console.log(`No users found for sheet ${sheetId}`);
    return;
  }

  try {
    await Promise.all(
      sheetUsers.map(async (recipient) => {
        if (recipient !== sender && recipient.readyState === WebSocket.OPEN) {
          console.log(
            `\n Sending message ${message} to user ${recipient.userId} in sheet ${sheetId} \n`
          );
          recipient.send(message);
        }
        message;
      })
    );
  } catch (error) {
    console.error("Error broadcasting message:", error);
  }
}

async function handleUpdate(data:any, ws:MyWebSocket) {
  //need to implement this 
  
  //implement CRDT








}

wss.on("connection", (ws: MyWebSocket) => {
  console.log("New client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (!data.type || !Object.values(MESSAGE_TYPE).includes(data.type)) {
        ws.send(
          JSON.stringify({
            type: MESSAGE_TYPE.ERROR,
            data: {
              message: "Invalid message type",
            },
          })
        );
        return;
      }

      switch (data.type) {
        case MESSAGE_TYPE.JOIN:
          await handleJoin(data.data, ws);
          break;

        case MESSAGE_TYPE.UPDATE:
          if (!ws.sheetId) {
            ws.send(
              JSON.stringify({
                type: MESSAGE_TYPE.ERROR,
                data: {
                  message: "Must join a sheet first",
                },
              })
            );
            return;
          }

          // await broadcastMessage(JSON.stringify(data), ws.sheetId, ws);
          //cant do this directly we need to use redis and worker will pick event and send to all users
          handleUpdate(data.data, ws);

          break;

        default:
          ws.send(
            JSON.stringify({
              type: MESSAGE_TYPE.ERROR,
              data: {
                message: "Unsupported message type",
              },
            })
          );
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: MESSAGE_TYPE.ERROR,
          data: {
            message: "Error processing message",
          },
        })
      );
    }
  });

  ws.on("close", () => {
    handleLeave(ws);
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    handleLeave(ws);
  });
});

setInterval(() => {
  wss.clients.forEach((ws: MyWebSocket) => {
    if (ws.readyState === WebSocket.CLOSED) {
      handleLeave(ws);
    }
  });
}, 10000);
