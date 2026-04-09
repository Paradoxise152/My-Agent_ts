import OpenAI from "openai"
import { Tool } from "@modelcontextprotocol/sdk/types.js"
import { logtitle } from "./utils"

export interface ToolCall {
    id:string
    function:{
        name:string
        arguments:string
    }
}

interface ChatResult {
    content: string
    toolCalls: ToolCall[]
    reasoningContent: string
}

export default class ChatOpenAI {
    private llm: OpenAI
    private model:string
    private messages:OpenAI.Chat.ChatCompletionMessageParam[]=[]
    private tools:Tool[]=[]

    constructor(model:string,systemPrompt:string='',tools:Tool[]=[],context:string='') {
        this.llm=new OpenAI({
            apiKey:process.env.OPENAI_API_KEY,
            baseURL:process.env.OPENAI_BASE_URL,
        });
        this.model=model
        this.tools=tools

        //系统提示词和前置上下文
        if(systemPrompt) this.messages.push({role:'system',content:systemPrompt})
        if(context) this.messages.push({role:'user',content:context})
    }

    //异步聊天环节
    async chat(prompt?:string): Promise<ChatResult> {
        logtitle('CHAT');
        if (prompt) this.messages.push({role:'user',content:prompt})//提示词
        const stream = await this.llm.chat.completions.create({
            model:this.model,
            messages:this.messages,
            tools:this.getToolsDefinition(),//自定义工具获取
            stream:true,
        })
        let content=''//最终回复内容
        let reasoningContent=''//思考内容（如果有）
        let toolCalls:ToolCall[]=[];//工具调用

        logtitle('RESPONSE');
        for await (const chunk of stream) {//读流式传输每个chunk
            // 某些供应商/网关会发送没有 choices 的心跳包，需跳过
            const choice = chunk.choices?.[0];
            if (!choice?.delta) continue;
            const delta = choice.delta;
            // 处理思考字段（deepseek/gemini 等供应商扩展）
            const reasoningChunk = (delta as any).reasoning_content;
            if (typeof reasoningChunk === "string" && reasoningChunk.length > 0) {
                reasoningContent += reasoningChunk;
            }

            //处理content
            if (delta.content) {
                const contentChunk=delta.content
                content+=contentChunk
                //不要console.log(contentChunk) 不要，避免换行
                process.stdout.write(contentChunk)
            }
            //处理tool_calls
            if (delta.tool_calls) {
                for(const toolCallChunk of delta.tool_calls) {//tool_call会有很多个
                    //第一次接收toolcalls，初始化
                    if(toolCalls.length<=toolCallChunk.index){
                        toolCalls.push({
                            id:'',
                            function:{
                                name:'',
                                arguments:''
                            }
                        })
                    }

                    let currentCall = toolCalls[toolCallChunk.index];
                    if(toolCallChunk.id)  currentCall.id += toolCallChunk.id;
                    if(toolCallChunk.function?.name)  currentCall.function.name += toolCallChunk.function.name;
                    if(toolCallChunk.function?.arguments)  currentCall.function.arguments += toolCallChunk.function.arguments;
                }
            }
        }
        // 兼容“逆向模型”把思考包裹在 <think>...</think> 中的情况
        const extracted = this.extractThinkFromContent(content);
        if (extracted.think) reasoningContent += extracted.think;
        content = extracted.reply;

        //维护messages中assistant的content和tool_calls
        this.messages.push({role:'assistant',content,tool_calls:toolCalls.map(call=>({type:'function',id:call.id,function:call.function}))});
        return {
            content: content,
            toolCalls: toolCalls,
            reasoningContent,
        };
    }

    //暴露给外部的工具调用结果
    public appendToolResult(toolCallId: string, toolOutput: string) {
        this.messages.push({
            role: "tool",
            content: toolOutput,
            tool_call_id: toolCallId
        });
    }

    //openai文档的获取工具函数
    private getToolsDefinition(): OpenAI.Chat.Completions.ChatCompletionTool[] {
        return this.tools.map((tool) => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }));
    }

    private extractThinkFromContent(raw: string): { think: string; reply: string } {
        if (!raw) return { think: "", reply: "" };
        const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
        const thinkParts: string[] = [];
        let match: RegExpExecArray | null = null;
        while ((match = thinkRegex.exec(raw)) !== null) {
            if (match[1]) thinkParts.push(match[1].trim());
        }
        const reply = raw.replace(thinkRegex, "").trim();
        return {
            think: thinkParts.join("\n").trim(),
            reply,
        };
    }


}