//根据输入找到数据库中语义最接近的向量
import { logtitle } from "./utils";
import VectorStore from "./VectorStore.js";

export default class EmbeddingRetrievers{
    private vectorStore:VectorStore;
    private embeddingModel:string;

    constructor(embeddingModel:string){
        this.embeddingModel=embeddingModel;
        this.vectorStore=new VectorStore();
    }

    async embedDocument(document: string) {
        logtitle('EMBEDDING DOCUMENT');
        const embedding = await this.embed(document);
        this.vectorStore.addEmbedding(embedding, document);
        return embedding;
    }

    async embedQuery(query: string) {
        logtitle('EMBEDDING QUERY');
        const embedding = await this.embed(query);
        return embedding;
    }

    //嵌入的输出结果是向量数组
    private async embed(document:string):Promise<number[]>{
        const baseUrl = process.env.OPENAI_BASE_URL;
        const apiKey = process.env.OPENAI_API_KEY;
        if (!baseUrl || !apiKey) {
            throw new Error("OPENAI_BASE_URL or OPENAI_API_KEY is missing");
        }
        const response=await fetch(`${baseUrl.replace(/\/$/, '')}/embeddings`,{//后缀加上
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'Authorization':`Bearer ${apiKey}`
            },
            body:JSON.stringify({
                model:this.embeddingModel,
                input:document
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Embedding request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data=await response.json();//data转json
        if (!data?.data?.[0]?.embedding) {
            throw new Error("Embedding response format is invalid");
        }
        console.log(data.data[0].embedding);
        return data.data[0].embedding;
    }

    //向量库检索
    async retrieve(query: string, topK: number = 3): Promise<string[]> {//top-k保留前3个
        const queryEmbedding = await this.embedQuery(query);
        return this.vectorStore.search(queryEmbedding, topK);
    }
}
