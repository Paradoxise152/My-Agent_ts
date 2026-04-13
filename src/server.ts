import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import MCPClient from "./MCPClient";
import Agent from "./Agent";
import { retrieveContextForTask } from "./ragContext";
import { appendJsonLog, applyHttpServerConsoleDefaults, phaseLine, setDiagnosticRunId } from "./diagnosticLog";

dotenv.config();
applyHttpServerConsoleDefaults();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…(truncated)`;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function setSseHeaders(res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

function sendSse(res: ServerResponse, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function setCors(res: ServerResponse, origin: string | undefined) {
  const raw = (process.env.AGENT_CORS_ORIGIN || "*").trim();
  if (raw === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const o = origin || "";
    const picked = o && list.includes(o) ? o : list[0] || "*";
    res.setHeader("Access-Control-Allow-Origin", picked);
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

let busy = false;

function json(res: ServerResponse, origin: string | undefined, status: number, body: unknown) {
  setCors(res, origin);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function handleAgentRun(req: IncomingMessage, res: ServerResponse, origin: string | undefined) {
  setCors(res, origin);

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    json(res, origin, 400, { error: "Invalid JSON body" });
    return;
  }

  try {
    getRequiredEnv("OPENAI_API_KEY");
    getRequiredEnv("OPENAI_BASE_URL");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    json(res, origin, 500, { error: message });
    return;
  }

  const task =
    typeof body === "object" && body !== null && "task" in body && typeof (body as { task: unknown }).task === "string"
      ? (body as { task: string }).task.trim()
      : "";
  if (!task) {
    json(res, origin, 400, { error: "Missing non-empty string field: task" });
    return;
  }
  if (task.length > 12000) {
    json(res, origin, 400, { error: "task is too long (max 12000)" });
    return;
  }

  if (busy) {
    json(res, origin, 429, { error: "Another agent run is in progress" });
    return;
  }
  busy = true;
  const runId = `run-${Date.now()}`;
  setDiagnosticRunId(runId);

  const failSse = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    try {
      sendSse(res, { type: "error", message });
      sendSse(res, { type: "done", ok: false });
    } catch {
      // ignore
    }
    try {
      if (!res.writableEnded) res.end();
    } catch {
      // ignore
    }
  };

  let agent: Agent | null = null;
  try {
    appendJsonLog({ type: "http.request", task, taskLen: task.length });
    phaseLine("http.run", "start", `taskLen=${task.length}`);

    setSseHeaders(res);

    const topK = Number(process.env.RAG_TOP_K || "3") || 3;
    const model = process.env.AGENT_MODEL || "gpt-4o-mini";

    sendSse(res, { type: "phase", phase: "rag" });
    sendSse(res, { type: "log", level: "info", title: "RAG", detail: "读取 knowledge 并检索上下文…" });

    const context = await retrieveContextForTask(task, topK);
    sendSse(res, { type: "context", text: context });
    sendSse(res, {
      type: "log",
      level: "model",
      title: "上下文已注入",
      detail: `Top-${topK} 检索完成，长度 ${context.length} 字符`,
    });

    sendSse(res, { type: "phase", phase: "init" });
    const outPath = path.join(process.cwd(), "output");
    fs.mkdirSync(outPath, { recursive: true });
    const fetchMCP = new MCPClient("mcp-server-fetch", "uvx", ["mcp-server-fetch"]);
    const fileMCP = new MCPClient("mcp-server-file", "npx", ["-y", "@modelcontextprotocol/server-filesystem", outPath]);
    agent = new Agent([fetchMCP, fileMCP], model, "", context);
    await agent.init();
    sendSse(res, { type: "log", level: "info", title: "INIT", detail: "LLM 与 MCP 工具已就绪" });

    sendSse(res, { type: "phase", phase: "llm" });

    const finalText = await agent.invoke(task, {
      onStream: (chunk) => {
        if (chunk.kind === "content") sendSse(res, { type: "token", text: chunk.text });
        if (chunk.kind === "reasoning") sendSse(res, { type: "reasoning", text: chunk.text });
      },
      onToolCall: (info) => {
        sendSse(res, { type: "phase", phase: "tool" });
        sendSse(res, { type: "tool_call", id: info.id, name: info.name, arguments: info.arguments });
        sendSse(res, {
          type: "log",
          level: "tool",
          title: `TOOL · ${info.name}`,
          detail: truncate(info.arguments, 6000),
        });
      },
      onToolResult: (info) => {
        sendSse(res, {
          type: "tool_result",
          id: info.id,
          name: info.name,
          result: truncate(info.resultText, 8000),
        });
        sendSse(res, { type: "phase", phase: "llm" });
      },
    });

    sendSse(res, { type: "phase", phase: "done" });
    sendSse(res, { type: "log", level: "info", title: "完成", detail: "Agent 已返回最终文本并关闭 MCP" });
    sendSse(res, { type: "done", ok: true, finalText });
    appendJsonLog({
      type: "http.done",
      ok: true,
      finalLen: finalText.length,
      finalPreview: truncate(finalText, 4000),
    });
    phaseLine("http.run", "end", `ok finalChars=${finalText.length}`);
    res.end();
  } catch (err) {
    appendJsonLog({
      type: "http.error",
      message: err instanceof Error ? err.message : String(err),
    });
    phaseLine("http.run", "end", "error");
    try {
      await agent?.close();
    } catch {
      // ignore
    }
    if (!res.headersSent) {
      json(res, origin, 500, { error: err instanceof Error ? err.message : String(err) });
    } else {
      failSse(err);
    }
  } finally {
    setDiagnosticRunId(null);
    busy = false;
  }
}

const port = Number(process.env.AGENT_HTTP_PORT || "8787");

createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    setCors(res, origin);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    setCors(res, origin);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: true, busy }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/agent/run") {
    await handleAgentRun(req, res, origin);
    return;
  }

  res.statusCode = 404;
  setCors(res, origin);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Not found" }));
}).listen(port, () => {
  console.log(`Agent HTTP + SSE listening on http://127.0.0.1:${port}`);
});
