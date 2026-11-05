import { describe,it,expect,afterEach } from 'vitest';
import { proposalSchema } from '../apps/web/lib/catalog';
import { CompatibleModel } from '../apps/web/lib/agent';
afterEach(()=>{process.env.AI_MODE='fixture';process.env.AI_ACCESS_APPROVED='false';});
describe('model trust boundary',()=>{
  it('rejects fabricated prices, merchants, URLs, unsupported actions and duplicate SKUs',()=>{for(const proposal of [{items:[{sku:'mic',quantity:1,price:0}]},{items:[{sku:'mic',quantity:1}],merchant:'attacker'},{items:[{sku:'mic',quantity:1}],url:'https://evil.test'},{action:'capture',items:[{sku:'mic',quantity:1}]},{items:[{sku:'mic',quantity:1},{sku:'mic',quantity:1}]}])expect(proposalSchema.safeParse(proposal).success).toBe(false);});
  it('requires explicitly approved configured model access',async()=>{await expect(new CompatibleModel().action([])).rejects.toThrow('APPROVED_MODEL_ACCESS_REQUIRED');});
  it('validates compatible-provider output and never substitutes fixtures',async()=>{
    process.env.AI_MODE='real';process.env.AI_ACCESS_APPROVED='true';process.env.AI_BASE_URL='http://localhost:1234/v1';process.env.AI_ALLOW_LOCAL='true';process.env.AI_MODEL='explicit-test-double';
    const bad=new CompatibleModel(async()=>Response.json({choices:[{message:{content:'{"action":"capture"}'},finish_reason:'stop'}]}));await expect(bad.action([])).rejects.toThrow('MODEL_ACTION_INVALID');
    const good=new CompatibleModel(async()=>Response.json({choices:[{message:{content:JSON.stringify({action:'searchCatalog',query:'',category:'microphone',sku:null,items:null,explanation:null})},finish_reason:'stop'}],usage:{total_tokens:42}}));const result=await good.action([]);expect(result.action.action).toBe('searchCatalog');expect(result.usage?.total_tokens).toBe(42);
  });
});
