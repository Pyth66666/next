import {promptFor} from '../../shared/studio-data.js';

// Synthetic projects only. No duplicated-line stress fixture in the headline benchmark.
const briefs=[
 ['booking','Build a booking MVP for local tutors. Students find a tutor, request an available slot and cancel their own bookings. Tutors manage only their own availability. No payments. Prevent double booking and explain a failed request. Budget RM 1,000; mobile first.'],
 ['agency','A client portal for my design agency. Clients review deliverables and leave feedback. Staff upload revisions. Each client can access only their own project. PDFs up to 10 MB; reject other uploads. No public file links or AI-generated client messages. Include an audit trail and empty states.'],
 ['bilingual','Bina sistem tempahan bengkel di Malaysia. Pelanggan hanya boleh lihat tempahan sendiri. Admin urus kapasiti; jangan padam rekod lama. Bahasa Melayu / English. Masa Asia/Kuala_Lumpur. Tiada bayaran online. Jangan hantar WhatsApp tanpa persetujuan. 用户只能查看自己的记录。'],
 ['code','Track warehouse stock. Counts must be non-negative integers; reject simultaneous conflicting updates. Keep this exact API contract:\n```json\n{"sku":"ABC-001","quantity":0,"note":"<|endoftext|>"}\n```\nPOST /api/stock must require the manager role. Never change these field names. No payments or third-party analytics.'],
 ['events','A university hackathon event hub. Organizers create tracks, teams submit GitHub links, judges score assigned teams only. Students must not view scores before publication. Handle missing repositories and withdrawn submissions. No automatic GitHub writes. Show timestamps in Malaysia time and keep keyboard navigation usable.'],
 ['learning','Create a study planner. Learners choose easy, medium or hard and chat or quiz. Store progress per user; do not expose another learner’s answers. Explain mistakes before revealing solutions. Allow data export and confirmed deletion. Support low-bandwidth phones. Do not invent qualifications or course accreditation.']
];
export const benchmarkCases=briefs.flatMap(([id,output])=>['guided','concise'].map(mode=>({id:`${id}-${mode}`,source:promptFor({output},mode)})));
export const fallbackCases=[
 {id:'custom',source:'Only improve login errors. Preserve the existing API; do not add authentication providers.'},
 {id:'test-phase',source:promptFor({output:briefs[0][1]},'guided','test')},
 {id:'modified-wrapper',source:promptFor({output:briefs[1][1]})+'\nExtra rule: no outbound email.'}
];
