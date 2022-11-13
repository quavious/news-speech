// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { load } from "cheerio";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const url = req.query.url;
  if (typeof url !== "string") {
    return res.status(401).json(null);
  }
  const userAgent = req.headers["x-user-agent"] as string;
  const response = await fetch(decodeURIComponent(url), {
    headers: {
      "user-agent": userAgent,
    },
  });
  const html = await response.text();
  const textArray = load(html)("#dic_area")
    .text()
    .split("\n")
    .map((el) => el.trim())
    .filter((el) => el.length > 0);
  return res.status(200).json({
    textArray,
  });
}
