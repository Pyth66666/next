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
 return `<svg class="hibiscus-mark" width="${size}" height="${size}" viewBox="-90 -90 180 180" aria-hidden="true" focusable="false">${hibiscus(id)}</svg>`;
}
