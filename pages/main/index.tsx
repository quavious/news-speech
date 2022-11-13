import { GetServerSideProps, GetStaticProps } from "next";
import { load } from "cheerio";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

interface NewsModel {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export const getStaticProps: GetStaticProps = async (context) => {
  const response = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(
      "정치,사회,경제"
    )}&display=100`,
    {
      headers: {
        "X-Naver-Client-Id": "qbDjsJwGBqTlXb7cokEP",
        "X-Naver-Client-Secret": "3Gi9ZYn9uw",
      },
    }
  );
  const data = await response.json();
  let articles: NewsModel[] = data.items;
  articles = articles
    .filter((el) => el.link.includes("news.naver.com"))
    .map((article) => ({
      ...article,
      title: load(article.title).text(),
      description: load(article.description).text(),
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
      .find((voice) => voice.lang.includes("ko"));
    if (!voice) {
      return;
    }
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
          font-size: 18px;
        }
      `}</style>
      <div>
        <main className="main">
          <div style={{ display: "flex", alignItems: "center" }}>
            <h1 className="mainHead">뉴스 스피치</h1>
            <button
              style={{ margin: "0 0 0 auto", height: "100%", fontSize: 18 }}
              onClick={async () => {
                const array = articles || [];
                for (let index = 0; index < array.length; index++) {
                  if (index < newsIndex) {
                    continue;
                  }
                  const article = array[index];
                  const response = await fetch(
                    `/api/news?url=${encodeURIComponent(article.link)}`,
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
                  for (const text of [article.title, ...data.textArray]) {
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
              Play All
            </button>
          </div>
          <article className="article">
            <h2 className="articleTitle">{selectedNews.title}</h2>
            <p className="articleDescription">{selectedNews.description}</p>
            <a
              className="articleLink"
              href={selectedNews.link}
              target="__blank"
            >
              이동
            </a>
            <h4 className="articlePublished">
              {new Date(selectedNews.pubDate).toLocaleString()}
            </h4>
          </article>
        </main>
        <section className="buttons">
          <button
            onClick={() => {
              if (newsIndex < 0) {
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
            Prev
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
              Pause
            </button>
          )}
          {!status.isPlaying && (
            <button
              onClick={async () => {
                const response = await fetch(
                  `/api/news?url=${encodeURIComponent(selectedNews.link)}`,
                  {
                    headers: {
                      "x-user-agent": global.navigator.userAgent,
                    },
                  }
                );
                const data: { textArray: string[] } = await response.json();
                if (data.textArray.length <= 0) {
                }
                const array = [selectedNews.title, ...data.textArray];
                for (let index = 0; index < array.length; index++) {
                  const utterance = new SpeechSynthesisUtterance(array[index]);
                  utterance.voice = voice;
                  utterance.pitch = 0.85;
                  utterance.rate = 1;
                  utterance.volume = 1;
                  // if (index + 1 === array.length) {
                  //   console.log("Running...");
                  //   utterance.onend = function (event) {
                  //     setNewsIndex(newsIndex + 1);
                  //   };
                  // }
                  synthesis?.speak(utterance);
                  setStatus({
                    isPlaying: true,
                    isPaused: false,
                  });
                }
              }}
            >
              Play
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
              Resume
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
              Stop
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
            Next
          </button>
        </section>
      </div>
    </>
  );
}

export default Main;
