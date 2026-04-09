# TS + MCP + RAG Agent Demo

这是一个基于 TypeScript + Node.js ESM 的 Agent 示例项目，结合了：

- OpenAI 对话模型（流式输出）
- MCP 工具调用（网页抓取、文件系统写入）
- 简易本地向量检索（RAG）

项目主流程：先对 `knowledge` 目录文档做 embedding 并检索上下文，再把上下文交给 Agent，Agent 根据任务调用 MCP 工具并产出结果文件。

## 功能与特色

- **RAG 检索增强**：将本地知识文档做向量化，按语义检索 TopK 上下文。
- **工具调用能力**：通过 MCP 接入外部工具（如 `mcp-server-fetch`、`@modelcontextprotocol/server-filesystem`）。
- **流式对话输出**：模型响应边生成边打印，便于观察推理与工具调用过程。
- **结构清晰**：`Agent`（编排）、`ChatOpenAI`（LLM 接口）、`MCPClient`（工具客户端）、`EmbeddingRetrievers`（向量检索）。

## 目录说明

- `src/index.ts`：入口，负责环境校验、RAG 构建、Agent 执行。
- `src/Agent.ts`：Agent 主循环，处理工具调用与结果回填。
- `src/ChatOpenAI.ts`：OpenAI Chat Completions 流式调用封装。
- `src/MCPClient.ts`：MCP stdio 客户端封装。
- `src/EmbeddingRetrievers.ts`：embedding 生成与检索逻辑。
- `src/VectorStore.ts`：内存向量库与余弦相似度搜索。

## 环境要求

- Node.js 18+（建议 20+）
- 可用的 OpenAI 兼容接口（支持 `/chat/completions` 与 `/embeddings`）
- 可执行 `npx`，可选 `uvx`（用于 `mcp-server-fetch`）

## 安装

```bash
npm install
```

## 环境变量配置

在项目根目录创建 `.env`：

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
```

## 运行前准备

1. 创建 `knowledge` 目录并放入待检索文本文件（`txt/md/json` 均可按文本读取）。
2. 确认当前机器可以调用 MCP 依赖命令：
  - `uvx mcp-server-fetch`
  - `npx -y @modelcontextprotocol/server-filesystem <output_dir>`

## 运行方式

开发模式（推荐）：

```bash
npm run dev
```

构建并运行：

```bash
npm run build
npm run start
```

## 工作流程

1. **RAG 预处理**（`retrieveContext`）
  读取 `knowledge` 文档 -> 调用 embedding 接口 -> 写入内存向量库 -> 按任务语义检索 TopK 上下文。
2. **Agent 初始化**（`Agent.init`）
  初始化 MCP 客户端并收集工具定义 -> 初始化 Chat 模型并注入工具与上下文。
3. **任务执行**（`Agent.invoke`）
  模型输出若包含 tool calls -> 调用对应 MCP 工具 -> 将工具结果回填给模型 -> 直到无工具调用并返回最终文本。
4. **结果落盘**
  通过文件系统 MCP 工具把内容写到 `output` 目录（例如 `output/antonette.md`）。

## 常见问题

- `**Missing required environment variable`**  
检查 `.env` 是否在项目根目录，变量名是否拼写正确。
- `**Embedding request failed**`  
检查 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、网络连通性、模型名是否可用。
- `**knowledge` 目录不存在**  
在项目根目录手动创建 `knowledge`，并放入至少一个文本文件。
- **MCP 工具初始化失败**  
检查 `uvx`/`npx` 是否可执行，相关包能否下载。

## 成本与 Token 估算（参考）

实际消耗取决于：知识库文本长度、TopK、任务复杂度、工具往返次数、模型单价。

粗略估算方法：

- Embedding 输入 token：`knowledge` 文本总 token + 查询 token
- Chat 输入 token：系统提示 + 上下文（检索结果）+ 历史消息 + 工具结果
- Chat 输出 token：模型文本回复 + 工具调用参数

一个常见小规模场景（仅示例）：

- 知识库总量约 5k tokens，查询 200 tokens，TopK=3  
- 一轮任务含 2~4 次工具调用  
- 可能总计在 **8k ~ 20k tokens**（输入+输出，含 embedding）

计费可按以下方式估算：

1. 到你的模型服务商页面确认所用 chat 模型和 embedding 模型的单价（通常区分 input/output）。
2. 用 `总费用 = 输入token/1M*输入单价 + 输出token/1M*输出单价 (+ embedding费用)` 计算。
3. 第一次跑建议记录响应中的 usage（若服务返回）做实测校准。

> 本仓库不绑定特定厂商计费，以上仅为估算区间与计算方法。

