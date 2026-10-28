// Original illustrations for the landing page, drawn as inline SVG (no image files, sharp at any size).
// A Kuala Lumpur skyline at golden hour with bunga raya (hibiscus) in the foreground.

// One hibiscus flower centred on (0,0), about 160px across at scale 1.
export function hibiscus(id='h',{petal='#e0263c',deep='#9c0f2b',edge='#ff6b7d'}={}){
 const petals=[0,72,144,216,288].map(angle=>`<path transform="rotate(${angle})" d="M0 0 C-30-14-46-50-30-74 C-20-90 2-92 14-84 C30-74 34-56 30-40 C26-22 16-8 0 0Z" fill="url(#${id}-petal)" stroke="${deep}" stroke-opacity=".35" stroke-width="1.2"/><path transform="rotate(${angle})" d="M-2-6 C-8-30-6-52 4-72" fill="none" stroke="${deep}" stroke-opacity=".28" stroke-width="1.4"/>`).join('');
 return `<defs><radialGradient id="${id}-petal" cx="0" cy="0" r="86" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${deep}"/><stop offset=".28" stop-color="${deep}"/><stop offset=".42" stop-color="${petal}"/><stop offset="1" stop-color="${edge}"/></radialGradient></defs>
 <g>${petals}
 <circle r="9" fill="${deep}"/>
 <path d="M0 0 C10-18 18-40 34-62" fill="none" stroke="#ffd34d" stroke-width="3.2" stroke-linecap="round"/>
 <g fill="#ffd34d">${[[30,-56],[37,-63],[28,-64],[38,-54],[33,-69]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>
 <g fill="#c8102e">${[[36,-74],[42,-68],[29,-72]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g></g>`;
}

function leaf(x,y,rotate,scale=1,fill='#11745f'){
 return `<path transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" d="M0 0 C18-22 54-26 80-6 C54 14 20 14 0 0Z" fill="${fill}"/><path transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" d="M2 0 C30-6 52-6 78-6" stroke="#0a4f41" stroke-width="1.4" fill="none" opacity=".6"/>`;
}

// A stylised twin-tower silhouette: stacked, tapering tiers with a pinnacle and spire.
function tower(cx,base,shade){
 const tiers=[[46,base,base-176],[40,base-176,base-226],[33,base-226,base-262],[26,base-262,base-288],[19,base-288,base-306],[12,base-306,base-320]];
 const blocks=tiers.map(([w,y0,y1])=>`<rect x="${cx-w/2}" y="${y1}" width="${w}" height="${y0-y1}" fill="${shade.body}"/><rect x="${cx}" y="${y1}" width="${w/2}" height="${y0-y1}" fill="${shade.light}"/>`).join('');
 const ribs=Array.from({length:7},(_,i)=>`<line x1="${cx-23+i*7.6}" x2="${cx-23+i*7.6}" y1="${base}" y2="${base-176}" stroke="${shade.line}" stroke-width="1"/>`).join('');
 return `${blocks}${ribs}<path d="M${cx-6} ${base-320} L${cx} ${base-344} L${cx+6} ${base-320}Z" fill="${shade.body}"/><line x1="${cx}" x2="${cx}" y1="${base-344}" y2="${base-392}" stroke="${shade.body}" stroke-width="3" stroke-linecap="round"/>`;
}

