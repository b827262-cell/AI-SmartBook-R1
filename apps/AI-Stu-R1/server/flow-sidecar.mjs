#!/usr/bin/env node
/**
 * flow-sidecar.mjs
 * Lightweight read-only HTTP sidecar that serves tw-legal-flow data.
 *
 * Endpoints:
 *   GET /api/institutional-flow  → latest_flow.json (from tw-legal-flow)
 *
 * Usage:
 *   node flow-sidecar.mjs [--port 4350] [--flow-json /path/to/latest_flow.json]
 *
 * Environment variables (override command-line):
 *   FLOW_SIDECAR_PORT     default 4350
 *   FLOW_JSON_PATH        default ~/project/tw-legal-flow/data/processed/discovered/latest_flow.json
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p" },
    "flow-json": { type: "string" },
  },
  strict: false,
});

const PORT = parseInt(
  process.env.FLOW_SIDECAR_PORT ||
    values["port"] ||
    "4350",
  10
);

const FLOW_JSON = (
  process.env.FLOW_JSON_PATH ||
  values["flow-json"] ||
  path.join(
    os.homedir(),
    "project",
    "tw-legal-flow",
    "data",
    "processed",
    "discovered",
    "latest_flow.json"
  )
);

function respond(res, status, contentType, body) {
  const buf = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": buf.length,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  });
  res.end(buf);
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/institutional-flow" && req.method === "GET") {
    try {
      const raw = fs.readFileSync(FLOW_JSON, "utf8");
      // validate JSON
      JSON.parse(raw);
      respond(res, 200, "application/json; charset=utf-8", raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[flow-sidecar] Error reading ${FLOW_JSON}: ${msg}`);
      respond(
        res,
        503,
        "application/json; charset=utf-8",
        JSON.stringify({ error: "data unavailable", detail: msg })
      );
    }
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    respond(res, 200, "text/plain", "ok");
    return;
  }

  respond(res, 404, "text/plain", "not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[flow-sidecar] Listening on http://127.0.0.1:${PORT}/api/institutional-flow`
  );
  console.log(`[flow-sidecar] Serving JSON from: ${FLOW_JSON}`);
});

server.on("error", (err) => {
  console.error(`[flow-sidecar] Server error: ${err.message}`);
  process.exit(1);
});
