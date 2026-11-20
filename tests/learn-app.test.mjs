import test from 'node:test';
import assert from 'node:assert/strict';
import {appMap,detectStack,partOf,fileFacts} from '../shared/app-map.js';
import {buildExplanation,explainFile,explainPrompt} from '../backend/file-explain.mjs';

const app=[
 {path:'package.json',content:JSON.stringify({dependencies:{react:'18',express:'4','@prisma/client':'5'},devDependencies:{vite:'5',tailwindcss:'3'}})},
 {path:'src/App.jsx',content:'export default function App() {\n  return <Home />;\n}\nconst Card = (props) => <div/>;'},
 {path:'src/styles.css',content:'.card {\n  color: red;\n}'},
 {path:'server/index.js',content:"const app = express();\napp.get('/api/orders', list);\napp.post('/api/orders', save);"},
 {path:'prisma/schema.prisma',content:'model Order {\n  id Int @id\n}'},
 {path:'src/utils/format.js',content:'export function money(n) { return n; }'},
 {path:'tests/app.test.js',content:''},
 {path:'README.md',content:'# Shop'},
 {path:'.env.example',content:'DATABASE_URL='}
];

test('stack comes from package.json and file types, frontend first',()=>{
 const names=detectStack(app).map(s=>s.name);
 for(const n of ['React','Express','Prisma','Vite','Tailwind CSS','JavaScript','CSS'])assert.ok(names.includes(n),n);
 assert.ok(names.indexOf('React')<names.indexOf('Express'));
 const plain=detectStack([{path:'index.html',content:''},{path:'app.js',content:''}]).map(s=>s.name);
 assert.ok(plain.includes('Plain web page'));
});

test('files land in the part a beginner would expect',()=>{
 const want={'src/App.jsx':'frontend','src/styles.css':'frontend','server/index.js':'backend','prisma/schema.prisma':'data','src/utils/format.js':'shared','tests/app.test.js':'tests','README.md':'docs','.env.example':'setup','package.json':'setup','.github/workflows/ci.yml':'setup','pages/api/hello.js':'backend'};
 for(const [p,part] of Object.entries(want))assert.equal(partOf(p,app.find(f=>f.path===p)?.content||''),part,p);
 assert.equal(partOf('index.js',"const app = express(); app.get('/x', h)"),'backend');
});

test('facts list routes, components, functions, tables and styles with their lines',()=>{
 assert.deepEqual(fileFacts('server/index.js',app[3].content).items.map(i=>[i.kind,i.name,i.line]),[['Route','GET /api/orders',2],['Route','POST /api/orders',3]]);
 const ui=fileFacts('src/App.jsx',app[1].content).items;
 assert.deepEqual(ui.map(i=>[i.kind,i.name]),[['Component','App'],['Component','Card']]);
 assert.deepEqual(fileFacts('prisma/schema.prisma',app[4].content).items[0],{kind:'Table',name:'Order',line:1});
 assert.equal(fileFacts('src/styles.css',app[2].content).items[0].name,'.card');
});

test('the map groups parts and picks a sensible first file',()=>{
 const m=appMap(app);
 assert.deepEqual(m.parts.map(p=>p.id),['frontend','backend','data','shared','setup','tests','docs']);
 assert.ok(['src/App.jsx','server/index.js'].includes(m.start));
 assert.ok(m.parts.every(p=>p.plain&&p.files.length));
});

test('explanations keep only sections that point at real lines',()=>{
 const e=buildExplanation({summary:'Does things.',sections:[{start:3,end:9,title:'B',explain:'b'},{start:1,end:1,title:'A',explain:'a'},{start:50,end:60,title:'Out',explain:'x'},{start:2,end:2,title:'Empty',explain:''}]},5);
 assert.deepEqual(e.sections.map(s=>[s.title,s.start,s.end]),[['A',1,1],['B',3,5]]);
 assert.equal(buildExplanation({sections:[]},5),null);
 assert.match(explainPrompt({path:'a.js',content:'x\ny',part:'frontend',stack:'React',language:'English'}),/1: x\n2: y/);
});

test('a file is explained once per language and then served from the saved copy',async()=>{
 const repo={files:[{path:'a.js',content:'const a = 1;\nexport default a;'}]};let calls=0;
 const ai=async()=>{calls++;return {text:JSON.stringify({summary:'Holds a number.',sections:[{start:1,end:2,title:'The number',explain:'Keeps 1.'}]})};};
 const first=await explainFile({repo,path:'a.js',language:'English',ai,policy:'',part:'shared',stack:''});
 const again=await explainFile({repo,path:'a.js',language:'English',ai,policy:'',part:'shared',stack:''});
 assert.equal(first.cached,false);assert.equal(again.cached,true);assert.equal(calls,1);
 await explainFile({repo,path:'a.js',language:'Bahasa Melayu',ai,policy:'',part:'shared',stack:''});assert.equal(calls,2);
 await assert.rejects(explainFile({repo,path:'missing.js',language:'English',ai,policy:'',part:'',stack:''}),/not in this app/);
});
