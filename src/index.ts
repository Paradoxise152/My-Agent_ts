import MCPClient from "./MCPClient";
import Agent from "./Agent";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { retrieveContextForTask } from "./ragContext";

dotenv.config();

function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const outPath = path.join(process.cwd(), 'output');
fs.mkdirSync(outPath, { recursive: true });
//任务描述
const TASK = `
告诉我Peter的信息,先从我给你的context中找到相关信息,总结后创作一个关于他的简短故事，回答不超过120字。
保存到${outPath}/peter.md。
`

const fetchMCP = new MCPClient("mcp-server-fetch", "uvx", ['mcp-server-fetch']);
const fileMCP = new MCPClient("mcp-server-file", "npx", ['-y', '@modelcontextprotocol/server-filesystem', outPath]);

async function main() {
    // 启动时校验必要环境变量，避免运行中途才报错
    getRequiredEnv("OPENAI_API_KEY");
    getRequiredEnv("OPENAI_BASE_URL");

    // RAG
    const context = await retrieveContext();

    // Agent
    const model = process.env.AGENT_MODEL || "gpt-4o-mini";
    const agent = new Agent([fetchMCP, fileMCP], model, "", context);
    await agent.init();
    await agent.invoke(TASK);
}

main()

async function retrieveContext() {
    const topK = Number(process.env.RAG_TOP_K || "3") || 3;
    return retrieveContextForTask(TASK, topK);
}