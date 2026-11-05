import { sql, type Kysely } from 'kysely';
export async function up(db:Kysely<unknown>):Promise<void> {
  await sql`
    CREATE TABLE sessions(id text PRIMARY KEY, owner_id text NOT NULL, expires_at text NOT NULL);
    CREATE TABLE missions(id text PRIMARY KEY, owner_id text NOT NULL, mission text NOT NULL, policy jsonb NOT NULL,
      spent integer NOT NULL DEFAULT 0 CHECK(spent>=0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0),
      purchases integer NOT NULL DEFAULT 0 CHECK(purchases>=0), pending integer NOT NULL DEFAULT 0 CHECK(pending>=0), created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX missions_owner ON missions(owner_id);
    CREATE TABLE products(sku text PRIMARY KEY,name text NOT NULL,description text NOT NULL,category text NOT NULL CHECK(category IN('microphone','headphones','accessory')),
      price integer NOT NULL CHECK(price>=0 AND price<=100000000),billing_type text NOT NULL CHECK(billing_type IN('one_time','recurring')),
      stock integer NOT NULL CHECK(stock>=0),reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=stock),version integer NOT NULL DEFAULT 1 CHECK(version>0),tone text NOT NULL);
    CREATE TABLE quotes(id text PRIMARY KEY,mission_id text NOT NULL REFERENCES missions(id),owner_id text NOT NULL,snapshot jsonb NOT NULL,proposal jsonb NOT NULL,decision jsonb NOT NULL,context jsonb NOT NULL,
      ai_mode text NOT NULL CHECK(ai_mode IN('real','fixture','scripted')),payment_mode text NOT NULL CHECK(payment_mode IN('sandbox','simulated')),created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX quotes_mission ON quotes(mission_id);
    CREATE TABLE approvals(id text PRIMARY KEY,owner_id text NOT NULL,mission_id text NOT NULL REFERENCES missions(id),quote_id text NOT NULL UNIQUE REFERENCES quotes(id),operation_id text NOT NULL UNIQUE,
      binding jsonb NOT NULL,status text NOT NULL CHECK(status IN('active','consumed','revoked')),created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE operations(id text PRIMARY KEY,owner_id text NOT NULL,mission_id text NOT NULL REFERENCES missions(id),quote_id text NOT NULL REFERENCES quotes(id),approval_id text NOT NULL UNIQUE REFERENCES approvals(id),
      state text NOT NULL CHECK(state IN('APPROVED','CREATING','AWAITING_BUYER','CAPTURING','COMPLETED','FAILED','CANCELLED','UNKNOWN')),
      payment_mode text NOT NULL CHECK(payment_mode IN('sandbox','simulated')),reserved boolean NOT NULL DEFAULT false,
      create_key text NOT NULL UNIQUE,capture_key text NOT NULL UNIQUE,payload jsonb NOT NULL,payload_hash text NOT NULL,
      provider_order_id text UNIQUE,provider_capture_id text UNIQUE,provider_status text,approval_url text,phase text CHECK(phase IN('create','capture')),attempted_at text,lease_until text,last_error text,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at text NOT NULL,reconcile_after text,reconcile_attempts integer NOT NULL DEFAULT 0,
      CHECK(create_key<>capture_key),CHECK(state<>'COMPLETED' OR provider_capture_id IS NOT NULL));
    CREATE INDEX operations_reconcile ON operations(reconcile_after) WHERE reserved=true;
    CREATE TABLE events(id bigserial PRIMARY KEY,mission_id text NOT NULL REFERENCES missions(id),operation_id text REFERENCES operations(id),kind text NOT NULL,message text NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX events_mission ON events(mission_id,id);
    CREATE TABLE webhook_events(id text PRIMARY KEY,operation_id text REFERENCES operations(id),event_type text NOT NULL,processed_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE rate_limits(id text PRIMARY KEY,count integer NOT NULL,expires_at text NOT NULL);
    CREATE TABLE simulated_orders(id text PRIMARY KEY,request_id text NOT NULL UNIQUE,payload jsonb NOT NULL,evidence jsonb NOT NULL,capture_key text UNIQUE,capture_count integer NOT NULL DEFAULT 0);
  `.execute(db);
}
