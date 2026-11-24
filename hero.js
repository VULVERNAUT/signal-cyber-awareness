(() => {
  const scene = document.getElementById('hero-visual');
  if (!scene) return;
  const canvas = scene.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const shield = scene.querySelector('.hero-shield');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!ctx) return;

  const tau = Math.PI * 2;
  const colors = [[159, 216, 255], [185, 156, 255], [113, 222, 255]];
  const rgba = (color, alpha) => 'rgba(' + color.join(',') + ',' + alpha + ')';
  const ease = value => value * value * (3 - 2 * value);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let seed = 721;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const dust = Array.from({length:64}, () => ({
    x: (random() - .5) * 790,
    y: (random() - .5) * 480,
    power: .2 + random() * .65,
    phase: random() * tau,
    size: .55 + random() * 1.45
  }));
  const bands = [
    {r:318, flat:.31, tilt:-.28, rate:.67, color:0, nodes:9},
    {r:267, flat:.54, tilt:.51, rate:-.52, color:1, nodes:8},
    {r:223, flat:.33, tilt:-.78, rate:.83, color:2, nodes:5}
  ];
  let width = 1, height = 1, dpr = 1, unit = 1;
  let frame = 0, last = 0, time = .72, visible = true;
  let paused = false, px = 0, py = 0, aimX = 0, aimY = 0;

  function size() {
    const bounds = scene.getBoundingClientRect();
    width = Math.max(1,bounds.width);
    height = Math.max(1,bounds.height);
    unit = Math.min(width / 695,height / 400);
    dpr = Math.min(1.75,window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    draw(time);
  }

  function orbitPoint(band, angle, turn) {
    const x = Math.cos(angle) * band.r;
    const y = Math.sin(angle) * band.r * band.flat;
    const cos = Math.cos(turn), sin = Math.sin(turn);
    return [x * cos - y * sin,y * cos + x * sin];
  }

  function drawOrbit(band, t, index, power) {
    const color = colors[band.color];
    const turn = band.tilt + .14 * Math.sin(t * .39 + index) + px * .10;
    const width = band.r * (1 + .022 * Math.cos(t * 1.7 + index));
    ctx.beginPath();
    ctx.ellipse(0,0,width,width * band.flat,turn,0,tau);
    ctx.strokeStyle = rgba(color,.13 + power * .20);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let j=0; j<band.nodes; j++) {
      const lead = j === 0;
      const offset = j * tau / band.nodes + t * band.rate + index * .72;
      const tail = lead ? .66 : .12;
      ctx.beginPath();
      for (let k=0; k<=9; k++) {
        const [x,y] = orbitPoint(band,offset - Math.sign(band.rate) * tail * (1-k/9),turn);
        if (k === 0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
      }
      const [x,y] = orbitPoint(band,offset,turn);
      const [fromX,fromY] = orbitPoint(band,offset - Math.sign(band.rate) * tail,turn);
      const streak = ctx.createLinearGradient(fromX,fromY,x,y);
      streak.addColorStop(0,rgba(color,0));
      streak.addColorStop(1,rgba(color,lead ? .94 : .38));
      ctx.strokeStyle = streak;
      ctx.lineWidth = lead ? 2.7 : 1.25;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x,y,lead?3.1:1.25,0,tau);
      if (lead) {
        ctx.shadowColor = rgba(color,.85);
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = rgba(color,lead?1:.75);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function signal(t) {
    const phase = (t + .55) % 4.2;
    const travel = ease(clamp(phase/1.5,0,1));
    if (phase < 1.5) {
      const x = -375 + travel * 365;
      const y = 25 - Math.sin(travel * Math.PI) * 39;
      const incoming = ctx.createLinearGradient(x-105,0,x,0);
      incoming.addColorStop(0,rgba(colors[2],0));
      incoming.addColorStop(1,rgba(colors[2],.92 * Math.sin(Math.PI * phase/1.8)));
      ctx.beginPath();
      ctx.moveTo(x-99,y+7);
      ctx.lineTo(x-32,y+7);
      ctx.lineTo(x-24,y-4);
      ctx.lineTo(x,y-4);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = incoming;
      ctx.stroke();
    }
    const after = phase - 1.08;
    if (after > 0 && after < 2.15) {
      for (let i=0; i<3; i++) {
        const offset = (after-i*.16)/1.65;
        if (offset <= 0 || offset >= 1) continue;
        const strength = Math.pow(1-offset,1.65);
        const radius = 30 + ease(offset)*253;
        ctx.beginPath();
        ctx.ellipse(0,0,radius,radius*.48,-.19,0,tau);
        ctx.strokeStyle = rgba(colors[i],strength*.73);
        ctx.lineWidth = .8 + strength*2.2;
        ctx.stroke();
      }
      if (after < 1.05) {
        const wave = after/1.05;
        const y = -156 + wave*323;
        const beam = ctx.createLinearGradient(-253,y,253,y);
        beam.addColorStop(0,rgba(colors[2],0));
        beam.addColorStop(.5,rgba([193,236,255],Math.sin(wave*Math.PI)*.68));
        beam.addColorStop(1,rgba(colors[2],0));
        ctx.beginPath();
        ctx.moveTo(-250,y);
        ctx.lineTo(250,y);
        ctx.shadowColor = '#8dd6ff';
        ctx.shadowBlur = 22;
        ctx.strokeStyle = beam;
        ctx.lineWidth = 2.0;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    return after>0&&after<1 ? (1-after)*.45 : 0;
  }

  function draw(t) {
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    ctx.translate(width*.515 + px*8,height*.50 + py*6);
    ctx.scale(unit,unit);
    const pulse = signal(t);
    for (const p of dust) {
      const wave = Math.sin(p.phase + t * (.65 + p.power));
      const x = p.x + wave*14 + px*p.size*5;
      const y = p.y + Math.cos(p.phase+t*.75)*10 + py*p.size*6;
      ctx.fillStyle = rgba(colors[0],(.22+wave*.17)*p.power);
      ctx.fillRect(x,y,p.size,p.size);
    }
    bands.forEach((band,index)=>drawOrbit(band,t,index,pulse));
    if (!paused) {
      const drift = Math.sin(t*1.45) * 7;
      shield.style.transform = 'translate3d('+(px*22)+'px,'+(py*16+drift)+'px,0) rotateY('+(px*10+Math.sin(t*.73)*7)+'deg) rotateX('+(-py*7+Math.sin(t*.6)*2)+'deg)';
      shield.style.setProperty('--pulse', String(pulse));
    }
  }

  function tick(now) {
    frame = 0;
    if (paused || !visible || document.hidden) {last=0;return;}
    time += last ? Math.min(now-last,40)/1000 : 0;
    last = now;
    px += (aimX-px)*.085;
    py += (aimY-py)*.085;
    draw(time);
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (paused || !visible || document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame=0; last=0;
    } else if (!frame) {
      frame=requestAnimationFrame(tick);
    }
  }

  function setPaused(state) {
    paused=state;
    scene.classList.toggle('paused',state);
    if (state) {
      aimX=aimY=px=py=0;
      shield.style.transform='';
      shield.style.setProperty('--pulse','0');
      draw(time);
    }
    sync();
  }

  scene.addEventListener('pointermove',event=>{
    if (event.pointerType==='touch' || paused) return;
    const b=scene.getBoundingClientRect();
    aimX=clamp((event.clientX-b.left)/b.width*2-1,-1,1);
    aimY=clamp((event.clientY-b.top)/b.height*2-1,-1,1);
  });
  scene.addEventListener('pointerleave',()=>{aimX=aimY=0;});
  preference.addEventListener('change',event=>setPaused(event.matches));
  document.addEventListener('visibilitychange',sync);
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(scene);
  else addEventListener('resize',size);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    sync();
  }).observe(scene);
  size();
  setPaused(preference.matches);
})();
