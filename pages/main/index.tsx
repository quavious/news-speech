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
    `https://api.bing.microsoft.com/v7.0/news?mkt=ko-KR&sortby=date&textDecorations=true&textFormat=HTML&originalImg=true&count=40`,
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
      .find((voice) => voice.lang.includes("ko"));
    if (!voice) {
      return;
    }
    console.log(voice);
    setVoice(voice);
  }, [synthesis]);

  async function onPlay() {
    setStatus({
      isPlaying: true,
      isPaused: false,
    });
    for (const article of articles) {
      const array = [article.name, article.description];
      for (let index = 0; index < array.length; index++) {
        const utterance = new SpeechSynthesisUtterance(array[index]);
        utterance.voice = voice;
        utterance.pitch = 0.85;
        utterance.rate = 1;
        utterance.volume = 1;
        synthesis?.speak(utterance);
      }
    }
  }

  return (
    <>
      <div className="mx-auto max-w-3xl w-full pt-4">
        <main>
          <div className="flex">
            <h1 className="text-4xl font-bold">뉴스 스피치</h1>
            <section className="ml-auto mr-0 flex items-center">
              {!status.isPlaying && (
                <button
                  onClick={() => {
                    if (status.isPaused) {
                      setStatus(() => ({ isPaused: false, isPlaying: true }));
                      synthesis?.resume();
                    } else {
                      onPlay();
                    }
                  }}
                >
                  <PlayCircleOutline />
                </button>
              )}
              {status.isPlaying && (
                <>
                  <button
                    onClick={() => {
                      setStatus(() => ({ isPaused: true, isPlaying: false }));
                      synthesis?.pause();
                    }}
                  >
                    <PauseCircle />
                  </button>
                  <button
                    onClick={() => {
                      setStatus(() => ({ isPaused: false, isPlaying: false }));
                      synthesis?.cancel();
                    }}
                  >
                    <StopCircle />
                  </button>
                </>
              )}
            </section>
          </div>
          {articles.map((article, index) => (
            <article key={`article.${index}`} className="my-4 border-b-2 pb-2">
              <h2 className="text-2xl font-semibold">{article.name}</h2>
              <picture>
                <img
                  src={article.thumbnail.split("&")[0]}
                  alt={`Thumbnail ${index}`}
                  className="my-4"
                />
              </picture>
              <p className="py-2 text-lg whitespace-pre-line">
                {article.description}
              </p>
              <a
                href={article.url}
                target="__blank"
                className="font-semibold text-slate-200"
              >
                이동
              </a>
              <h4 className="text-slate-50 font-semibold mt-2">
                {new Date(article.datePublished).toLocaleString()}
              </h4>
            </article>
          ))}
        </main>
        {/* <section>
          <button
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
        </section> */}
      </div>
    </>
  );
}

export default Main;
