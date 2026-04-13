import fs from "fs";
import path from "path";
import EmbeddingRetrievers from "./EmbeddingRetrievers";
import { appendJsonLog, isTerminalMinimal, phaseLine } from "./diagnosticLog";
import { logtitle } from "./utils";

export async function retrieveContextForTask(task: string, topK = 3): Promise<string> {
  const embeddingRetriever = new EmbeddingRetrievers(
    process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  );
  const knowledgeDir = path.join(process.cwd(), "knowledge");
  if (!fs.existsSync(knowledgeDir)) {
    throw new Error(`knowledge directory not found: ${knowledgeDir}`);
  }
  const files = fs.readdirSync(knowledgeDir);
  if (files.length === 0) {
    throw new Error(`knowledge directory is empty: ${knowledgeDir}`);
  }
  for await (const file of files) {
    const content = fs.readFileSync(path.join(knowledgeDir, file), "utf-8");
    await embeddingRetriever.embedDocument(content);
  }
  const chunks = await embeddingRetriever.retrieve(task, topK);
  const context = chunks.join("\n");
  if (isTerminalMinimal()) {
    phaseLine("rag.context", "start", `topK=${topK} chunks=${chunks.length}`);
  } else {
    logtitle("CONTEXT");
    console.log(context);
  }
  appendJsonLog({
    type: "rag.context",
    topK,
    chunkCount: chunks.length,
    charCount: context.length,
    text: context,
  });
  if (isTerminalMinimal()) {
    phaseLine("rag.context", "end", `chars=${context.length}`);
  }
  return context;
}
