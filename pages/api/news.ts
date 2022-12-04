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
  const decodedUrl = decodeURIComponent(url);
  const newsId = decodedUrl.split("/").pop()?.split("-").pop();
  if (typeof newsId !== "string") {
    return res.status(404).json(null);
  }
  const newsDataUrl = `https://assets.msn.com/content/view/v2/Detail/en-us/${newsId}`;
  const response = await fetch(decodeURIComponent(newsDataUrl), {
    headers: {
      "user-agent": userAgent,
    },
  });
  const obj = await response.json();
  const html = "<!doctype html><html>" + obj.body + "</html>";
  const paragraphArray = load(html)("p").toArray();
  const textArray = paragraphArray.map((el) => load(el).text().trim());
  return res.status(200).json({
    textArray,
  });
}
