import {buildPack} from './engine.js';

export function promptFor(project,mode='guided',phase='build',change='') {
 const brief=project.output||'';
 const rules='Preserve all requirements and permissions. Use server-side authorization where needed. Keep secrets out of source. Include useful error states and responsive, accessible UI. Test the main journey and failure cases; report actual results and limitations.';
 const voice=mode==='concise'?'Keep routine updates brief. Report changed files, test results, and blockers. Preserve complete code, exact paths, and errors. Explain complex decisions when asked.':'Explain major decisions in plain language. Work in small verifiable steps. At each milestone, explain what changed and how I can check it.';
 if(phase==='change')return `# Focused change request\n\nWork in the existing repository.\n\nRequested change:\n${change.trim()||'[Describe the change before sending]'}\n\nFind the affected code and inspect its dependencies. Preserve existing functionality and project conventions. Ask if the change conflicts with the approved scope. Implement and test only the relevant change.\n\n${rules}\n\n${voice}\n\nThis prompt assumes your agent already has the project context. Include the original brief if starting a new conversation.`;
 if(phase==='test')return `# Verify my MVP\n\nApproved brief:\n${brief}\n\nInspect the existing repository. Map each requirement to an observable acceptance test. Check the main user journey, roles and access, failure cases, and mobile layout. Run available checks. Report pass/fail/not-tested with evidence; do not invent results. Explain issues before proposing changes.\n\n${voice}`;
 if(mode==='guided')return buildPack(project);
 return `# Build my MVP\n\nApproved brief (preserved):\n${brief}\n\nConfirm material unknowns, then implement the smallest suitable solution. Avoid unrequested features.\n\n${rules}\n\nDeliver README setup steps, .env.example with names only, and ARCHITECTURE.md mapping features to real files. Explain how to save the source in GitHub.\n\n${voice}\n\nTemplate-generated handoff; review before sharing. No token savings are guaranteed.`;
}
export function projectStage(p){if(!p.output)return 'draft';if(p.tasks.length&&p.tasks.every(t=>t.done))return 'complete';if(p.tasks.some(t=>t.done))return 'building';return 'ready';}
export function selectProjects(projects,{query='',stage='all',type='all',sort='recent'}={}){
 const result=projects.filter(p=>(stage==='all'||projectStage(p)===stage)&&(type==='all'||p.type===type)&&[...p.answers,p.output||''].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 return result.sort((a,b)=>sort==='name'?(a.answers[0]||'').localeCompare(b.answers[0]||''):sort==='oldest'?(a.created||0)-(b.created||0):(b.updated||b.created||0)-(a.updated||a.created||0));
}
