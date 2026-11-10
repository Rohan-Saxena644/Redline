process.env.DATABASE_URL=process.env.TEST_DATABASE_URL??'postgresql://redline:redline_local_only@localhost:54329/redline_test';
if(!new URL(process.env.DATABASE_URL).pathname.endsWith('_test'))throw new Error('Tests require a dedicated *_test database');
process.env.APP_ORIGIN='http://localhost:3000';process.env.DEV_LOGIN='true';process.env.LOCAL_LAB='true';process.env.PAYMENT_MODE='simulated';process.env.AI_MODE='fixture';
process.env.AI_OUTPUT_MODE='json_schema';
