import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

function Index() {
  const [input, setInput] = useState("");
  const router = useRouter();
  return (
    <div
      style={{
        padding: "1rem",
        margin: "0 auto",
        width: "100%",
        maxWidth: "640px",
      }}
    >
      <form
        method="post"
        onSubmit={async (event) => {
          event.preventDefault();
          const response = await fetch("/api/auth", {
            method: "POST",
            body: JSON.stringify({ password: input }),
            headers: {
              "content-type": "application/json",
            },
          });
          const data = await response.json();
          if (!!data?.accessToken) {
            global.window.localStorage.setItem("accessToken", data.accessToken);
            router.push("/main");
          }
        }}
      >
        <input
          type="password"
          name="password"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit">로그인</button>
      </form>
      <h4 style={{ fontSize: 20 }}>
        <Link href={"/main"}>메인 페이지로 이동</Link>
      </h4>
    </div>
  );
}

export default Index;
