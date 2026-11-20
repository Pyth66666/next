// "Learn my app" instant map: works out an app's tech stack, splits its files into parts
// (frontend, backend, data, ...) and lists what each file contains, straight from the code.
// No AI and no network, so the page can show it the moment an app is opened.
// Shared by the server (which has every file's content) and the tests.

const has=(deps,name)=>Object.prototype.hasOwnProperty.call(deps,name);

// [package names, display name, role, plain explanation]
const NODE_STACK=[
 [['next'],'Next.js','Frontend + backend','A React framework that draws the pages and can also run server code for them.'],
 [['nuxt'],'Nuxt','Frontend + backend','A Vue framework that draws the pages and can also run server code for them.'],
 [['@sveltejs/kit'],'SvelteKit','Frontend + backend','A Svelte framework for pages plus the server code behind them.'],
 [['react','react-dom'],'React','Frontend','Builds the screens out of small reusable pieces called components.'],
 [['vue'],'Vue','Frontend','Builds the screens out of components and keeps them in sync with your data.'],
 [['svelte'],'Svelte','Frontend','Builds the screens; turns components into fast plain JavaScript.'],
 [['@angular/core'],'Angular','Frontend','A full framework for building the screens of a web app.'],
 [['react-native','expo'],'React Native','Mobile app','Builds phone apps with React components.'],
 [['electron'],'Electron','Desktop app','Wraps the web app as a desktop program.'],
 [['vite'],'Vite','Tooling','Runs the app while you build it and bundles it for release.'],
 [['express'],'Express','Backend','A small web server: it answers requests from the browser, such as saving or loading data.'],
 [['fastify'],'Fastify','Backend','A fast web server that answers requests from the browser.'],
 [['hono'],'Hono','Backend','A small web server that answers requests from the browser.'],
 [['koa'],'Koa','Backend','A small web server that answers requests from the browser.'],
 [['@nestjs/core'],'NestJS','Backend','A structured framework for building the server side.'],
 [['socket.io','ws'],'WebSockets','Backend','Keeps a live two-way connection, for chat or real-time updates.'],
 [['tailwindcss'],'Tailwind CSS','Styling','Styles the screens with ready-made class names instead of separate CSS files.'],
 [['@prisma/client','prisma'],'Prisma','Database','Talks to the database and describes its tables in a schema file.'],
 [['drizzle-orm'],'Drizzle','Database','Talks to the database with typed queries.'],
 [['mongoose','mongodb'],'MongoDB','Database','Stores data as documents in a MongoDB database.'],
 [['pg','postgres','@neondatabase/serverless'],'PostgreSQL','Database','Stores data in tables in a PostgreSQL database.'],
 [['mysql2','mysql'],'MySQL','Database','Stores data in tables in a MySQL database.'],
 [['sqlite3','better-sqlite3','@electric-sql/pglite'],'SQLite','Database','Stores data in a small database file.'],
 [['@supabase/supabase-js'],'Supabase','Database + sign-in','A hosted database with sign-in built in.'],
 [['firebase','firebase-admin'],'Firebase','Database + sign-in','Google’s hosted database, sign-in and file storage.'],
 [['next-auth','@auth/core'],'Auth.js','Sign-in','Handles signing users in and out.'],
 [['@clerk/nextjs','@clerk/clerk-react'],'Clerk','Sign-in','A hosted service for user accounts and sign-in.'],
 [['stripe','@stripe/stripe-js'],'Stripe','Payments','Takes card payments.'],
 [['openai'],'OpenAI','AI','Sends text to OpenAI models and gets answers back.'],
 [['@anthropic-ai/sdk'],'Claude API','AI','Sends text to Claude models and gets answers back.'],
 [['@google/generative-ai','@google/genai'],'Gemini','AI','Sends text to Google’s Gemini models and gets answers back.'],
 [['three'],'Three.js','Frontend','Draws 3D graphics in the browser.'],
 [['zod'],'Zod','Tooling','Checks that data has the right shape before it is used.'],
 [['typescript'],'TypeScript','Language','JavaScript with types, so mistakes are caught before the app runs.'],
 [['jest','vitest','mocha','@playwright/test','cypress'],'Automated tests','Testing','Runs checks that the code still works after changes.']
];
const PY_STACK=[
 [/^django\b/m,'Django','Backend','A full Python web framework: pages, database and admin in one.'],
 [/^flask\b/m,'Flask','Backend','A small Python web server that answers requests from the browser.'],
 [/^fastapi\b/m,'FastAPI','Backend','A Python web server for building APIs.'],
 [/^streamlit\b/m,'Streamlit','Frontend + backend','Turns a Python script into a simple web app.'],
 [/^sqlalchemy\b/im,'SQLAlchemy','Database','Talks to the database from Python.'],
 [/^(pandas|numpy)\b/m,'Pandas / NumPy','Data','Works with tables and numbers in Python.']
];
const LANGS=[
 [/\.(tsx?|mts)$/,'TypeScript','Language','JavaScript with types.'],
 [/\.(jsx?|mjs|cjs)$/,'JavaScript','Language','The programming language of the web; runs in the browser and on servers.'],
 [/\.py$/,'Python','Language','A readable general-purpose programming language.'],
 [/\.php$/,'PHP','Language','A language that runs on the server to build web pages.'],
 [/\.go$/,'Go','Language','A fast language often used for servers.'],
 [/\.rb$/,'Ruby','Language','A friendly language, often used with Rails for web apps.'],
 [/\.(java|kt)$/,'Java / Kotlin','Language','Languages used for Android apps and servers.'],
 [/\.dart$/,'Flutter (Dart)','Mobile app','Builds phone apps from one codebase.'],
 [/\.swift$/,'Swift','Mobile app','Apple’s language for iPhone apps.'],
 [/\.html?$/,'HTML','Frontend','Describes what is on each page: headings, text, buttons and forms.'],
 [/\.(css|scss|sass|less)$/,'CSS','Styling','Sets colours, fonts, spacing and layout.']
];

