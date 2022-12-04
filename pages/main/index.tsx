import { GetServerSideProps, GetStaticProps } from "next";
import { load } from "cheerio";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  NavigateBefore,
  NavigateNext,
  NotStarted,
  PauseCircle,
  PlayCircle,
  PlayCircleOutline,
  StopCircle,
} from "@mui/icons-material";

interface NewsModel {
  name: string;
  url: string;
  description: string;
  datePublished: string;
  thumbnail: string;
  provider: string;
}

export const getStaticProps: GetStaticProps = async (context) => {
  const response = await fetch(
    `https://api.bing.microsoft.com/v7.0/news?mkt=en-US&sortby=date&textDecorations=true&textFormat=HTML&originalImg=true&count=100`,
    {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.BING_API_KEY ?? "",
      },
    }
  );
  const data = await response.json();
  let rawArticles: any = data.value;
  let articles: NewsModel[] = [];
  articles = rawArticles
    .filter((el: any) => el.url.includes("www.msn.com") && el.image)
    .map((article: any) => ({
      name: load(article.name).text().trim(),
      description: load(article.description).text().trim(),
      url: article.url,
      datePublished: article.datePublished,
      provider: article.provider?.[0].name,
      thumbnail: article.image?.thumbnail.contentUrl,
    }));
  return {
    props: {
      articles,
    },
    revalidate: 60 * 10,
  };
};

function Main(props: { articles: NewsModel[] }) {
  const { articles } = props;
  const router = useRouter();
  const [newsIndex, setNewsIndex] = useState(articles.length >= 0 ? 0 : -1);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [status, setStatus] = useState({
    isPlaying: false,
    isPaused: false,
  });

  const selectedNews = useMemo(() => {
    console.log("Selected", newsIndex);
    return articles[newsIndex];
  }, [articles, newsIndex]);

  useEffect(() => {
    if (!router) return;
    const accessToken = global.window.localStorage.getItem("accessToken");
    fetch("/api/auth", {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .catch((err) => {
        router.replace("/");
      });
  }, [router]);
  useEffect(() => {
    if (!global.window) {
      return;
    }
    setSynthesis(global.window.speechSynthesis);
  }, []);
  useEffect(() => {
    if (!synthesis) {
      return;
    }
    const voice = synthesis
      .getVoices()
      .find((voice) => voice.lang.includes("en"));
    if (!voice) {
      return;
    }
    console.log(voice);
    setVoice(voice);
  }, [synthesis]);

  return (
    <>
      <style jsx>{`
        .main {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          padding: 1.25rem 2.5rem;
        }
        .article {
          height: 320px;
        }
        .buttons {
          display: flex;
          justify-content: center;
          margin: 0 auto;
        }
        .buttons button {
          margin: 0 0.75rem;
        }
        .circleButton {
          display: flex;
          align-items: center;
          font-size: 24px;
          width: 52px;
          height: 40px;
          justify-content: center;
        }
        .playAll {
          width: 48px;
          height: 40px;
        }
      `}</style>
      <div>
        <main className="main">
          <div style={{ display: "flex", alignItems: "center" }}>
            <h1 className="mainHead">뉴스 스피치</h1>
            <button
              className="playAll circleButton"
              style={{ margin: "0 0 0 auto", height: "100%" }}
              onClick={async () => {
                const array = articles || [];
                for (let index = 0; index < array.length; index++) {
                  if (index < newsIndex) {
                    continue;
                  }
                  const article = array[index];
                  const response = await fetch(
                    `/api/news?url=${encodeURIComponent(article.url)}`,
                    {
                      headers: {
                        "x-user-agent": global.navigator.userAgent,
                      },
                    }
                  );
                  const data: { textArray: string[] } = await response.json();
                  if (data.textArray.length <= 0) {
                    continue;
                  }
                  for (const text of [article.name, ...data.textArray]) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.voice = voice;
                    utterance.pitch = 0.85;
                    utterance.rate = 1;
                    utterance.volume = 1;
                    synthesis?.speak(utterance);
                  }
                }
              }}
            >
              <PlayCircleOutline />
            </button>
          </div>
          <article className="article">
            <h2 className="articleTitle">{selectedNews.name}</h2>
            <p className="articleDescription">{selectedNews.description}</p>
            <a className="articleLink" href={selectedNews.url} target="__blank">
              이동
            </a>
            <h4 className="articlePublished">
              {new Date(selectedNews.datePublished).toLocaleString()}
            </h4>
          </article>
        </main>
        <section className="buttons">
          <button
            className="circleButton"
            onClick={() => {
              if (newsIndex <= 0) {
                return;
              }
              synthesis?.cancel();
              setNewsIndex((index) => index - 1);
              setStatus({
                isPlaying: false,
                isPaused: false,
              });
            }}
          >
            <NavigateBefore />
          </button>
          {status.isPlaying && (
            <button
              className="circleButton"
              onClick={() => {
                synthesis?.pause();
                setStatus({
                  isPlaying: false,
                  isPaused: true,
                });
              }}
            >
              <PauseCircle />
            </button>
          )}
          {!status.isPlaying && (
            <button
              className="circleButton"
              onClick={async () => {
                const response = await fetch(
                  `/api/news?url=${encodeURIComponent(selectedNews.url)}`,
                  {
                    headers: {
                      "x-user-agent": global.navigator.userAgent,
                    },
                  }
                );
                const data: { textArray: string[] } = await response.json();
                if (data.textArray.length <= 0) {
                }
                const array = [selectedNews.name, ...data.textArray];
                for (let index = 0; index < array.length; index++) {
                  const utterance = new SpeechSynthesisUtterance(array[index]);
                  utterance.voice = voice;
                  utterance.pitch = 0.85;
                  utterance.rate = 1;
                  utterance.volume = 1;
                  synthesis?.speak(utterance);
                  setStatus({
                    isPlaying: true,
                    isPaused: false,
                  });
                }
              }}
            >
              <PlayCircle />
            </button>
          )}
          {!status.isPlaying && status.isPaused && (
            <button
              className="circleButton"
              onClick={() => {
                synthesis?.resume();
                setStatus({
                  isPlaying: true,
                  isPaused: false,
                });
              }}
            >
              <NotStarted />
            </button>
          )}
          {status.isPlaying && (
            <button
              className="circleButton"
              onClick={() => {
                synthesis?.cancel();
                setStatus({
                  isPlaying: false,
                  isPaused: false,
                });
              }}
            >
              <StopCircle />
            </button>
          )}
          <button
            className="circleButton"
            onClick={() => {
              if (newsIndex + 1 === articles.length) {
                setNewsIndex(0);
                return;
              }
              synthesis?.cancel();
              setNewsIndex((index) => index + 1);
              setStatus({
                isPlaying: false,
                isPaused: false,
              });
            }}
          >
            <NavigateNext />
          </button>
        </section>
      </div>
    </>
  );
}

export default Main;
