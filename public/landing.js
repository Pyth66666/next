// The public landing page. Bold, warm and Malaysian: KL at sunset, wau, ketupat, tanglung, kompang,
// songket and pucuk rebung patterns, with wave-shaped sections instead of stacked boxes.
import {klSunset,wau,ketupat,tanglung,kompang} from './art.js';

const wave=(cls,fill)=>`<svg class="wave ${cls}" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 46 C180 6 360 6 540 40 S900 92 1080 52 S1320 8 1440 30 V90 H0Z" fill="${fill}"/></svg>`;

export function landingMarkup({esc,recent,recentName,signedIn}){
 const steps=[
  ['1','Plan','Answer five questions. Get a clear brief.',wau({size:96}),'plan'],
  ['2','Build','Paste the instructions into Lovable, Bolt or Replit.',ketupat({size:96}),'build'],
  ['3','Understand','See what every line of your code does.',tanglung({size:96}),'understand'],
  ['4','Pitch','Turn it into a pitch, one slide at a time.',kompang({size:96}),'pitch']];
 const faqs=[
  ['Do I need to code?','No. You describe your idea, and an AI app builder writes the code.'],
  ['Is it free?','Planning and pitching are free. Code lessons come with an approved plan.'],
  ['Is my idea private?','Yes. Your work stays in your browser or your own account.']];
 const account=signedIn?['#dashboard','My projects']:['#account','Sign in'];
 return `<main class="landing">
<header class="landing-bar"><a class="brand" href="#home" aria-label="Apexelerate home"><span class="mark">A</span>apexelerate<span class="brand-dot">.</span></a><nav aria-label="Landing page"><a href="#how">How it works</a><a href="#faq">FAQ</a></nav><div class="landing-bar-actions"><a class="landing-signin" href="${account[0]}">${account[1]}</a><button class="button orange" data-action="new">Start free</button></div></header>

<section class="landing-hero">
  <div class="landing-hero-copy">
  <h1>Turn your idea into a real app. <span>No coding needed.</span></h1>
  <p>Plan it, build it with AI, and understand how it works.</p>
  <div class="landing-actions"><button class="button orange landing-cta" data-action="new">Start free</button><a class="button light" href="#how">How it works</a></div>
  ${recent?`<a class="resume-project" href="#project/${esc(recent.id)}"><span class="resume-wau" aria-hidden="true">${wau({size:44,tail:false})}</span><div><small>Continue</small><strong>${esc(recentName)}</strong></div><span>→</span></a>`:''}
 </div>
 <div class="landing-art"><div class="landing-arch">${klSunset()}</div><div class="hero-kite" aria-hidden="true">${wau({size:120})}</div></div>
</section>

<section class="band band-navy" id="how" aria-labelledby="how-title">${wave('wave-top','#1f2466')}
 <div class="band-inner">
  <div class="landing-heading on-dark"><span class="landing-kicker">How it works</span><h2 id="how-title">Four steps</h2></div>
  <ol class="landing-steps">${steps.map(([n,t,d,art,k])=>`<li class="landing-step step-${k}"><div class="step-art">${art}</div><span class="landing-step-number">${n}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
 </div>${wave('wave-bottom','#fffaf3')}</section>

<section class="landing-section landing-start" aria-labelledby="start-title"><div class="landing-heading"><span class="landing-kicker">Get started</span><h2 id="start-title">Where are you now?</h2></div><div class="start-choices"><button class="start-choice choice-idea" data-action="new"><span class="choice-top"><span class="choice-icon" aria-hidden="true">01</span></span><h2>I have an idea</h2><p>Turn it into a plan.</p><span class="choice-bottom">Start <i>→</i></span></button><a class="start-choice choice-built" href="#repositories"><span class="choice-top"><span class="choice-icon" aria-hidden="true">02</span></span><h2>I’ve built an app</h2><p>Learn how your code works.</p><span class="choice-bottom">Upload <i>→</i></span></a><a class="start-choice choice-pitch" href="#pitch"><span class="choice-top"><span class="choice-icon" aria-hidden="true">03</span></span><h2>I need to pitch</h2><p>Build your story, slide by slide.</p><span class="choice-bottom">Pitch <i>→</i></span></a></div></section>

<section class="landing-section landing-faq-wrap" id="faq" aria-labelledby="faq-title"><div class="faq-side"><div class="landing-heading"><span class="landing-kicker">FAQ</span><h2 id="faq-title">Questions</h2></div></div><div class="landing-faq">${faqs.map(([q,a],i)=>`<details ${i===0?'open':''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>

<footer class="landing-footer"><div class="songket" aria-hidden="true"></div><div class="footer-inner"><span class="brand footer-brand"><span class="mark">A</span>apexelerate<span class="brand-dot">.</span></span><p>Made in Malaysia.</p><nav aria-label="Footer"><a href="#how">How it works</a><a href="#pitch">Pitch</a><a href="#repositories">Learn my app</a><a href="${account[0]}">${account[1]}</a></nav></div></footer>
</main>`;
}
