import { computed, ref, shallowRef } from "vue";

export type PipelineId = "rag" | "init" | "llm" | "tool" | "done";

export interface LogEntry {
  id: string;
  ts: number;
  level: "info" | "tool" | "model" | "warn";
  title: string;
  detail?: string;
}

export interface ToolCallPreview {
  id: string;
  name: string;
  argsSummary: string;
  resultSummary: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushLogLocal(logs: { value: LogEntry[] }, entry: Omit<LogEntry, "id" | "ts">) {
  const next: LogEntry = { ...entry, id: nowId(), ts: Date.now() };
  logs.value = [...logs.value, next].slice(-120);
}

function parseSseBuffer(buffer: string): { payloads: unknown[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const payloads: unknown[] = [];
  for (const block of parts) {
    const lines = block.split("\n").filter(Boolean);
    let data = "";
    for (const line of lines) {
      if (line.startsWith("data:")) data += line.slice(5).trimStart();
    }
    if (!data) continue;
    try {
      payloads.push(JSON.parse(data) as unknown);
    } catch {
      // ignore malformed chunk
    }
  }
  return { payloads, rest };
}

export function useAgentSimulation() {
  const task = ref("");
  const running = ref(false);
  const activeStep = shallowRef<PipelineId | null>(null);
  const streamText = ref("");
  const contextSnippet = ref("");
  const toolCalls = shallowRef<ToolCallPreview[]>([]);
  const logs = shallowRef<LogEntry[]>([]);
  const liveError = ref("");

  const progress = computed(() => {
    const order: PipelineId[] = ["rag", "init", "llm", "tool", "done"];
    const idx = activeStep.value ? order.indexOf(activeStep.value) : -1;
    if (idx < 0) return 0;
    return Math.min(1, (idx + 1) / order.length);
  });

  function pushLog(entry: Omit<LogEntry, "id" | "ts">) {
    pushLogLocal(logs, entry);
  }

  let streamRaf = 0;
  function cancelStream() {
    if (streamRaf) cancelAnimationFrame(streamRaf);
    streamRaf = 0;
  }

  /** 使用 rAF 分帧打字，避免长文本阻塞主线程 */
  function streamType(full: string, cps = 42) {
    cancelStream();
    streamText.value = "";
    const start = performance.now();
    const msPerChar = 1000 / cps;

    const tick = (t: number) => {
      const n = Math.min(full.length, Math.floor((t - start) / msPerChar));
      if (n > streamText.value.length) streamText.value = full.slice(0, n);
      if (n < full.length) streamRaf = requestAnimationFrame(tick);
      else streamRaf = 0;
    };
    streamRaf = requestAnimationFrame(tick);
  }

  function reset() {
    cancelStream();
    running.value = false;
    activeStep.value = null;
    streamText.value = "";
    contextSnippet.value = "";
    toolCalls.value = [];
    logs.value = [];
    liveError.value = "";
  }

  function applyServerPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const p = payload as Record<string, unknown>;
    const type = p.type;
    if (type === "phase" && typeof p.phase === "string") {
      activeStep.value = p.phase as PipelineId;
      return;
    }
    if (type === "log" && typeof p.title === "string" && typeof p.level === "string") {
      pushLog({
        level: p.level as LogEntry["level"],
        title: p.title,
        detail: typeof p.detail === "string" ? p.detail : undefined,
      });
      return;
    }
    if (type === "context" && typeof p.text === "string") {
      contextSnippet.value = p.text;
      return;
    }
    if (type === "token" && typeof p.text === "string") {
      streamText.value += p.text;
      return;
    }
    if (type === "reasoning" && typeof p.text === "string") {
      streamText.value += `\n[推理] ${p.text}`;
      return;
    }
    if (type === "tool_call" && typeof p.name === "string" && typeof p.id === "string") {
      const args = typeof p.arguments === "string" ? p.arguments : "";
      toolCalls.value = [
        ...toolCalls.value,
        {
          id: p.id,
          name: p.name,
          argsSummary: args.length > 600 ? `${args.slice(0, 600)}…` : args,
          resultSummary: "执行中…",
        },
      ];
      return;
    }
    if (type === "tool_result" && typeof p.id === "string") {
      const result = typeof p.result === "string" ? p.result : "";
      const idx = toolCalls.value.findIndex((t) => t.id === p.id);
      if (idx < 0) return;
      const next = [...toolCalls.value];
      next[idx] = { ...next[idx], resultSummary: result };
      toolCalls.value = next;
      return;
    }
    if (type === "error" && typeof p.message === "string") {
      liveError.value = p.message;
      pushLog({ level: "warn", title: "错误", detail: p.message });
      return;
    }
    if (type === "done") {
      running.value = false;
    }
  }

  async function runAgent() {
    if (running.value) return;
    liveError.value = "";
    cancelStream();
    running.value = true;
    toolCalls.value = [];
    contextSnippet.value = "";
    logs.value = [];
    streamText.value = "";
    activeStep.value = null;

    const bodyTask = task.value.trim();
    if (!bodyTask) {
      pushLog({ level: "warn", title: "任务为空", detail: "请输入任务描述后再运行。" });
      running.value = false;
      return;
    }

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: bodyTask }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok && ct.includes("application/json")) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.body) {
        throw new Error("响应体不可读（缺少 ReadableStream）");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const { payloads, rest } = parseSseBuffer(buf);
        buf = rest;
        for (const pl of payloads) applyServerPayload(pl);
      }
      const tail = parseSseBuffer(buf + "\n\n");
      for (const pl of tail.payloads) applyServerPayload(pl);

      running.value = false;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      liveError.value = message;
      pushLog({ level: "warn", title: "请求失败", detail: message });
      running.value = false;
    }
  }

  async function runDemo() {
    if (running.value) return;
    liveError.value = "";
    running.value = true;
    toolCalls.value = [];
    contextSnippet.value = "";
    logs.value = [];
    activeStep.value = "rag";
    pushLog({ level: "info", title: "RAG", detail: "读取 knowledge 并检索 Top-K 上下文…" });

    await sleep(420);
    contextSnippet.value =
      "（示例）Peter：工程师，关注本地向量检索与 MCP 工具编排；偏好 TypeScript 与可观测的执行路径。";
    pushLog({ level: "model", title: "上下文已注入", detail: "embedding 检索完成，合并为模型上下文。" });

    activeStep.value = "init";
    pushLog({ level: "info", title: "INIT", detail: "初始化 LLM 与 MCP 工具列表（fetch / filesystem）。" });
    await sleep(380);

    activeStep.value = "llm";
    pushLog({ level: "model", title: "模型推理", detail: "根据任务与工具 schema 生成计划与 tool_calls。" });
    const userTask = task.value.trim() || "根据上下文完成任务并写入 output。";
    streamType(`已接收任务：${userTask}\n\n正在评估是否需要外部工具…`, 48);
    await sleep(900);

    activeStep.value = "tool";
    const calls: ToolCallPreview[] = [
      {
        id: "demo-1",
        name: "mcp-server-fetch",
        argsSummary: `{ "url": "https://example.com" }`,
        resultSummary: "（演示）抓取到结构化片段，供模型引用。",
      },
      {
        id: "demo-2",
        name: "filesystem.write",
        argsSummary: `{ "path": "output/result.md" }`,
        resultSummary: "（演示）文件写入成功。",
      },
    ];
    toolCalls.value = calls;
    for (const c of calls) {
      pushLog({
        level: "tool",
        title: `TOOL · ${c.name}`,
        detail: `${c.argsSummary}\n→ ${c.resultSummary}`,
      });
      await sleep(520);
    }

    activeStep.value = "llm";
    streamType(
      "工具结果已回填。正在生成最终答复（流式）…\n\n" +
        "本模式为离线演示：连接真实后端请使用「运行 Agent（后端）」并先启动 `pnpm server:dev`。",
      56,
    );
    await sleep(1200);

    activeStep.value = "done";
    pushLog({ level: "info", title: "完成", detail: "无更多 tool_calls，关闭 MCP 会话。" });
    running.value = false;
  }

  return {
    task,
    running,
    activeStep,
    streamText,
    contextSnippet,
    toolCalls,
    logs,
    progress,
    liveError,
    runAgent,
    runDemo,
    reset,
  };
}