export function klSunset(){
 const navy={body:'#1f2466',light:'#2d3485',line:'#3a42a0'};
 const far='#6b5aa8',mid='#3d3f8f';
 const city=[[18,330,34],[56,360,28],[92,300,30],[130,342,22],[392,318,30],[430,350,26],[528,330,34],[566,356,24]];
 const windows=[];for(const [x,y,w] of city)for(let row=y+14;row<470;row+=18)for(let col=x+6;col<x+w-6;col+=9)if((row*7+col*3)%5<2)windows.push(`<rect x="${col}" y="${row}" width="3.5" height="6" rx="1" fill="#ffd77a" opacity=".8"/>`);
 return `<svg class="landing-art-svg" viewBox="0 0 600 560" role="img" aria-labelledby="kl-art-title" xmlns="http://www.w3.org/2000/svg">
 <title id="kl-art-title">Illustration of the Kuala Lumpur skyline at sunset with hibiscus flowers in front</title>
 <defs>
  <linearGradient id="kl-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset=".45" stop-color="#ffab5e"/><stop offset=".8" stop-color="#ffd98a"/><stop offset="1" stop-color="#ffe9b8"/></linearGradient>
  <radialGradient id="kl-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d6"/><stop offset=".6" stop-color="#ffe9a6"/><stop offset="1" stop-color="#ffe9a6" stop-opacity="0"/></radialGradient>
  <linearGradient id="kl-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f6b58"/><stop offset="1" stop-color="#084438"/></linearGradient>
  <clipPath id="kl-frame"><rect width="600" height="560" rx="32"/></clipPath>
 </defs>
 <g clip-path="url(#kl-frame)">
  <rect width="600" height="560" fill="url(#kl-sky)"/>
  <circle cx="300" cy="300" r="170" fill="url(#kl-sun)"/>
  <circle cx="300" cy="300" r="78" fill="#fff4cc" opacity=".9"/>
  <g fill="#fff" opacity=".55"><path d="M60 120 q24-18 48 0 q18-12 36 2 h-84z"/><path d="M430 90 q20-14 40 0 q16-10 30 2 h-70z"/><path d="M470 170 q14-10 28 0 q12-8 22 2 h-50z"/></g>
  <g stroke="#7a3b2e" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"><path d="M150 150 q6-6 12 0 q6-6 12 0"/><path d="M178 132 q5-5 10 0 q5-5 10 0"/></g>
  <path d="M0 400 L40 380 L70 392 L110 360 L150 384 L200 372 L250 390 L300 380 L350 392 L400 366 L450 386 L500 362 L560 384 L600 372 V470 H0Z" fill="${far}" opacity=".45"/>
  ${city.map(([x,y,w],i)=>`<rect x="${x}" y="${y}" width="${w}" height="${470-y}" fill="${i%2?mid:'#34377f'}"/>`).join('')}
  ${windows.join('')}
  <g>
   <rect x="474" y="250" width="12" height="220" fill="${navy.body}"/>
   <rect x="480" y="250" width="6" height="220" fill="${navy.light}"/>
   <path d="M460 236 Q480 214 500 236 L496 252 Q480 260 464 252Z" fill="${navy.body}"/>
   <rect x="462" y="238" width="36" height="6" rx="3" fill="#ffd77a" opacity=".85"/>
   <line x1="480" x2="480" y1="216" y2="150" stroke="${navy.body}" stroke-width="3" stroke-linecap="round"/>
  </g>
  ${tower(258,470,navy)}${tower(342,470,navy)}
  <rect x="268" y="324" width="64" height="7" fill="${navy.body}"/>
  <path d="M276 331 L300 360 L324 331" stroke="${navy.body}" stroke-width="4" fill="none"/>
  <g fill="#ffd77a" opacity=".75">${Array.from({length:9},(_,i)=>`<rect x="${242+(i%3)*12}" y="${300+Math.floor(i/3)*40}" width="3" height="10" rx="1"/><rect x="${326+(i%3)*12}" y="${318+Math.floor(i/3)*40}" width="3" height="10" rx="1"/>`).join('')}</g>
  <path d="M0 470 Q150 446 300 462 T600 456 V560 H0Z" fill="url(#kl-ground)"/>
  <g>
   <path d="M86 560 C92 500 96 460 120 410" stroke="#5b3a24" stroke-width="9" fill="none" stroke-linecap="round"/>
   ${[[-150,1],[-120,.95],[-75,1],[-30,.9],[10,.85],[-180,.8]].map(([r,s])=>leaf(120,410,r,s,'#0d7a5f')).join('')}
   <path d="M548 560 C540 510 532 480 506 440" stroke="#5b3a24" stroke-width="8" fill="none" stroke-linecap="round"/>
   ${[[-160,.85],[-120,.8],[-70,.85],[-20,.75],[-200,.7]].map(([r,s])=>leaf(506,440,r,s,'#118a6b')).join('')}
  </g>
  ${leaf(330,560,-60,1.3,'#0e7a5c')}${leaf(400,555,-130,1.1,'#0b6b50')}${leaf(70,520,-20,1.2,'#0b6b50')}
  <g transform="translate(150 500) scale(.95)">${hibiscus('kl-h1')}</g>
  <g transform="translate(440 520) rotate(28) scale(.7)">${hibiscus('kl-h2')}</g>
  <g transform="translate(560 470) rotate(-20) scale(.45)">${hibiscus('kl-h3',{petal:'#f0445a',deep:'#a3132d',edge:'#ff8a99'})}</g>
 </g>
</svg>`;
}

