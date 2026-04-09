import MCPClient from "./MCPClient";
import Agent from "./Agent";
import path from "path";
import EmbeddingRetrievers from "./EmbeddingRetrievers";
import fs from "fs";
import { logtitle } from "./utils";
import dotenv from "dotenv";

dotenv.config();

function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const URL = 'https://news.ycombinator.com/'
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
    const agent = new Agent([fetchMCP, fileMCP], 'gpt-4o-mini', '', context);
    await agent.init();
    await agent.invoke(TASK);
    await agent.close();
}

main()

async function retrieveContext() {
    // RAG
    const embeddingRetriever = new EmbeddingRetrievers("text-embedding-3-small");//注意修改embedding模型
    const knowledgeDir = path.join(process.cwd(), 'knowledge');//知识库的路径
    const files = fs.readdirSync(knowledgeDir);
    //读文件并嵌入
    for await (const file of files) {
        const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');
        await embeddingRetriever.embedDocument(content);
    }
    //检索上下文    
    const context = (await embeddingRetriever.retrieve(TASK, 3)).join('\n');//top-k保留前3个
    logtitle('CONTEXT');
    console.log(context);
    return context
}