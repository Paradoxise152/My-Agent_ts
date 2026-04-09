import ChatOpenAI from "./ChatOpenAI";
import MCPClient from "./MCPClient";
import { logtitle } from "./utils";

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
        logtitle('INIT LLM and Tools');
        this.llm = new ChatOpenAI(this.model, this.systemPrompt);
        for(const mcpClient of this.mcpClients){
            await mcpClient.init();//遍历初始化MCP客户端
        }
        const tools= this.mcpClients.flatMap(mcpClient=>mcpClient.getTools());//展平压入数组
        this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools, this.context);
    }

    //关闭所有MCP客户端
    public async close(){
        logtitle('CLOSE MCP CLIENTS');
        for await (const client of this.mcpClients){
            await client.close();
        }
    }

    //对话
    async invoke(prompt:string){
        if(!this.llm) throw new Error('LLM not initialized');//检查大语言模型
        let response=await this.llm.chat(prompt);
        while(true){
            if(response.toolCalls.length>0){//如果需要工具调用
                for(const toolCall of response.toolCalls){
                    //找到对应的MCP客户端
                    const mcp = this.mcpClients.find(client=>client.getTools().some((t: any) => t.name === toolCall.function.name));
                    if(mcp){
                        logtitle(`TOOL USE`);
                        console.log(`Calling tool: ${toolCall.function.name}`);
                        console.log(`Arguments: ${toolCall.function.arguments}`);
                        const result = await mcp.callTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
                        console.log(`Result: ${JSON.stringify(result)}`);
                        this.llm.appendToolResult(toolCall.id, JSON.stringify(result));
                    } else {
                        this.llm.appendToolResult(toolCall.id, 'ERROR: Tool not found');
                    }
                }
                // 工具调用后,继续循环对话
                response = await this.llm.chat();
                continue
            }
            //没有工具调用，结束对话
            await this.close();
            return response.content;
        }
    }


}