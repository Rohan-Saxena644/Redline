import {it,expect} from 'vitest';
import {livePrerequisites} from '../scripts/live-prerequisites';
it('reports exact missing real-service settings without values',()=>{
  expect(livePrerequisites({})).toEqual({ai:['AI_MODE=real','AI_ACCESS_APPROVED=true','AI_BASE_URL','AI_MODEL'],paypal:['PAYMENT_MODE=sandbox','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_MERCHANT_ID']});
  const result=livePrerequisites({AI_MODE:'real',AI_ACCESS_APPROVED:'true',AI_BASE_URL:'https://approved.example/v1',AI_MODEL:'private-model-name',PAYMENT_MODE:'sandbox',PAYPAL_CLIENT_ID:'private-id'});
  expect(result).toEqual({ai:['AI_API_KEY'],paypal:['PAYPAL_CLIENT_SECRET','PAYPAL_MERCHANT_ID']});
  expect(JSON.stringify(result)).not.toContain('private-');
});
it('requires deliberate local model access and permits a keyless local endpoint',()=>{
  const env={AI_MODE:'real',AI_ACCESS_APPROVED:'true',AI_BASE_URL:'http://localhost:1234/v1',AI_MODEL:'existing-local-model'};
  expect(livePrerequisites(env).ai).toEqual(['AI_ALLOW_LOCAL=true']);
  expect(livePrerequisites({...env,AI_ALLOW_LOCAL:'true'}).ai).toEqual([]);
  expect(livePrerequisites({...env,AI_BASE_URL:'invalid'}).ai).toEqual(['AI_BASE_URL (valid URL required)']);
});
