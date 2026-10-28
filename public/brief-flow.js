import {detailQuestions} from '../shared/engine.js';

export const problemAreas=[
 {id:'student',label:'Student life',icon:'✦',examples:['Finding a tutor or study group','Keeping group projects on track','Finding internships and opportunities']},
 {id:'business',label:'Small business',icon:'↗',examples:['Handling bookings and customers','Tracking orders or inventory','Reaching new customers']},
 {id:'team',label:'Teams and work',icon:'⌘',examples:['Handoffs between people','Keeping tasks visible','Collecting requests in one place']},
 {id:'community',label:'Events and community',icon:'◎',examples:['Organising volunteers','Making event registration easier','Keeping members informed']},
 {id:'personal',label:'Everyday life',icon:'◌',examples:['Managing a routine','Sharing useful local information','Planning with friends or family']},
 {id:'other',label:'Something else',icon:'✳',examples:['A problem I see around me','A new way to make something easier','My own idea']}
];

const normal=[
 {label:'The problem',question:'What is the problem, and what would you build to help?',hint:'Tell us the situation and your app idea in your own words. You can start with a common problem below.',placeholder:'People in my community struggle to… I would build…'},
 {label:'A small win',question:'What should someone be able to do in the first version?',hint:'Choose one real result. We can leave the rest for later.',placeholder:'Someone can…'},
 {label:'The people',question:'Who needs this, and who else is involved?',hint:'Name the first users and any person who manages the app.',placeholder:'The first users are…'},
 {label:'Keep it small',question:'What must be included, and what can wait?',hint:'Include a deadline or tool constraint if you have one.',placeholder:'The first version needs… It can wait on…'},
 {label:'How it works',question:'What happens from start to finish?',hint:'Imagine one person using it. Include what should happen if a step fails.',placeholder:'First they… Then they… If something goes wrong…'}
];
const detailed=[
 {label:'The real situation',question:'Describe one moment when this problem happens. What would you build to change it?',hint:'Give a concrete scene and your product idea, not a slogan.',placeholder:'When…, people currently…. I want to build…'},
 {label:'A measurable win',question:'What exact task should the first release complete, and how will you know it worked?',hint:'Name a user action, a visible result, and a practical success check.',placeholder:'A user can… We will know it works when…'},
 {label:'People and access',question:'Who are the first users, and what should each role be allowed to do?',hint:'Think about the person using it, any operator, and private information.',placeholder:'Students can… Tutors can… Admins can…'},
 {label:'Scope decisions',question:'Which features are essential now, which are later, and what constraints matter?',hint:'Be explicit about time, budget, devices, language, and sign-in or payments.',placeholder:'Must have… Later… Constraint…'},
 {label:'A real journey',question:'Walk through one complete user journey—including a mistake or failure.',hint:'Describe what someone sees, does, and gets back at each point.',placeholder:'They arrive… choose… confirm… If… then…'}
];

const normalChoices={
 student:[[],['Find and request help in one place','Keep a group task and deadline visible','Discover a relevant opportunity'],['Students and a coordinator','Students and tutors','Club members and organisers'],['Works on a phone; no payment in version one','Use school email; simple sign-in only'],['Open the page; choose an option; confirm; see the result']],
 business:[[],['Take a booking without back-and-forth messages','Let customers check order progress','Show products and receive an enquiry'],['Customers and the business owner','Staff and a manager','Clients and an admin'],['Mobile first; payments can wait','Use existing tools; launch in two weeks'],['Customer opens the page; chooses; submits; receives confirmation']],
 team:[[],['Make every handoff visible to its owner','Collect requests in one shared place','Know which task is blocked'],['Contributors and a team lead','Requesters and operators','Staff across two departments'],['Use current accounts; no new paid tools','Start with one team and expand later'],['Create a request; assign an owner; update status; close it']],
 community:[[],['Register and confirm an event place','Help volunteers pick and complete shifts','Share updates with members'],['Attendees and organisers','Volunteers and coordinators','Members and moderators'],['Works on older phones; free to use','Start with one event and no payment'],['See event; sign up; get confirmation; receive an update']],
 personal:[[],['Track one routine and see progress','Plan a shared activity without losing details','Find the next useful action'],['Just me for now','Friends and family','A small local group'],['Private by default; simple to maintain','Phone first; no account initially'],['Open; add an item; check it; see what is next']],
 other:[[],['Complete one task with less effort','See important information in one place','Help someone make a better decision'],['The person with the problem and an admin','One small group first','Just me, to test it'],['Start with one core feature','Use low-cost tools and keep data minimal'],['Start; do the main action; get a useful result; recover from an error']]
};
const detailedChoices={
 student:['A student misses an important opportunity because information is scattered. I would build…','A group project loses track of decisions. I would build…'],
 business:['A customer abandons a booking because confirmation takes too long. I would build…','An owner cannot see which order needs attention. I would build…'],
 team:['A request crosses teams without a clear owner. I would build…','A handoff is missed because updates live in separate chats. I would build…'],
 community:['A volunteer signs up but receives no clear next step. I would build…','An organiser cannot tell who is attending. I would build…'],
 personal:['A recurring task falls through because there is no simple reminder. I would build…'],
 other:['When a person tries to complete the task, the current workaround fails because… I would build…']
};

export function briefSteps(project){
 const area=problemAreas.find(x=>x.id===project.problemArea)||problemAreas.at(-1);
 const deep=project.briefDepth==='detailed';
 const core=(deep?detailed:normal).map((q,i)=>({...q,kind:'core',index:i,suggestions:deep?(i===0?detailedChoices[area.id]:[]):(i===0?area.examples:normalChoices[area.id][i])}));
 return project.briefDepth==='detailed'?[...core,...detailQuestions.map(q=>({...q,kind:'detail',key:q.id,hint:'Answer what you know. If you are unsure, leave this open for your coding agent.',suggestions:[]}))]:core;
}

export function stepValue(project,step){return step.kind==='core'?project.answers[step.index]||'':project.detailAnswers?.[step.key]||'';}
export function setStepValue(project,step,value){if(step.kind==='core')project.answers[step.index]=value;else (project.detailAnswers??={})[step.key]=value;}
