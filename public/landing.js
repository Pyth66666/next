// The public landing page. Bold, warm and Malaysian: KL at sunset, wau, ketupat, tanglung, kompang,
// songket and pucuk rebung patterns, with wave-shaped sections instead of stacked boxes.
import {klSunset,hibiscusMark,wau,ketupat,tanglung,kompang,kedai,buku,rumah} from './art.js';

const wave=(cls,fill)=>`<svg class="wave ${cls}" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 46 C180 6 360 6 540 40 S900 92 1080 52 S1320 8 1440 30 V90 H0Z" fill="${fill}"/></svg>`;

export function landingMarkup({esc,recent,recentName,signedIn}){
 const steps=[
  ['1','Plan it','Answer five simple questions about your idea. We turn your answers into a clear plan, called a brief.',wau({size:96}),'plan'],
  ['2','Build it','Copy the ready-made instructions into an AI app builder such as Lovable, Bolt or Replit. It builds the app for you.',ketupat({size:96}),'build'],
  ['3','Understand it','Upload what was built. Your tutor explains how it works in plain words and helps you fix problems.',tanglung({size:96}),'understand'],
  ['4','Pitch it','Turn your project into a clear story for a hackathon, a grant or an investor, one slide at a time.',kompang({size:96}),'pitch']];
 const people=[
  ['Small business owners','Stop juggling orders in WhatsApp and spreadsheets. Plan the simple tool your shop actually needs.',kedai({size:132})],
  ['Students','Turn an assignment or hackathon idea into a working prototype, and understand every part of it.',buku({size:132})],
  ['Community organisers','Build sign-up, volunteer or booking pages for your surau, club or NGO without hiring a developer.',rumah({size:132})]];
 const faqs=[
  ['Do I need to know how to code?','No. You describe your idea in your own words. An AI app builder writes the code, and Apexelerate helps you understand what it made.'],
  ['What is an AI app builder?','A website, such as Lovable, Bolt or Replit, where you type what you want and it builds a working app. Apexelerate writes the instructions for you so the result matches your idea.'],
  ['Is it free?','Planning your idea, the instructions and the pitch coach are free. A free account saves your projects online. AI app builders have their own free and paid plans.'],
  ['Is my idea private?','Your projects stay in your browser or your own account. Parts of your brief or code are only sent to AI when you ask for AI help.']];
 const account=signedIn?['#dashboard','My projects']:['#account','Sign in'];
 return `<main class="landing">
<header class="landing-bar"><a class="brand" href="#home" aria-label="Apexelerate home"><span class="mark">A</span>apexelerate<span class="brand-dot">.</span></a><nav aria-label="Landing page"><a href="#how">How it works</a><a href="#who">Who it’s for</a><a href="#faq">Questions</a></nav><div class="landing-bar-actions"><a class="landing-signin" href="${account[0]}">${account[1]}</a><button class="button orange" data-action="new">Start free</button></div></header>

<section class="landing-hero">
 <div class="hero-batik" aria-hidden="true"></div>
 <div class="landing-hero-copy">
  <span class="landing-badge"><i></i>Made in Malaysia · for everyone with an idea</span>
  <h1>Turn your big idea into a real app. <span>No coding needed.</span></h1>
  <p>Apexelerate guides you step by step: plan your idea in plain words, get instructions an AI app builder can follow, then learn how your app works and pitch it with confidence.</p>
  <div class="landing-actions"><button class="button orange landing-cta" data-action="new">Start my idea — it’s free</button><a class="button light" href="#how">See how it works</a></div>
  <ul class="landing-points"><li>Five simple questions</li><li>Works on your phone</li><li>English, with Bahasa Melayu tutoring</li></ul>
  ${recent?`<a class="resume-project" href="#project/${esc(recent.id)}"><span class="resume-wau" aria-hidden="true">${wau({size:44,tail:false})}</span><div><small>Pick up where you left off</small><strong>${esc(recentName)}</strong></div><span>Continue →</span></a>`:''}
 </div>
 <div class="landing-art"><div class="landing-arch">${klSunset()}</div><div class="hero-kite" aria-hidden="true">${wau({size:120})}</div><div class="hero-sticker" aria-hidden="true">${hibiscusMark('sticker',92)}</div><span class="hero-tag hero-tag-a">Plan ✓</span><span class="hero-tag hero-tag-b">Build ✓</span></div>
</section>

<section class="band band-navy" id="how" aria-labelledby="how-title">${wave('wave-top','#1f2466')}
 <div class="band-inner">
  <div class="landing-heading on-dark"><span class="landing-kicker">How it works</span><h2 id="how-title">From idea to app in four steps</h2><p>You stay in charge the whole way. Apexelerate does the planning and explaining; an AI app builder does the coding.</p></div>
  <ol class="landing-steps">${steps.map(([n,t,d,art,k])=>`<li class="landing-step step-${k}"><div class="step-art">${art}</div><span class="landing-step-number">${n}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
  <div class="landing-example"><div class="example-art" aria-hidden="true">${kedai({size:150})}</div><div class="example-copy"><span class="landing-kicker">Example</span><h3>A home bakery in Shah Alam</h3><p>Orders came in through WhatsApp and got lost. After five questions, the owner had a one-page plan and instructions for a simple preorder page: pick a cake, choose a date, get a confirmation.</p><div class="landing-example-flow" aria-label="Before and after"><span class="flow-before">Messages everywhere</span><span class="flow-arrow" aria-hidden="true">→</span><span class="flow-after">One preorder page</span></div></div></div>
 </div>${wave('wave-bottom','#fffaf3')}</section>

<section class="landing-section landing-start" aria-labelledby="start-title"><div class="landing-heading"><span class="landing-kicker">Start where you are</span><h2 id="start-title">Where are you right now?</h2></div><div class="start-choices"><button class="start-choice choice-idea" data-action="new"><span class="choice-art" aria-hidden="true">${wau({size:110,inner:'#ffffff',wing:'#ffc933',dark:'#14183d'})}</span><span class="choice-top"><span class="choice-icon" aria-hidden="true">01</span></span><h2>I have an idea</h2><p>Turn it into a clear plan and instructions for your AI builder.</p><span class="choice-bottom">Shape my idea <i>→</i></span></button><a class="start-choice choice-built" href="#repositories"><span class="choice-art" aria-hidden="true">${tanglung({size:96})}</span><span class="choice-top"><span class="choice-icon" aria-hidden="true">02</span></span><h2>I’ve built something</h2><p>Upload the code your AI builder made and learn how it works. Needs a free account.</p><span class="choice-bottom">Understand my app <i>→</i></span></a><a class="start-choice choice-pitch" href="#pitch"><span class="choice-art" aria-hidden="true">${kompang({size:96})}</span><span class="choice-top"><span class="choice-icon" aria-hidden="true">03</span></span><h2>I need to pitch</h2><p>Find your story, one slide at a time. For hackathons, grants or investors.</p><span class="choice-bottom">Prepare my pitch <i>→</i></span></a></div></section>

<section class="landing-section" id="who" aria-labelledby="who-title"><div class="landing-heading"><span class="landing-kicker">Who it’s for</span><h2 id="who-title">Made for people who don’t code</h2></div><div class="landing-people">${people.map(([t,d,art],i)=>`<article class="landing-person person-${i+1}"><div class="person-art">${art}</div><h3>${t}</h3><p>${d}</p></article>`).join('')}</div></section>

<div class="pucuk-rebung" aria-hidden="true"></div>

<section class="landing-section landing-faq-wrap" id="faq" aria-labelledby="faq-title"><div class="faq-side"><div class="landing-heading"><span class="landing-kicker">Questions</span><h2 id="faq-title">Good to know</h2><p>Still unsure? Start anyway — you can stop and come back whenever you like.</p></div><div class="faq-lanterns" aria-hidden="true">${tanglung({size:110})}${tanglung({size:80,body:'#ffc933',gold:'#d7263d',dark:'#8a5a00'})}</div></div><div class="landing-faq">${faqs.map(([q,a],i)=>`<details ${i===0?'open':''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>

<section class="landing-closing">${wave('wave-top','#d7263d')}<div class="closing-inner"><div class="closing-kite" aria-hidden="true">${wau({size:150,wing:'#ffc933',inner:'#ffffff',dark:'#14183d'})}</div><div class="landing-closing-art" aria-hidden="true">${hibiscusMark('close-1',150)}${hibiscusMark('close-2',96)}</div><h2>Your idea deserves a chance.</h2><p>Start with five questions. You can stop and come back any time.</p><button class="button landing-cta-light" data-action="new">Start my idea — it’s free</button></div></section>

<footer class="landing-footer"><div class="songket" aria-hidden="true"></div><div class="footer-inner"><span class="brand footer-brand"><span class="mark">A</span>apexelerate<span class="brand-dot">.</span></span><p>Made in Malaysia, for anyone with an idea worth building.</p><nav aria-label="Footer"><a href="#how">How it works</a><a href="#pitch">Pitch studio</a><a href="#repositories">Learn my app</a><a href="${account[0]}">${account[1]}</a></nav></div></footer>
</main>`;
}
