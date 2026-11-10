import {beforeAll,beforeEach,afterEach,afterAll,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {sql} from 'kysely';
import {hash} from '@redline/policy';
import {PayPalSandbox,type CreatePayload,type OrderEvidence} from '@redline/paypal';
import {migrate} from '../../scripts/migrate';
import {seed} from '../../scripts/seed';
import {db,closeDb} from '../../apps/web/lib/db';
import {createMission,ownedMission} from '../../apps/web/lib/domain';
import {runAgent,CompatibleModel} from '../../apps/web/lib/agent';
import {approveBasket,executePurchase,capturePurchase} from '../../apps/web/lib/payments';
import {receipt,replay} from '../../apps/web/lib/receipts';

// Real adapter code and PostgreSQL; HTTP fixtures. No external service is contacted.
// Mode names select adapter paths and do not constitute live integration evidence.
beforeAll(async()=>{await migrate();await seed();});
beforeEach(async()=>{
  await sql`TRUNCATE TABLE missions,simulated_orders CASCADE`.execute(db());
  await db().updateTable('products').set({stock:40,reserved:0}).where('sku','in',['arc-pro','halo-reference','loom-usb','field-monitor']).execute();
  for(const [key,value] of Object.entries({AI_MODE:'real',AI_ACCESS_APPROVED:'true',AI_BASE_URL:'https://model.invalid/v1',AI_MODEL:'http-fixture',AI_API_KEY:'fixture-only',PAYMENT_MODE:'sandbox',PAYPAL_CLIENT_ID:'fixture-id',PAYPAL_CLIENT_SECRET:'fixture-secret',PAYPAL_MERCHANT_ID:'FIXTUREMERCHANT'}))vi.stubEnv(key,value);
});
afterEach(()=>vi.unstubAllEnvs());afterAll(closeDb);

it('runs model HTTP fixtures through rejection, fixed-policy repair, exact approval and capture HTTP fixtures',async()=>{
  const owner=randomUUID(),mission=await createMission(owner,{mission:'Choose a microphone and headphones for streaming.',maxTotal:15000,maxPurchases:1,maxQuantity:1,requiredCategories:['microphone','headphones'],expiresAt:new Date(Date.now()+3600_000).toISOString()});
  const prompts:string[]=[];
  const model=new CompatibleModel(async(url,init)=>{
    expect(url).toBe('https://model.invalid/v1/chat/completions');prompts.push(String(init?.body));
    const skus=prompts.length===1?['arc-pro','halo-reference']:['loom-usb','field-monitor'];
    return Response.json({choices:[{message:{content:JSON.stringify({action:'proposeBasket',query:null,category:null,sku:null,items:skus.map(sku=>({sku,quantity:1})),explanation:'HTTP fixture, not live inference'})},finish_reason:'stop'}]});
  });
  // Attack the actual approval service before allowing the next model action.
  const action=model.action.bind(model);let rejectedId='';
  vi.spyOn(model,'action').mockImplementation(async messages=>{
    if(prompts.length===1){
      const rejected=await db().selectFrom('quotes').selectAll().where('mission_id','=',mission.id).executeTakeFirstOrThrow();
      rejectedId=rejected.id;expect(rejected.snapshot.total).toBe(15603);
      await expect(approveBasket(owner,rejected.id,{policyHash:rejected.decision.policyHash,quoteHash:rejected.decision.quoteHash})).rejects.toThrow('BUDGET_EXCEEDED');
      expect(await db().selectFrom('operations').selectAll().where('mission_id','=',mission.id).execute()).toHaveLength(0);
      expect(await db().selectFrom('approvals').selectAll().where('mission_id','=',mission.id).execute()).toHaveLength(0);
    }
    return action(messages);
  });
  const result=await runAgent(owner,mission.id,false,false,model);
  expect(result.status).toBe('allowed');expect(prompts).toHaveLength(2);expect(prompts[1]).toContain('BUDGET_EXCEEDED');
  const reviewed=await receipt(owner,result.quoteId!);
  expect(reviewed.snapshot.quote.total).toBe(12363);
  expect(reviewed.repair).toMatchObject({previousQuoteId:rejectedId,comparison:{samePolicy:true,resolvedReasons:['BUDGET_EXCEEDED']}});
  expect((await ownedMission(owner,mission.id)).policy).toEqual(mission.policy);
  const {operationId}=await approveBasket(owner,result.quoteId!,{policyHash:reviewed.decision.policyHash,quoteHash:reviewed.decision.quoteHash});
  let buyerApproved=false,captured=false,creates=0,captures=0;const requestIds:string[]=[];
  const provider=new PayPalSandbox({baseUrl:'https://api-m.sandbox.paypal.com',clientId:'fixture-id',clientSecret:'fixture-secret'},async(url,init)=>{
    const path=new URL(String(url)).pathname;
    if(path==='/v1/oauth2/token')return Response.json({access_token:'fixture-token',expires_in:300});
    const headers=new Headers(init?.headers);expect(headers.get('authorization')).toBe('Bearer fixture-token');
    if(path==='/v2/checkout/orders'&&init?.method==='POST'){
      creates++;requestIds.push(headers.get('paypal-request-id')!);
      const payload=JSON.parse(String(init.body)) as CreatePayload;
      expect(payload.purchase_units[0]).toMatchObject({reference_id:operationId,custom_id:operationId,payee:{merchant_id:'FIXTUREMERCHANT'},amount:{value:'123.63',breakdown:{shipping:{value:'6.99'},tax_total:{value:'8.64'}}}});
      return Response.json({id:'FIXTUREORDER1'}, {status:201});
    }
    if(path==='/v2/checkout/orders/FIXTUREORDER1/capture'&&init?.method==='POST'){
      expect(buyerApproved).toBe(true);captures++;captured=true;requestIds.push(headers.get('paypal-request-id')!);
      return Response.json({id:'FIXTUREORDER1',status:'COMPLETED'});
    }
    expect(path).toBe('/v2/checkout/orders/FIXTUREORDER1');expect(init?.method).toBe('GET');
    const usd=(value:string)=>({currency_code:'USD',value});
    const evidence:OrderEvidence={id:'FIXTUREORDER1',intent:'CAPTURE',status:captured?'COMPLETED':buyerApproved?'APPROVED':'PAYER_ACTION_REQUIRED',purchase_units:[{reference_id:operationId,custom_id:operationId,payee:{merchant_id:'FIXTUREMERCHANT'},amount:{...usd('123.63'),breakdown:{item_total:usd('108.00'),shipping:usd('6.99'),tax_total:usd('8.64')}},items:[{sku:'loom-usb',name:'Loom USB microphone',quantity:'1',unit_amount:usd('59.00')},{sku:'field-monitor',name:'Field monitor headphones',quantity:'1',unit_amount:usd('49.00')}],...(captured?{payments:{captures:[{id:'FIXTURECAPTURE1',status:'COMPLETED',amount:usd('123.63'),final_capture:true}]}}:{})}],links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=FIXTUREORDER1'}]};
    return Response.json(evidence);
  });
  expect((await executePurchase(owner,operationId,provider)).state).toBe('AWAITING_BUYER');
  await expect(capturePurchase(owner,operationId,provider)).rejects.toThrow('BUYER_APPROVAL_REQUIRED');expect(captures).toBe(0);
  buyerApproved=true;expect((await capturePurchase(owner,operationId,provider)).state).toBe('COMPLETED');
  await capturePurchase(owner,operationId,provider);expect({creates,captures}).toEqual({creates:1,captures:1});
  expect(requestIds.every(id=>/^[a-f0-9-]{36}$/.test(id))).toBe(true);expect(requestIds[0]).not.toBe(requestIds[1]);
  expect((await receipt(owner,result.quoteId!)).provider).toMatchObject({orderId:'FIXTUREORDER1',captureId:'FIXTURECAPTURE1',operationState:'COMPLETED'});
  expect(await replay(owner,result.quoteId!)).toMatchObject({matches:true,paymentActions:0});
  expect(hash((await ownedMission(owner,mission.id)).policy)).toBe(hash(mission.policy));
});
