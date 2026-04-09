export interface VectorStoreItem{
    embedding:number[],
    document:string
} 

export default class VectorStore{
    private vectorStore:VectorStoreItem[];

    constructor(){
        this.vectorStore=[];
    }

    //添加向量库
    async addEmbedding(embedding:number[], document:string){
        this.vectorStore.push({embedding, document});
    }

    //向量库检索
    async search(queryEmbedding:number[], topK:number=3){
        const scored = this.vectorStore.map((item) => ({//给每个document一个score，排序
            document: item.document,
            score: this.cosineSimilarity(queryEmbedding, item.embedding),
        }));
        const topKDocuments = scored.sort((a, b) => b.score - a.score).slice(0, topK).map((item) => item.document);
        return topKDocuments;
    }

    //余弦相似度
    private cosineSimilarity(v1:number[], v2:number[]){
        const dotProduct=v1.reduce((sum,v,i)=>sum+v*v2[i],0);//向量1和向量2的点积
        const magnitude1=Math.sqrt(v1.reduce((sum,v)=>sum+v*v,0));//向量1的模：求和再开根
        const magnitude2=Math.sqrt(v2.reduce((sum,v)=>sum+v*v,0));//向量2的模
        return dotProduct/(magnitude1*magnitude2);//余弦相似度
    }
}