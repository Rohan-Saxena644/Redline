import { describe,it,expect,afterEach,vi } from 'vitest';
import { proposalSchema } from '../apps/web/lib/catalog';
import { CompatibleModel } from '../apps/web/lib/agent';
afterEach(()=>{vi.unstubAllEnvs();process.env.AI_MODE='fixture';process.env.AI_ACCESS_APPROVED='false';});
describe('model trust boundary',()=>{
  it('exposes only catalogue/proposal tools and rejects payment, extra arguments and multiple calls',async()=>{
    for(const [key,value]of Object.entries({AI_MODE:'real',AI_ACCESS_APPROVED:'true',AI_BASE_URL:'https://api.groq.com/openai/v1',AI_MODEL:'openai/gpt-oss-20b',AI_API_KEY:'fixture-only',AI_OUTPUT_MODE:'tool_calling'}))vi.stubEnv(key,value);
    let payload:Record<string,unknown>={};
    const call=(name:string,args:unknown)=>({id:'call-1',type:'function',function:{name,arguments:JSON.stringify(args)}});
    const model=(calls:unknown[])=>new CompatibleModel(async(_url,init)=>{payload=JSON.parse(String(init?.body));return Response.json({choices:[{message:{content:null,tool_calls:calls},finish_reason:'tool_calls'}]});});
    const result=await model([call('searchCatalog',{query:'',category:'microphone'})]).action([]);
    expect(result.action).toMatchObject({action:'searchCatalog',query:'',category:'microphone'});expect(result.nativeCall?.id).toBe('call-1');
    expect(payload).toMatchObject({tool_choice:'required',parallel_tool_calls:false});expect(payload).not.toHaveProperty('response_format');
    expect((payload.tools as {function:{name:string}}[]).map(t=>t.function.name)).toEqual(['searchCatalog','inspectProduct','proposeBasket']);
    for(const calls of [[call('capture',{})],[call('proposeBasket',{items:[{sku:'mic',quantity:1,price:0}]})],[call('searchCatalog',{query:'',url:'https://evil.invalid'})],[call('searchCatalog',{query:''}),call('inspectProduct',{sku:'mic'})]])await expect(model(calls).action([])).rejects.toThrow('MODEL_ACTION_INVALID');
  });
  it('uses a bounded Groq reasoning profile without exposing reasoning or unsupported storage fields',async()=>{
    for(const [key,value]of Object.entries({AI_MODE:'real',AI_ACCESS_APPROVED:'true',AI_BASE_URL:'https://api.groq.com/openai/v1',AI_MODEL:'openai/gpt-oss-20b',AI_API_KEY:'fixture-only'}))vi.stubEnv(key,value);
    let payload:Record<string,unknown>={};
    const model=new CompatibleModel(async(_url,init)=>{payload=JSON.parse(String(init?.body));return Response.json({choices:[{message:{content:JSON.stringify({action:'searchCatalog',query:'',category:'microphone',sku:null,items:null,explanation:null})},finish_reason:'stop'}]});});
    await model.action([]);expect(payload).toMatchObject({max_completion_tokens:2048,reasoning_effort:'low',include_reasoning:false});expect(payload).not.toHaveProperty('store');
    vi.stubEnv('AI_BASE_URL','https://other-provider.invalid/v1');
    await model.action([]);expect(payload).toMatchObject({max_completion_tokens:800,store:false});expect(payload).not.toHaveProperty('reasoning_effort');expect(payload).not.toHaveProperty('include_reasoning');
  });
  it('classifies Groq invalid-output errors and only accepts bounded provider retry headers',async()=>{
    for(const [key,value]of Object.entries({AI_MODE:'real',AI_ACCESS_APPROVED:'true',AI_BASE_URL:'https://api.groq.com/openai/v1',AI_MODEL:'openai/gpt-oss-20b',AI_API_KEY:'fixture-only'}))vi.stubEnv(key,value);
    for(const code of ['tool_use_failed','json_validate_failed'])await expect(new CompatibleModel(async()=>Response.json({error:{code,failed_generation:'not recorded'}},{status:400})).action([])).rejects.toThrow('MODEL_ACTION_INVALID');
    for(const status of [401,429,500])await expect(new CompatibleModel(async()=>Response.json({error:{code:'tool_use_failed'}},{status})).action([])).rejects.toThrow(`MODEL_HTTP_${status}`);
    await expect(new CompatibleModel(async()=>Response.json({error:{code:'rate_limit_exceeded'}},{status:429,headers:{'retry-after':'14'}})).action([])).rejects.toMatchObject({code:'MODEL_HTTP_429',retryAfterMs:14250});
    for(const wait of ['-1','NaN','61'])await expect(new CompatibleModel(async()=>Response.json({error:{code:'rate_limit_exceeded'}},{status:429,headers:{'retry-after':wait}})).action([])).rejects.toMatchObject({code:'MODEL_HTTP_429',retryAfterMs:undefined});
    await expect(new CompatibleModel(async()=>Response.json({error:{code:'invalid_request_error'}},{status:400})).action([])).rejects.toThrow('MODEL_HTTP_400');
    vi.stubEnv('AI_BASE_URL','https://other-provider.invalid/v1');
    await expect(new CompatibleModel(async()=>Response.json({error:{code:'tool_use_failed'}},{status:400})).action([])).rejects.toThrow('MODEL_HTTP_400');
  });
  it('rejects fabricated prices, merchants, URLs, unsupported actions and duplicate SKUs',()=>{for(const proposal of [{items:[{sku:'mic',quantity:1,price:0}]},{items:[{sku:'mic',quantity:1}],merchant:'attacker'},{items:[{sku:'mic',quantity:1}],url:'https://evil.test'},{action:'capture',items:[{sku:'mic',quantity:1}]},{items:[{sku:'mic',quantity:1},{sku:'mic',quantity:1}]}])expect(proposalSchema.safeParse(proposal).success).toBe(false);});
  it('requires explicitly approved configured model access',async()=>{await expect(new CompatibleModel().action([])).rejects.toThrow('APPROVED_MODEL_ACCESS_REQUIRED');});
  it('rejects semantically incomplete actions and duplicate basket SKUs before execution',async()=>{
    for(const [key,value]of Object.entries({AI_MODE:'real',AI_ACCESS_APPROVED:'true',AI_BASE_URL:'https://api.groq.com/openai/v1',AI_MODEL:'openai/gpt-oss-20b',AI_API_KEY:'fixture-only'}))vi.stubEnv(key,value);
    const empty={query:null,category:null,sku:null,items:null,explanation:null};
    for(const action of [{...empty,action:'searchCatalog'},{...empty,action:'inspectProduct'},{...empty,action:'proposeBasket'},{...empty,action:'proposeBasket',items:[{sku:'mic',quantity:1},{sku:'mic',quantity:1}]}])await expect(new CompatibleModel(async()=>Response.json({choices:[{message:{content:JSON.stringify(action)},finish_reason:'stop'}]})).action([])).rejects.toThrow('MODEL_ACTION_INVALID');
  });
  it('validates compatible-provider output and never substitutes fixtures',async()=>{
    process.env.AI_MODE='real';process.env.AI_ACCESS_APPROVED='true';process.env.AI_BASE_URL='http://localhost:1234/v1';process.env.AI_ALLOW_LOCAL='true';process.env.AI_MODEL='explicit-test-double';
    const bad=new CompatibleModel(async()=>Response.json({choices:[{message:{content:'{"action":"capture"}'},finish_reason:'stop'}]}));await expect(bad.action([])).rejects.toThrow('MODEL_ACTION_INVALID');
    const good=new CompatibleModel(async()=>Response.json({choices:[{message:{content:JSON.stringify({action:'searchCatalog',query:'',category:'microphone',sku:null,items:null,explanation:null})},finish_reason:'stop'}],usage:{total_tokens:42}}));const result=await good.action([]);expect(result.action.action).toBe('searchCatalog');expect(result.usage?.total_tokens).toBe(42);
  });
});
