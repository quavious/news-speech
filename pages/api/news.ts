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
  console.log(html);
  const paragraphArray = load(html)("article > div > p").toArray();
  console.log(paragraphArray.length);
  const textArray = paragraphArray
    .filter(
      (el) =>
        el instanceof HTMLParagraphElement &&
        !el.className.includes("vl_disclosure")
    )
    .map((el) => load(el).text().trim());
  return res.status(200).json({
    textArray,
  });
}