function readJson(text){try{return JSON.parse(text);}catch{return null;}}

export function detectStack(files){
 const found=new Map();
 const add=(name,role,plain,why)=>{if(!found.has(name))found.set(name,{name,role,plain,why});};
 for(const pkg of files.filter(f=>/(^|\/)package\.json$/.test(f.path))){
  const j=readJson(pkg.content||'');if(!j)continue;
  const deps={...j.dependencies,...j.devDependencies};
  for(const [names,name,role,plain] of NODE_STACK){const hit=names.find(n=>has(deps,n));if(hit)add(name,role,plain,`${hit} in ${pkg.path}`);}
 }
 const py=files.filter(f=>/(^|\/)(requirements\.txt|pyproject\.toml|Pipfile)$/.test(f.path)).map(f=>f.content||'').join('\n');
 for(const [re,name,role,plain] of PY_STACK)if(re.test(py))add(name,role,plain,'listed in the Python requirements');
 const serverFile=files.find(f=>/\.(m?js|cjs|ts)$/.test(f.path)&&/(from\s+['"](node:)?https?['"]|require\(\s*['"](node:)?https?['"]\s*\)|\.createServer\()/.test(f.content||''));
 if(serverFile&&![...found.values()].some(x=>/Backend/.test(x.role)))add('Node.js server','Backend','Node.js runs JavaScript on the server. This app uses Node’s built-in web server instead of a framework.',serverFile.path);
 for(const [re,name,role,plain] of LANGS){const f=files.find(x=>re.test(x.path));if(f)add(name,role,plain,`files such as ${f.path}`);}
 if(!files.some(f=>/(^|\/)package\.json$/.test(f.path))&&files.some(f=>/\.html?$/.test(f.path))&&!files.some(f=>/\.(py|php|go|rb)$/.test(f.path))&&!found.has('Express'))add('Plain web page','Frontend','No framework: the browser loads the HTML, CSS and JavaScript files directly.','no package.json');
 const order=['Frontend + backend','Frontend','Mobile app','Desktop app','Backend','Database','Database + sign-in','Sign-in','Payments','AI','Styling','Data','Language','Tooling','Testing'];
 return [...found.values()].sort((a,b)=>order.indexOf(a.role)-order.indexOf(b.role));
}

export const PARTS=[
 {id:'frontend',label:'Frontend',plain:'What people see and click: the pages, buttons, forms and styles. It runs in the browser.'},
 {id:'backend',label:'Backend',plain:'The server side. It answers requests from the browser, checks who is signed in, and saves or loads data.'},
 {id:'data',label:'Data',plain:'How information is stored: database tables, models and the rules for what each record holds.'},
 {id:'shared',label:'Shared code',plain:'Helpers and logic used by more than one part of the app.'},
 {id:'setup',label:'Setup',plain:'Settings that tell tools how to install, build and run the app. Usually you set these once.'},
 {id:'tests',label:'Tests',plain:'Automatic checks that the app still works after a change.'},
 {id:'docs',label:'Docs',plain:'Notes written for people: how to install, use or work on the app.'}
];

const BACKEND_CODE=/\b(express\(\)|createServer\(|app\.(get|post|put|patch|delete)\(|router\.(get|post|put|patch|delete)\(|export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b|@app\.route|@router\.(get|post)|FastAPI\(|Flask\(__name__\)|req\.body|res\.json\(|process\.env\.[A-Z_]*(SECRET|DATABASE|KEY))/;

export function partOf(path,content=''){
 const p=path.toLowerCase(),name=p.split('/').pop();
 if(/(^|\/)(readme|changelog|license|contributing)[^/]*$/.test(p)||/\.(md|mdx|txt|rst)$/.test(p)&&!/requirements\.txt$/.test(p)||/(^|\/)docs?\//.test(p))return 'docs';
 if(/(^|\/)(tests?|__tests__|e2e|cypress)\//.test(p)||/\.(test|spec)\.[a-z]+$/.test(p))return 'tests';
 if(/(^|\/)(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|tsconfig[^/]*\.json|jsconfig\.json|vercel\.json|netlify\.toml|dockerfile|docker-compose[^/]*|requirements\.txt|pyproject\.toml|pipfile|\.gitignore|\.env[^/]*|\.eslintrc[^/]*|\.prettierrc[^/]*|launch\.json|[^/]*\.(bat|sh|ps1))$/.test(p)||/\.config\.[a-z]+$/.test(name)||/(^|\/)\./.test(p)||/(^|\/)(scripts?|bin|\.github)\//.test(p))return 'setup';
 if(/(^|\/)(prisma|migrations?|db|database|models?|schemas?|supabase|drizzle|seeds?)\//.test(p)||/\.(sql|prisma)$/.test(p)||/(^|\/)(schema|models?|store|db)\.[a-z]+$/.test(name))return 'data';
 if(/(^|\/)(pages|app)\/api\//.test(p)||/(^|\/)(server|backend|api|routes?|controllers?|middlewares?|functions|lambdas?|handlers?)\//.test(p)||/^(server|app|main|index)\.(mjs|cjs|js|ts|py)$/.test(p)&&BACKEND_CODE.test(content)||/\.(py|php|go|rb|java)$/.test(p))return 'backend';
 if(/(^|\/)(shared|common|lib|utils?|helpers?|core)\//.test(p))return BACKEND_CODE.test(content)?'backend':'shared';
 if(/\.(html?|css|scss|sass|less|jsx|tsx|vue|svelte|astro|svg|png|jpe?g|gif|ico|webp)$/.test(p)||/(^|\/)(public|static|assets|components?|pages|app|src|views?|screens?|styles?|ui|client|frontend)\//.test(p))return BACKEND_CODE.test(content)&&!/\.(html?|css|jsx|tsx|vue|svelte)$/.test(p)?'backend':'frontend';
 return BACKEND_CODE.test(content)?'backend':'shared';
}

const KIND={'.html':'Web page','.htm':'Web page','.css':'Styles','.scss':'Styles','.jsx':'React component file','.tsx':'React component file','.vue':'Vue component','.svelte':'Svelte component','.json':'Settings (JSON)','.md':'Notes (Markdown)','.sql':'Database script','.prisma':'Database schema','.py':'Python code','.mjs':'JavaScript module','.js':'JavaScript','.ts':'TypeScript'};

// What a file contains, found by reading it: routes, screens/components, functions, styles.
// Every item carries the line it starts on, so the page can jump straight to it.
export function fileFacts(path,content=''){
 const lines=String(content).split('\n'),items=[],seen=new Set();
 const push=(kind,name,line)=>{const key=kind+name;if(seen.has(key)||items.length>=40)return;seen.add(key);items.push({kind,name,line});};
 const ext=(/\.[a-z0-9]+$/i.exec(path)?.[0]||'').toLowerCase();
 lines.forEach((l,i)=>{
  const n=i+1;let m;
  if((m=/\b(?:app|router|server|api)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)/.exec(l)))push('Route',`${m[1].toUpperCase()} ${m[2]}`,n);
  else if((m=/path\s*={1,3}\s*['"`](\/[^'"`]*)['"`].*method\s*={1,3}\s*['"`](GET|POST|PUT|PATCH|DELETE)/.exec(l)))push('Route',`${m[2]} ${m[1]}`,n);
  else if((m=/path\.match\(\/\^(\\\/[^$]+)\$/.exec(l)))push('Route',m[1].replace(/\\\//g,'/').replace(/\(\[[^\]]+\][^)]*\)/g,':id').slice(0,60),n);
  else if((m=/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/.exec(l)))push('Route',`${m[1]} (this file’s URL)`,n);
  else if((m=/@(?:app|router|bp)\.(route|get|post|put|delete)\(\s*['"]([^'"]+)/.exec(l)))push('Route',`${m[1]==='route'?'':m[1].toUpperCase()+' '}${m[2]}`,n);
  if((m=/^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/.exec(l)))push(/^[A-Z]/.test(m[1])&&/\.(jsx|tsx)$/.test(ext)?'Component':'Function',m[1],n);
  else if((m=/^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.exec(l)))push(/^[A-Z]/.test(m[1])&&/\.(jsx|tsx)$/.test(ext)?'Component':'Function',m[1],n);
  else if((m=/^\s*(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][\w$]*)/.exec(l)))push('Class',m[1],n);
  else if((m=/^\s*def\s+([A-Za-z_]\w*)\s*\(/.exec(l)))push('Function',m[1],n);
  else if((m=/^\s*model\s+([A-Z]\w*)\s*\{/.exec(l))||(m=/CREATE TABLE(?: IF NOT EXISTS)?\s+["`]?(\w+)/i.exec(l)))push('Table',m[1],n);
  else if(/\.(css|scss|less)$/.test(ext)&&(m=/^\s*(@media[^{]+|[.#]?[a-zA-Z][\w-]*(?:[ .#:>,-][\w-]*){0,3})\s*\{/.exec(l)))push('Style',m[1].trim().slice(0,60),n);
  else if(/\.html?$/.test(ext)&&(m=/<(h1|h2|form|nav|main|header|footer|button)\b[^>]*>([^<]{0,60})/i.exec(l)))push('Page part',`<${m[1].toLowerCase()}>${m[2].trim()?' '+m[2].trim():''}`,n);
 });
 return {kind:KIND[ext]||'File',lines:lines.length,items};
}

// The whole map for an app: stack, parts with their files, and the best file to open first.
export function appMap(files){
 const parts=PARTS.map(p=>({...p,files:[]}));
 for(const f of files){const id=partOf(f.path,f.content);parts.find(p=>p.id===id).files.push(f.path);}
 // Prefer where a beginner would start reading: the main page or app component, then the server.
 const score=f=>{const p=f.path.toLowerCase();return (/^(public\/|src\/)?index\.html?$/.test(p)?80:0)+(/^src\/(app|main)\.(jsx?|tsx?|vue|svelte)$/.test(p)?70:0)+(/(^|\/)(index|main|app|server)\.(html|jsx?|tsx?|mjs|py)$/.test(p)?50:0)+(/^(src\/)?(app|main|index)\./.test(p)?20:0)-p.split('/').length;};
 const code=files.filter(f=>['frontend','backend','data','shared'].includes(partOf(f.path,f.content)));
 const start=(code.length?code:files).slice().sort((a,b)=>score(b)-score(a))[0]?.path||null;
 return {stack:detectStack(files),parts:parts.filter(p=>p.files.length),start};
}
