import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "error";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>Frostbyte</h1>
      <p>
        Backend:{" "}
        {status === "loading" && "checking…"}
        {status === "ok" && "✓ connected"}
        {status === "error" && "✗ unreachable"}
      </p>
    </div>
  );
}
