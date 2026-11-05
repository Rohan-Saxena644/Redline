import { config } from '../lib/config';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default function Page(){const c=config();return <Workspace initialModes={{ai:c.AI_MODE,payment:c.PAYMENT_MODE,lab:c.LOCAL_LAB==='true',developmentLogin:c.DEV_LOGIN==='true'}}/>;}
