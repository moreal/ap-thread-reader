#!/usr/bin/env tsx
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PORT = parseInt(process.env.PORT ?? "4321", 10);
const FIXTURES_DIR = join(import.meta.dirname, "..", "fixtures", "activitypub");

const server = createServer(async (req, res) => {
  const urlPath = new URL(req.url!, `http://localhost:${PORT}`).pathname;
  const filePath = join(FIXTURES_DIR, urlPath + ".json");

  try {
    const data = await readFile(filePath, "utf-8");
    res.writeHead(200, {
      "Content-Type": "application/activity+json; charset=utf-8",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found", path: urlPath }));
  }
});

server.listen(PORT, () => {
  console.log(`ActivityPub fixture server: http://localhost:${PORT}`);
});