// A single small flower as a standalone SVG, for accents beside headings and in the closing band.
export function hibiscusMark(id,size=56){
 return `<svg xmlns="http://www.w3.org/2000/svg" class="hibiscus-mark" width="${size}" height="${size}" viewBox="-90 -90 180 180" aria-hidden="true" focusable="false">${hibiscus(id)}</svg>`;
}

// ---------- Malaysian motifs, drawn for Apexelerate (each fits a 200x200 box) ----------
const svg=(body,{size=120,label='',cls='motif'}={})=>`<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" width="${size}" height="${size}" viewBox="0 0 200 200" ${label?`role="img" aria-label="${label}"`:'aria-hidden="true" focusable="false"'}>${body}</svg>`;

// Wau bulan: the moon kite. An idea taking flight.
export function wau(opts={}){
 const {wing='#d7263d',inner='#ffc933',dark='#1f2466',accent='#0f766e',tail=true}=opts;
 return svg(`<g stroke="${dark}" stroke-width="3" stroke-linejoin="round">
  <path d="M100 38 C70 36 30 44 6 72 C30 80 62 94 100 106 C138 94 170 80 194 72 C170 44 130 36 100 38Z" fill="${wing}"/>
  <path d="M100 52 C78 52 50 58 34 72 C54 78 76 88 100 96 C124 88 146 78 166 72 C150 58 122 52 100 52Z" fill="${inner}" stroke-width="2"/>
  <path d="M60 66 Q80 72 100 82 Q120 72 140 66" fill="none" stroke="${wing}" stroke-width="3"/>
  <path d="M88 106 Q100 114 112 106 L108 124 Q100 128 92 124Z" fill="${accent}"/>
  <path d="M28 126 C48 184 152 184 172 126 C150 152 122 162 100 160 C78 162 50 152 28 126Z" fill="${wing}"/>
  <path d="M52 140 C70 164 130 164 148 140" fill="none" stroke="${inner}" stroke-width="4"/>
  <path d="M92 38 L100 12 L108 38Z" fill="${accent}"/>
  <line x1="100" y1="12" x2="100" y2="172" stroke-width="3"/>
 </g>
 <circle cx="100" cy="74" r="7" fill="${dark}"/><circle cx="100" cy="74" r="3" fill="${inner}"/>
 <circle cx="44" cy="70" r="3.5" fill="${dark}"/><circle cx="156" cy="70" r="3.5" fill="${dark}"/>
 ${tail?`<path d="M100 172 C96 184 106 190 100 200" fill="none" stroke="${dark}" stroke-width="2" stroke-dasharray="4 4"/>`:''}`,opts);
}

// Ketupat: woven palm-leaf casing. Things woven together.
export function ketupat(opts={}){
 const {a='#2f9e6a',b='#1d7a4f',line='#0d4f33'}=opts;
 const cells=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)cells.push(`<rect x="${-48+c*24}" y="${-48+r*24}" width="24" height="24" fill="${(r+c)%2?a:b}"/>`);
 const weave=[];for(let i=1;i<4;i++){weave.push(`<line x1="${-48+i*24}" y1="-48" x2="${-48+i*24}" y2="48"/>`,`<line x1="-48" y1="${-48+i*24}" x2="48" y2="${-48+i*24}"/>`);}
 const stitches=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)stitches.push(`<path d="M${-44+c*24} ${-36+r*24} q8-6 16 0" />`);
 return svg(`<path d="M100 40 C110 22 126 14 146 12 M100 40 C96 20 104 8 120 2" fill="none" stroke="${a}" stroke-width="7" stroke-linecap="round"/>
 <g transform="translate(100 108) rotate(45)"><rect x="-50" y="-50" width="100" height="100" rx="10" fill="${line}"/>${cells.join('')}<g stroke="${line}" stroke-width="2">${weave.join('')}</g><g stroke="#ffffff" stroke-opacity=".35" stroke-width="2" fill="none">${stitches.join('')}</g></g>`,opts);
}

