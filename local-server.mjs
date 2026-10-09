import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createApplication} from './backend/app.mjs';
if(existsSync(resolve('.env')))process.loadEnvFile(resolve('.env'));
const {server,config}=createApplication();
server.listen(config.port,config.host,()=>console.log(`Apexelerate full-stack server: ${config.origin}`));
