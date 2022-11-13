import { NextApiRequest, NextApiResponse } from "next";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

const hashedPassword = argon2.hash(process.env.API_PASSWORD ?? "");
const jwtSecret = process.env.JWT_SECRET ?? "";

export default async function AuthHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const method = req.method?.toUpperCase();

  if (method === "GET") {
    const token = req.headers["authorization"];
    const accessToken = token?.split(" ")?.[1];
    if (typeof accessToken === "undefined") {
      return res.status(403).json(null);
    }
    const response = jwt.verify(accessToken, jwtSecret);
    if (typeof response !== "string" && !!response.account) {
      return res.status(200).json({
        message: "Authenticated",
      });
    }
    return res.status(403).json(null);
  }

  if (method === "POST") {
    const password: string = req.body.password;
    const isMatch = await argon2.verify(await hashedPassword, password);
    if (!isMatch) {
      return res.status(403).json(null);
    }
    const accessToken = jwt.sign(
      {
        account: "austin.now",
      },
      jwtSecret,
      {
        expiresIn: "24h",
      }
    );
    return res.status(201).json({
      accessToken,
    });
  }
  return res.status(405).json(null);
}
