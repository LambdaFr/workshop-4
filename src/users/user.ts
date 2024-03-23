import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, REGISTRY_PORT } from "../config";
import { rsaEncrypt, createRandomSymmetricKey, exportSymKey, symEncrypt } from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  _user.get("/status", (req, res) => {
    res.send("live");
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    res.send("Message received");
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    const symKey = await createRandomSymmetricKey();
    const encryptedSymKey = await rsaEncrypt(await exportSymKey(symKey), destinationUserId);
    const encryptedMessage = await symEncrypt(symKey, message);
    const response = await fetch(`http://localhost:${BASE_USER_PORT + destinationUserId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: encryptedMessage }),
    });
    lastSentMessage = message;
    console.log(await response.text());
    res.send("Message sent");
  });

  return server;
}
