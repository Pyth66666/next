// Industry challenge tracks. This is Apexelerate's domain knowledge for each track: real pain
// points, who feels them, data people can actually use, starter ideas and what judges look for.
// It is shown in the brief flow and idea checker, and given to the AI as grounding whenever an
// idea, brainstorm or brief belongs to a track. Keep entries factual and general; no invented
// statistics.

export const tracks=[
 {
  id:'cx',label:'Customer Experience & Support',icon:'☏',
  summary:'Help businesses answer customers faster and keep them happy.',
  problems:[
   'Customer questions arrive on WhatsApp, Instagram, email and phone, and some are never answered',
   'Staff answer the same questions (opening hours, prices, order status) many times a day',
   'Customers cannot see where their order, booking or repair is without asking',
   'Complaints are handled differently by each staff member, with no record of what was promised',
   'Small businesses cannot afford support outside office hours',
   'Feedback and reviews are collected but nobody reads them or acts on them',
   'Customers who speak Bahasa Melayu, English, Chinese or Tamil get uneven service',
   'Handing a conversation from a bot to a person loses the context'
  ],
  users:['Small business owners','Support and front-desk staff','Customers of clinics, shops, salons and repair services','Customer service team leads'],
  data:['Past chat logs and FAQs (with personal details removed)','Order or booking status from an existing system or spreadsheet','Review text from Google Maps or e-commerce platforms','WhatsApp Business messages exported by the owner'],
  ideas:[
   'A shared inbox that pulls WhatsApp, Instagram and email messages into one list with an owner for each',
   'A self-service status page where customers type an order number and see progress',
   'An FAQ assistant that answers common questions in four languages and hands harder ones to staff',
   'A complaint tracker that records the promise made and reminds staff before the deadline',
   'A review digest that groups feedback into themes each week and suggests one fix',
   'A canned-reply library staff can search and personalise in one tap'
  ],
  mvp:['Collect messages from one channel into one list','Let a customer check status without asking','Answer the top ten questions automatically'],
  roles:['Customers and the business owner','Customers, support staff and a team lead','Customers and front-desk staff'],
  judging:['Measurable drop in response time or repeat questions','Smooth hand-off from automation to a person','Works for non-technical staff on a phone','Handles customer data responsibly (PDPA)'],
  pitfalls:['Building a full chatbot before solving one clear question','Ignoring how staff actually work today','Storing customer chats without consent']
 },
 {
  id:'ops',label:'Operations & Productivity',icon:'⚙',
  summary:'Cut repetitive work and make daily operations run smoothly.',
  problems:[
   'Tasks and requests live in chat groups, so nobody knows who owns what',
   'Staff fill the same data into several forms and spreadsheets',
   'Shift schedules are made by hand and changes are missed',
   'Approvals (leave, purchases, claims) wait days because the right person is not reminded',
   'New staff take weeks to learn processes that are not written down',
   'Managers cannot see what is blocked until it is late',
   'Equipment checks and maintenance are forgotten until something breaks',
   'Meeting decisions are not recorded, so the same discussion repeats'
  ],
  users:['Operations managers','Team leads and supervisors','Admin and HR staff','Frontline staff on shifts'],
  data:['Existing spreadsheets and Google Forms','Shift rosters and attendance records','Request or ticket history','Standard operating procedure documents'],
  ideas:[
   'A request board that turns a chat message into a task with one owner and a due date',
   'A shift planner that respects availability and announces changes to the people affected',
   'An approval chaser that reminds the approver and shows the requester where it is stuck',
   'A step-by-step SOP guide new staff can follow on their phone',
   'A maintenance checklist that schedules checks and records who did them',
   'A meeting notes tool that turns decisions into tasks automatically'
  ],
  mvp:['Turn one kind of request into a tracked task','Show who owns each open item','Remind the right person when something is overdue'],
  roles:['Staff and a team lead','Requesters, approvers and an admin','Shift workers and a supervisor'],
  judging:['Hours saved per week, stated honestly','Fits tools the team already uses','Clear ownership and status at a glance','Easy to adopt without training'],
  pitfalls:['Rebuilding a whole project-management suite','Adding steps that make work slower','No plan for how data gets in']
 },
 {
  id:'marketing',label:'Marketing & Content',icon:'✎',
  summary:'Help businesses reach customers with less time and guesswork.',
  problems:[
   'Small businesses post on social media irregularly because creating content takes too long',
   'Owners do not know which posts or promotions actually brought sales',
   'Content must be produced in several languages for Malaysian audiences',
   'Brand look and tone are inconsistent across posts and staff',
   'Promotions are planned without a calendar, so festive seasons (Raya, CNY, Deepavali, 11.11) sneak up',
   'Customer lists sit unused instead of being segmented for follow-ups',
   'Influencer or affiliate results are hard to track',
   'Product photos and descriptions for marketplaces take hours to prepare'
  ],
  users:['Small business owners and solo sellers','Marketing executives','Content creators and social media managers','Online sellers on Shopee, Lazada or TikTok Shop'],
  data:['Past posts and their engagement numbers exported from the platform','Sales records by date','Product catalogue and photos','Customer list with consent to contact'],
  ideas:[
   'A content calendar pre-filled with Malaysian festive dates and a draft post idea for each',
   'A caption helper that writes one post in Bahasa Melayu, English and Chinese in the brand tone',
   'A promo tracker that links each promotion code to the sales it produced',
   'A product listing helper that turns one photo and a few notes into a marketplace description',
   'A simple customer segmenter that suggests who to message for a restock or follow-up',
   'A brand kit page that keeps colours, logos and tone rules in one place for staff'
  ],
  mvp:['Plan a month of posts in one view','Write one post in three languages','Show which promotion led to sales'],
  roles:['The business owner','The owner and a content helper','A marketing executive and a manager'],
  judging:['Clear link between content and business result','Saves real time for a small team','Fits the local audience and languages','Respects platform rules and customer consent'],
  pitfalls:['Generating content nobody reviews','Vanity metrics with no link to sales','Messaging customers without consent']
 },
 {
  id:'data',label:'Data & Decision-Making',icon:'▤',
  summary:'Turn scattered numbers into decisions people can act on.',
  problems:[
   'Data is spread across spreadsheets, apps and paper, so nobody sees the full picture',
   'Reports are built by hand every week and are out of date when read',
   'Managers decide on gut feeling because the numbers are hard to read',
   'Data has errors and duplicates, so people stop trusting it',
   'Staff cannot ask simple questions of their data without help from IT',
   'Early warning signs (falling sales, rising returns) are noticed too late',
   'Public data exists but is hard to use',
   'Sensitive data is shared in ways that break privacy rules'
  ],
  users:['Business owners and managers','Analysts and finance staff','Public-sector officers','NGO and programme leads'],
  data:['Company spreadsheets and exports from sales or accounting tools','Malaysia open data portal (data.gov.my) and OpenDOSM datasets','Survey results','Sensor or app usage logs'],
  ideas:[
   'A one-page dashboard that combines two spreadsheets and highlights what changed this week',
   'An "ask your data" box that answers plain-language questions about a sales sheet and shows the numbers it used',
   'An alert that messages the owner when a key number crosses a threshold',
   'A data-cleaning helper that finds duplicates and mistakes before a report is made',
   'A local insights tool built on public datasets for a specific district or industry',
   'A decision log that records the data behind each decision and checks the outcome later'
  ],
  mvp:['Combine two data sources into one view','Answer one important question automatically','Alert someone when a number goes wrong'],
  roles:['A manager and an analyst','The business owner','Staff who view and an admin who uploads data'],
  judging:['Leads to a specific decision, not just a chart','Shows where each number comes from','Handles messy real data','Protects personal data'],
  pitfalls:['A dashboard with no question behind it','Trusting AI answers without showing the source numbers','Using data without permission']
 },
 {
  id:'esg',label:'Sustainability & ESG',icon:'♻',
  summary:'Help organisations measure and reduce their environmental and social impact.',
  problems:[
   'Companies must report sustainability information but collect it by hand from many teams',
   'Small suppliers are asked for carbon and ESG data by larger customers and do not know how to provide it',
   'Electricity, fuel and water use is tracked on bills but never analysed',
   'Waste and recycling are not measured, so reduction targets cannot be checked',
   'Sustainability claims are hard to back with evidence (greenwashing risk)',
   'Staff and community programmes are run but their impact is not recorded',
   'Reporting standards keep changing and are hard for small teams to follow',
   'Consumers want greener choices but cannot compare products easily'
  ],
  users:['Sustainability and compliance officers','SME owners in supply chains','Facility and operations managers','NGOs and community programme leads'],
  data:['Utility bills (electricity, water, fuel)','Purchase and travel records','Waste collection records','Published emission factors for converting activity data to estimates'],
  ideas:[
   'A bill scanner that turns monthly utility bills into an energy and emissions trend',
   'A supplier ESG questionnaire that small suppliers can fill in once and share with many customers',
   'A waste log that staff update by photo and that shows progress against a target',
   'An evidence locker that links each sustainability claim to its supporting documents',
   'An impact tracker for CSR programmes that records hours, people reached and outcomes',
   'A reporting checklist that explains each disclosure in plain language for small teams'
  ],
  mvp:['Turn one type of bill into a monthly trend','Collect one supplier data set in a standard form','Record one programme and its results'],
  roles:['A sustainability officer and data contributors','A supplier and its customer','Facility staff and a manager'],
  judging:['Uses real activity data rather than guesses','Transparent method behind any estimate','Practical for small companies','Leads to an actual reduction or action'],
  pitfalls:['Precise-looking numbers from weak data','Claiming certification or compliance the tool cannot give','Ignoring the social part of ESG']
 },
 {
  id:'finance',label:'Finance & Accounting',icon:'¤',
  summary:'Make money matters simpler, faster and more accurate.',
  problems:[
   'Receipts and invoices pile up and are keyed in by hand at month end',
   'Small businesses mix personal and business money, so profit is unclear',
   'Late payments from customers squeeze cash flow',
   'Businesses must move to e-invoicing (LHDN MyInvois) and many are unsure how',
   'Expense claims take weeks because receipts and approvals are scattered',
   'Owners cannot see cash flow ahead, so shortfalls are a surprise',
   'Tax deadlines and documents are missed',
   'Young adults and gig workers lack simple tools to budget and save'
  ],
  users:['SME owners and freelancers','Accounts and finance staff','Employees making claims','Students and gig workers managing personal money'],
  data:['Receipts and invoices (photos or PDF)','Bank statements exported as CSV','Accounting tool exports','Sales and purchase records'],
  ideas:[
   'A receipt capture app that reads a photo and files it into the right expense category',
   'A payment reminder tool that sends polite follow-ups for overdue invoices',
   'An e-invoicing readiness checker that explains what a small business needs to prepare',
   'A cash-flow forecaster that shows the next eight weeks from bank and invoice data',
   'A claims flow where staff submit a receipt and approvers approve in one tap',
   'A budgeting coach for gig workers with irregular income'
  ],
  mvp:['Capture and categorise one receipt','Send a reminder for one overdue invoice','Show next month’s cash position'],
  roles:['The business owner and an accountant','Staff, approvers and finance','An individual user'],
  judging:['Accuracy, and an easy way to correct mistakes','Saves clear time at month end','Explains money in plain language','Keeps financial data secure'],
  pitfalls:['Giving tax or investment advice the team cannot stand behind','Moving money or connecting bank logins in a prototype','Weak security for financial records']
 },
 {
  id:'logistics',label:'Logistics & Supply Chain',icon:'⇄',
  summary:'Move goods on time with less waste and fewer surprises.',
  problems:[
   'Stock levels are tracked by hand, so items run out or pile up',
   'Customers and sellers cannot see where a delivery is across different couriers',
   'Delivery routes are planned by memory, wasting time and fuel',
   'Purchase orders, delivery orders and invoices do not match and are checked by hand',
   'Perishable goods expire before they are sold or used',
   'Small suppliers cannot share stock levels with buyers in real time',
   'Returns are slow and costly to process',
   'Warehouse staff waste time searching for items'
  ],
  users:['Warehouse and inventory staff','Online sellers and retailers','Delivery drivers and dispatchers','Procurement officers and suppliers'],
  data:['Stock spreadsheets or point-of-sale exports','Courier tracking numbers and status updates','Delivery addresses and time windows','Purchase orders, delivery orders and invoices'],
  ideas:[
   'A low-stock alert that predicts when each item will run out from recent sales',
   'One tracking page that shows parcels from several couriers in one place',
   'A route planner for a small fleet that orders stops by location and time window',
   'A three-way match checker for purchase orders, delivery orders and invoices',
   'An expiry tracker that flags perishable stock to discount or donate',
   'A bin-location finder that helps staff pick items faster'
  ],
  mvp:['Warn before one item runs out','Show one order’s delivery status','Plan one day’s delivery route'],
  roles:['Warehouse staff and a manager','A seller and their customers','Drivers and a dispatcher'],
  judging:['Measurable reduction in stockouts, delays or waste','Works with the data small players already have','Handles exceptions such as failed deliveries','Simple enough for frontline staff'],
  pitfalls:['Assuming every courier offers an open API','Optimising routes without real constraints','Ignoring what happens when a delivery fails']
 }
];

export const trackById=id=>tracks.find(t=>t.id===id)||null;

// Compact text the AI receives as grounding for one track.
export function trackContext(track){
 if(!track)return '';
 return `Industry track: ${track.label}. ${track.summary}
Known pain points: ${track.problems.join('; ')}.
Typical users: ${track.users.join('; ')}.
Data teams can realistically use: ${track.data.join('; ')}.
What judges look for: ${track.judging.join('; ')}.
Common pitfalls: ${track.pitfalls.join('; ')}.`;
}