// Tanglung: a paper lantern. Lighting the way.
export function tanglung(opts={}){
 const {body='#d7263d',gold='#ffc933',dark='#8d1024'}=opts;
 return svg(`<line x1="100" y1="0" x2="100" y2="34" stroke="#1f2466" stroke-width="3"/>
 <circle cx="100" cy="112" r="88" fill="${gold}" opacity=".18"/>
 <rect x="74" y="32" width="52" height="14" rx="4" fill="${gold}" stroke="${dark}" stroke-width="2"/>
 <ellipse cx="100" cy="106" rx="62" ry="62" fill="${body}" stroke="${dark}" stroke-width="3"/>
 <g fill="none" stroke="${dark}" stroke-width="2" opacity=".55"><ellipse cx="100" cy="106" rx="42" ry="62"/><ellipse cx="100" cy="106" rx="20" ry="62"/></g>
 <ellipse cx="78" cy="88" rx="10" ry="22" fill="#fff" opacity=".22"/>
 <rect x="74" y="166" width="52" height="14" rx="4" fill="${gold}" stroke="${dark}" stroke-width="2"/>
 <g stroke="${gold}" stroke-width="3" stroke-linecap="round"><line x1="92" y1="180" x2="90" y2="198"/><line x1="100" y1="180" x2="100" y2="200"/><line x1="108" y1="180" x2="110" y2="198"/></g>`,opts);
}

// Kompang: a frame drum played to announce good news. Telling your story.
export function kompang(opts={}){
 const {rim='#a3542b',skin='#f6e3b8',dark='#5b2a12'}=opts;
 const tacks=Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return `<circle cx="${92+Math.cos(a)*66}" cy="${104+Math.sin(a)*72}" r="3.4" fill="#ffc933" stroke="${dark}" stroke-width="1"/>`;}).join('');
 return svg(`<ellipse cx="100" cy="108" rx="76" ry="82" fill="${dark}"/>
 <ellipse cx="92" cy="104" rx="76" ry="82" fill="${rim}"/>
 <ellipse cx="92" cy="104" rx="60" ry="66" fill="${skin}" stroke="${dark}" stroke-width="2"/>
 <path d="M70 70 Q92 58 116 70" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/>
 ${tacks}
 <g fill="none" stroke-linecap="round" stroke-width="6"><path d="M172 70 Q186 104 172 138" stroke="#d7263d"/><path d="M186 54 Q206 104 186 154" stroke="#ffc933"/></g>`,opts);
}

// Kedai: a small shop front with a scalloped awning.
export function kedai(opts={}){
 const stripes=Array.from({length:6},(_,i)=>`<rect x="${28+i*24}" y="52" width="24" height="34" fill="${i%2?'#fff':'#d7263d'}"/>`).join('');
 const scallops=Array.from({length:6},(_,i)=>`<path d="M${28+i*24} 86 a12 12 0 0 0 24 0Z" fill="${i%2?'#fff':'#d7263d'}" stroke="#8d1024" stroke-width="1.5"/>`).join('');
 return svg(`<rect x="36" y="80" width="128" height="96" rx="6" fill="#ffe7b0" stroke="#1f2466" stroke-width="3"/>
 <rect x="24" y="36" width="152" height="18" rx="6" fill="#1f2466"/><text x="100" y="50" text-anchor="middle" font-family="Outfit,sans-serif" font-weight="700" font-size="13" fill="#ffc933" letter-spacing="2">KEDAI</text>
 ${stripes}<rect x="28" y="52" width="144" height="34" fill="none" stroke="#8d1024" stroke-width="1.5"/>${scallops}
 <rect x="52" y="110" width="52" height="40" rx="4" fill="#bfe6dc" stroke="#1f2466" stroke-width="3"/><line x1="78" y1="110" x2="78" y2="150" stroke="#1f2466" stroke-width="2"/>
 <rect x="116" y="110" width="34" height="66" rx="4" fill="#0f766e" stroke="#1f2466" stroke-width="3"/><circle cx="142" cy="146" r="3" fill="#ffc933"/>
 <circle cx="66" cy="160" r="8" fill="#d7263d"/><circle cx="84" cy="162" r="7" fill="#ffc933"/>`,opts);
}

