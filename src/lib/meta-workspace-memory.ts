/** Browser-memory only: cleared by reload or closing the tab; never persists to storage. */
let accountCache: {userId:string;accountId:string;data:unknown;loadedAt:string}|null=null;
let evaluationCache: {userId:string;accountId:string;since:string;until:string;report:unknown;temporary:{snapshot:string;signature:string}|null;source:string}|null=null;
export const metaWorkspaceMemory={
 getAccount:()=>accountCache,
 setAccount:(value:typeof accountCache)=>{accountCache=value;},
 getEvaluation:()=>evaluationCache,
 setEvaluation:(value:typeof evaluationCache)=>{evaluationCache=value;},
};
let insightsCache: {userId:string;accountId:string;value:unknown}|null=null;
export const metaInsightsMemory={
 get:(userId:string,accountId:string)=>insightsCache?.userId===userId&&insightsCache.accountId===accountId?insightsCache.value:null,
 set:(userId:string,accountId:string,value:unknown)=>{insightsCache={userId,accountId,value};},
};
