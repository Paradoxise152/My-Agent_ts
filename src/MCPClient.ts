import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { appendJsonLog, isTerminalMinimal, phaseLine } from "./diagnosticLog";

//构建MCP客户端
export default class MCPClient {
    private mcp: Client;
    private command: string;
    private args: string[]
    private transport: StdioClientTransport | null = null;
    private tools: Tool[] = [];
    private readonly label: string;

    constructor(name: string, command: string, args: string[], version?: string) {
        this.label = name;
        this.mcp = new Client({ name, version: version || "0.0.1" });
        this.command = command;
        this.args = args;
    }

    public async init() {
        await this.connectToServer();
    }

    public async close() {
        await this.mcp.close();
    }

    public getTools() {
        return this.tools;
    }

    public callTool(name: string, params: Record<string, any>) {
        return this.mcp.callTool({
            name,
            arguments: params,
        });
    }
    
    //连接MCP服务器
    private async connectToServer() {
        try {
            if (isTerminalMinimal()) {
                phaseLine(`mcp.${this.label.replace(/[^\w.-]+/g, "_")}`, "start", "connect");
            }
            this.transport = new StdioClientTransport({
                command: this.command,
                args: this.args,
            });
            await this.mcp.connect(this.transport);

            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                };
            });
            const toolNames = this.tools.map(({ name }) => name);
            appendJsonLog({
                type: "mcp.connected",
                client: this.label,
                command: this.command,
                args: this.args,
                tools: toolNames,
            });
            if (isTerminalMinimal()) {
                phaseLine(`mcp.${this.label.replace(/[^\w.-]+/g, "_")}`, "end", `tools=${toolNames.join(",")}`);
            } else {
                console.log("Connected to server with tools:", toolNames);
            }
        } catch (e) {
            appendJsonLog({ type: "mcp.connect_failed", client: this.label, error: String(e) });
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }
}