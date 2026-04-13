import fs from "fs";
import path from "path";
import { logtitle } from "./utils";

/** 当前一次 Agent 运行的关联 ID（HTTP 单任务互斥下足够；CLI 可为空） */
let currentRunId: string | null = null;

export function setDiagnosticRunId(id: string | null) {
  currentRunId = id;
}

/** HTTP 服务默认使用简洁终端：仅阶段行；详情进日志文件 */
export function applyHttpServerConsoleDefaults() {
  if (process.env.AGENT_TERMINAL === undefined) {
    process.env.AGENT_TERMINAL = "minimal";
  }
}

export function isTerminalMinimal(): boolean {
  return process.env.AGENT_TERMINAL === "minimal";
}

/** 关闭文件诊断日志（终端阶段行仍保留） */
export function isFileDiagnosticEnabled(): boolean {
  return process.env.AGENT_DIAGNOSTIC_LOG !== "0";
}

export function phaseLine(scope: string, when: "start" | "end", note?: string) {
  const rid = currentRunId ? `[${currentRunId}]` : "";
  const tail = note ? ` ${note}` : "";
  console.log(`[agent]${rid} ${scope}:${when}${tail}`);
}

/** CLI 全量模式下的分节横幅；minimal 下退化为单行阶段标记 */
export function sectionBanner(title: string) {
  if (isTerminalMinimal()) {
    phaseLine(title.toLowerCase().replace(/\s+/g, "_"), "start");
    return;
  }
  logtitle(title);
}

export function appendJsonLog(record: Record<string, unknown>) {
  if (!isFileDiagnosticEnabled()) return;
  const dir = process.env.AGENT_LOG_DIR || path.join(process.cwd(), "logs");
  const file = process.env.AGENT_LOG_FILE || "agent.log";
  fs.mkdirSync(dir, { recursive: true });
  const payload = { ts: new Date().toISOString(), runId: currentRunId ?? undefined, ...record };
  fs.appendFileSync(path.join(dir, file), `${JSON.stringify(payload)}\n`, "utf8");
}