// Buku: a stack of books with a pencil.
export function buku(opts={}){
 return svg(`<g stroke="#1f2466" stroke-width="3" stroke-linejoin="round">
 <rect x="34" y="132" width="132" height="30" rx="5" fill="#0f766e"/><rect x="44" y="102" width="118" height="30" rx="5" fill="#ffc933"/><rect x="38" y="72" width="124" height="30" rx="5" fill="#d7263d"/>
 </g><g stroke="#fff" stroke-width="3" opacity=".7"><line x1="52" y1="147" x2="150" y2="147"/><line x1="58" y1="117" x2="146" y2="117"/><line x1="52" y1="87" x2="146" y2="87"/></g>
 <g transform="translate(118 30) rotate(35)"><rect x="0" y="0" width="14" height="70" fill="#ffc933" stroke="#1f2466" stroke-width="3"/><path d="M0 70 L7 88 L14 70Z" fill="#f6e3b8" stroke="#1f2466" stroke-width="3"/><rect x="0" y="-10" width="14" height="10" fill="#f28da0" stroke="#1f2466" stroke-width="3"/></g>`,opts);
}

// Rumah kampung: a house on stilts. Community.
export function rumah(opts={}){
 return svg(`<path d="M100 20 L176 92 H24Z" fill="#1f2466"/><g stroke="#1f2466" stroke-width="5" stroke-linecap="round"><line x1="100" y1="22" x2="84" y2="4"/><line x1="100" y1="22" x2="116" y2="4"/></g><path d="M100 34 L156 88 H44Z" fill="#2d3485"/>
 <path d="M86 70 h28 v18 h-28z" fill="#ffc933" stroke="#1f2466" stroke-width="2"/>
 <rect x="38" y="88" width="124" height="58" fill="#c98b4f" stroke="#5b2a12" stroke-width="3"/>
 <g stroke="#a86a33" stroke-width="2">${Array.from({length:7},(_,i)=>`<line x1="${54+i*16}" y1="90" x2="${54+i*16}" y2="144"/>`).join('')}</g>
 <rect x="56" y="102" width="26" height="26" fill="#ffe7b0" stroke="#5b2a12" stroke-width="3"/><rect x="118" y="100" width="28" height="46" fill="#7a3f1d" stroke="#5b2a12" stroke-width="3"/>
 <g fill="#5b2a12">${[46,78,122,154].map(x=>`<rect x="${x}" y="146" width="7" height="34"/>`).join('')}</g>
 <g stroke="#5b2a12" stroke-width="4"><line x1="124" y1="180" x2="140" y2="146"/><line x1="134" y1="180" x2="150" y2="146"/><line x1="128" y1="170" x2="138" y2="170"/><line x1="133" y1="160" x2="143" y2="160"/></g>
 <path d="M10 182 Q100 168 190 182 V196 H10Z" fill="#2f9e6a"/>`,opts);
}

// Flying wau for the hero sky, as a standalone SVG group positioned by the caller.
export function wauSky(){return wau({size:140,cls:'motif hero-wau'});}

// CSS-ready versions of the motifs, so stylesheets can place them as decoration (url(...) values).
export function artVariables(){
 const url=s=>`url("data:image/svg+xml,${encodeURIComponent(s)}")`;
 return {'--art-wau':url(wau({tail:true})),'--art-ketupat':url(ketupat()),'--art-tanglung':url(tanglung()),'--art-kompang':url(kompang()),'--art-rumah':url(rumah()),'--art-kedai':url(kedai()),'--art-buku':url(buku()),'--art-hibiscus':url(hibiscusMark('css',180)),'--art-wau-small':url(wau({tail:false}))};
}
