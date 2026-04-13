import ChatOpenAI, { type ChatStreamHandler } from "./ChatOpenAI";
import MCPClient from "./MCPClient";
import { appendJsonLog, isTerminalMinimal, phaseLine } from "./diagnosticLog";
import { logtitle } from "./utils";

export type AgentInvokeHooks = {
    onStream?: ChatStreamHandler;
    onToolCall?: (info: { id: string; name: string; arguments: string }) => void;
    onToolResult?: (info: { id: string; name: string; resultText: string }) => void;
};

export default class Agent {
    private mcpClients: MCPClient[];//MCP客户端列表(多个)
    private llm: ChatOpenAI | null = null;
    private model:string;
    private systemPrompt:string;
    private context:string;
    
    constructor(mcpClients: MCPClient[], model:string, systemPrompt:string, context:string) {
        this.mcpClients = mcpClients;
        this.model = model;
        this.systemPrompt = systemPrompt;
        this.context = context;
    }

    //初始化
    public async init(){
        if (isTerminalMinimal()) phaseLine("agent.init", "start");
        else logtitle('INIT LLM and Tools');
        this.llm = new ChatOpenAI(this.model, this.systemPrompt);
        for(const mcpClient of this.mcpClients){
            await mcpClient.init();//遍历初始化MCP客户端
        }
        const tools= this.mcpClients.flatMap(mcpClient=>mcpClient.getTools());//展平压入数组
        this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools, this.context);
        if (isTerminalMinimal()) {
            phaseLine("agent.init", "end", `tools=${tools.length} model=${this.model}`);
        }
    }

    //关闭所有MCP客户端
    public async close(){
        if (isTerminalMinimal()) phaseLine("agent.close", "start", `clients=${this.mcpClients.length}`);
        else logtitle('CLOSE MCP CLIENTS');
        for await (const client of this.mcpClients){
            await client.close();
        }
        if (isTerminalMinimal()) phaseLine("agent.close", "end");
    }

    //对话
    async invoke(prompt: string, hooks?: AgentInvokeHooks) {
        if (!this.llm) throw new Error("LLM not initialized"); //检查大语言模型
        const toolTrace = Boolean(hooks?.onStream) || isTerminalMinimal();
        let response = await this.llm.chat(prompt, hooks?.onStream);
        while (true) {
            if (response.toolCalls.length > 0) {
                //如果需要工具调用
                for (const toolCall of response.toolCalls) {
                    //找到对应的MCP客户端
                    const mcp = this.mcpClients.find((client) =>
                        client.getTools().some((t: any) => t.name === toolCall.function.name),
                    );
                    hooks?.onToolCall?.({
                        id: toolCall.id,
                        name: toolCall.function.name,
                        arguments: toolCall.function.arguments,
                    });
                    if (mcp) {
                        const safeName = toolCall.function.name.replace(/[^\w.-]+/g, "_");
                        if (toolTrace) {
                            phaseLine(`tool.${safeName}`, "start", `id=${toolCall.id}`);
                            appendJsonLog({
                                type: "tool.call",
                                id: toolCall.id,
                                name: toolCall.function.name,
                                arguments: toolCall.function.arguments,
                            });
                        } else {
                            logtitle(`TOOL USE`);
                            console.log(`Calling tool: ${toolCall.function.name}`);
                            console.log(`Arguments: ${toolCall.function.arguments}`);
                        }
                        const result = await mcp.callTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
                        const resultText = JSON.stringify(result);
                        if (toolTrace) {
                            appendJsonLog({
                                type: "tool.result",
                                id: toolCall.id,
                                name: toolCall.function.name,
                                result: resultText,
                            });
                            phaseLine(`tool.${safeName}`, "end", `id=${toolCall.id}`);
                        } else {
                            console.log(`Result: ${resultText}`);
                        }
                        hooks?.onToolResult?.({ id: toolCall.id, name: toolCall.function.name, resultText });
                        this.llm.appendToolResult(toolCall.id, resultText);
                    } else {
                        const err = "ERROR: Tool not found";
                        if (toolTrace) {
                            phaseLine("tool.missing", "start", `id=${toolCall.id} name=${toolCall.function.name}`);
                            appendJsonLog({
                                type: "tool.result",
                                id: toolCall.id,
                                name: toolCall.function.name,
                                result: err,
                                error: true,
                            });
                            phaseLine("tool.missing", "end", `id=${toolCall.id}`);
                        } else {
                            logtitle(`TOOL USE`);
                            console.log(`Calling tool: ${toolCall.function.name}`);
                            console.log(`Arguments: ${toolCall.function.arguments}`);
                            console.log(`Result: ${err}`);
                        }
                        hooks?.onToolResult?.({ id: toolCall.id, name: toolCall.function.name, resultText: err });
                        this.llm.appendToolResult(toolCall.id, err);
                    }
                }
                // 工具调用后,继续循环对话
                response = await this.llm.chat(undefined, hooks?.onStream);
                continue;
            }
            //没有工具调用，结束对话
            await this.close();
            return response.content;
        }
    }


}