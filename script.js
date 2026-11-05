const $ = (id) => document.getElementById(id);
const fmt = (n) => Number.isFinite(n) ? Number(n.toPrecision(8)).toString() : 'غير معرّف';
const show = (id, text) => { const node = $(id); if (node) node.textContent = text; };
const readNum = (id) => { const raw=$(id).value.trim(); const n=Number(raw); if(raw===''||!Number.isFinite(n))throw new Error('أدخلي قيمة رقمية صحيحة.'); return n; };

// A small real-valued expression parser keeps the calculators dependency-free.
const functionNames = new Set(['sin','cos','tan','cot','sec','csc','sinh','cosh','tanh','coth','sech','csch','exp','ln','log','sqrt','abs']);
function parseExpression(source) {
  source = source.trim();
  if (!source) throw new Error('اكتبي تعبيرًا رياضيًا أولًا.');
  const raw = [];
  const re = /\s*([0-9]*\.?[0-9]+(?:e[+-]?\d+)?|[a-zA-Z]+|[()+\-*/^])/gy;
  let pos = 0;
  while (pos < source.length) {
    re.lastIndex = pos;
    const match = re.exec(source);
    if (!match) throw new Error(`رمز غير مفهوم قرب: ${source.slice(pos, pos + 8)}`);
    raw.push(match[1]);
    pos = re.lastIndex;
  }
  const tokens = [];
  const canEnd = (t) => t && (/^(?:[0-9]|[a-zA-Z]|\))/.test(t));
  const canStart = (t) => t && (/^(?:[0-9]|[a-zA-Z]|\()/.test(t));
  for (let i = 0; i < raw.length; i++) {
    const prev = raw[i - 1], curr = raw[i];
    if (canEnd(prev) && canStart(curr) && !(functionNames.has(prev.toLowerCase()) && curr === '(')) tokens.push('*');
    tokens.push(curr);
  }
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const expression = () => {
    let node = term();
    while (peek() === '+' || peek() === '-') { const op = take(); node = {t:'b',op,a:node,b:term()}; }
    return node;
  };
  const term = () => {
    let node = unary();
    while (peek() === '*' || peek() === '/') { const op = take(); node = {t:'b',op,a:node,b:unary()}; }
    return node;
  };
  const unary = () => {
    if (peek() === '+' || peek() === '-') { const op = take(); return {t:'u',op,v:unary()}; }
    return power();
  };
  const power = () => {
    let node = primary();
    if (peek() === '^') { take(); node = {t:'b',op:'^',a:node,b:unary()}; }
    return node;
  };
  const primary = () => {
    const token = take();
    if (!token) throw new Error('اكتبي تعبيرًا رياضيًا أولًا.');
    if (token === '(') { const node = expression(); if (take() !== ')') throw new Error('ناقص قوس إغلاق )'); return node; }
    if (token === ')') throw new Error('راجعي الأقواس في التعبير.');
    if (/^[0-9]/.test(token) || token.startsWith('.')) return {t:'n',v:Number(token)};
    const name = token.toLowerCase();
    if (functionNames.has(name)) {
      if (take() !== '(') throw new Error(`اكتبي ${name}(x) مع أقواس.`);
      const arg = expression();
      if (take() !== ')') throw new Error('ناقص قوس إغلاق ) بعد الدالة.');
      return {t:'f',name,arg};
    }
    if (name === 'x') return {t:'x'};
    if (name === 'pi') return {t:'n',v:Math.PI};
    if (name === 'e') return {t:'n',v:Math.E};
    throw new Error(`الدالة أو الرمز ${token} غير مدعوم.`);
  };
  const tree = expression();
  if (index !== tokens.length) throw new Error(`راجعي الرمز ${tokens[index]}.`);
  return tree;
}

function applyFunction(name, x) {
  switch (name) {
    case 'sin': return Math.sin(x); case 'cos': return Math.cos(x); case 'tan': return Math.tan(x);
    case 'cot': return Math.cos(x) / Math.sin(x); case 'sec': return 1 / Math.cos(x); case 'csc': return 1 / Math.sin(x);
    case 'sinh': return Math.sinh(x); case 'cosh': return Math.cosh(x); case 'tanh': return Math.tanh(x);
    case 'coth': return Math.cosh(x) / Math.sinh(x); case 'sech': return 1 / Math.cosh(x); case 'csch': return 1 / Math.sinh(x);
    case 'exp': return Math.exp(x); case 'ln': if (x <= 0) throw new Error('ln(x) يتطلب x أكبر من صفر.'); return Math.log(x);
    case 'log': if (x <= 0) throw new Error('log(x) يتطلب x أكبر من صفر.'); return Math.log10(x);
    case 'sqrt': if (x < 0) throw new Error('الجذر التربيعي يتطلب قيمة غير سالبة.'); return Math.sqrt(x);
    case 'abs': return Math.abs(x); case 'sign': return Math.sign(x);
    default: throw new Error(`الدالة ${name} غير مدعومة.`);
  }
}

function evaluate(node, x) {
  let value;
  if (node.t === 'n') value = node.v;
  else if (node.t === 'x') value = x;
  else if (node.t === 'u') value = node.op === '-' ? -evaluate(node.v,x) : evaluate(node.v,x);
  else if (node.t === 'f') value = applyFunction(node.name,evaluate(node.arg,x));
  else {
    const a = evaluate(node.a,x), b = evaluate(node.b,x);
    if (node.op === '+') value = a+b;
    if (node.op === '-') value = a-b;
    if (node.op === '*') value = a*b;
    if (node.op === '/') { if (b === 0) throw new Error('القسمة على صفر غير معرّفة.'); value = a/b; }
    if (node.op === '^') value = Math.pow(a,b);
  }
  if (!Number.isFinite(value)) throw new Error('الناتج غير معرّف كعدد حقيقي عند هذه القيمة.');
  return value;
}

function num(v) { return {t:'n',v}; }
function simplify(n) {
  if (n.t === 'u') {
    n.v = simplify(n.v);
    if (n.v.t === 'n') return num(n.op === '-' ? -n.v.v : n.v.v);
    if (n.op === '+') return n.v;
    if (n.v.t === 'u' && n.v.op === '-') return n.v.v;
    return n;
  }
  if (n.t === 'f') { n.arg = simplify(n.arg); if (n.arg.t === 'n') { try { return num(applyFunction(n.name,n.arg.v)); } catch {} } return n; }
  if (n.t !== 'b') return n;
  n.a = simplify(n.a); n.b = simplify(n.b);
  const a=n.a,b=n.b, av=a.t==='n'?a.v:null, bv=b.t==='n'?b.v:null;
  if (av !== null && bv !== null) {
    const v = n.op==='+'?av+bv:n.op==='-'?av-bv:n.op==='*'?av*bv:n.op==='/'?(bv===0?NaN:av/bv):Math.pow(av,bv);
    if (Number.isFinite(v)) return num(v);
  }
  if (n.op === '+') { if (av===0) return b; if (bv===0) return a; }
  if (n.op === '-') { if (bv===0) return a; if (av===0) return {t:'u',op:'-',v:b}; }
  if (n.op === '*') { if (av===0||bv===0) return num(0); if (av===1) return b; if (bv===1) return a; if (av===-1) return {t:'u',op:'-',v:b}; if (bv===-1) return {t:'u',op:'-',v:a}; }
  if (n.op === '/') { if (av===0 && bv!==0) return num(0); if (bv===1) return a; }
  if (n.op === '^') { if (bv===0) return num(1); if (bv===1) return a; if (av===1) return num(1); }
  return n;
}
const precedence = (n) => n.t==='b' ? ({'+':1,'-':1,'*':2,'/':2,'^':3}[n.op]) : n.t==='u'?4:5;
function printExpr(n,parent=0,right=false) {
  let s;
  if (n.t==='n') s = Number(n.v.toPrecision(7)).toString();
  else if (n.t==='x') s='x';
  else if (n.t==='f') s=`${n.name}(${printExpr(n.arg)})`;
  else if (n.t==='u') s=`${n.op}${printExpr(n.v,4)}`;
  else s=`${printExpr(n.a,precedence(n))} ${n.op} ${printExpr(n.b,precedence(n),true)}`;
  return precedence(n)<parent || (right && n.t==='b' && ['-','/'].includes(n.op)) ? `(${s})` : s;
}
function domainRestrictions(node, out=[]) {
  if(node.t==='b'){
    if(node.op==='/')out.push(`${printExpr(node.b)} ≠ 0`);
    domainRestrictions(node.a,out);domainRestrictions(node.b,out);
  } else if(node.t==='u')domainRestrictions(node.v,out);
  else if(node.t==='f'){
    const arg=printExpr(node.arg);
    if(node.name==='ln'||node.name==='log')out.push(`${arg} > 0`);
    if(node.name==='sqrt')out.push(`${arg} ≥ 0`);
    if(node.name==='tan'||node.name==='sec')out.push(`cos(${arg}) ≠ 0`);
    if(node.name==='cot'||node.name==='csc')out.push(`sin(${arg}) ≠ 0`);
    if(node.name==='coth'||node.name==='csch')out.push(`${arg} ≠ 0`);
    domainRestrictions(node.arg,out);
  }
  return [...new Set(out)];
}

function derivative(node, rules) {
  if (node.t==='n') return num(0);
  if (node.t==='x') return num(1);
  if (node.t==='u') { rules.add('قاعدة الإشارة'); return simplify({t:'u',op:node.op,v:derivative(node.v,rules)}); }
  if (node.t==='b') {
    const da=derivative(node.a,rules), db=derivative(node.b,rules);
    if (node.op==='+'||node.op==='-') { rules.add('قاعدة الجمع والطرح'); return simplify({t:'b',op:node.op,a:da,b:db}); }
    if (node.op==='*') { rules.add('قاعدة الضرب'); return simplify({t:'b',op:'+',a:{t:'b',op:'*',a:da,b:node.b},b:{t:'b',op:'*',a:node.a,b:db}}); }
    if (node.op==='/') { rules.add('قاعدة القسمة'); return simplify({t:'b',op:'/',a:{t:'b',op:'-',a:{t:'b',op:'*',a:da,b:node.b},b:{t:'b',op:'*',a:node.a,b:db}},b:{t:'b',op:'^',a:node.b,b:num(2)}}); }
    if (node.op==='^') {
      if (node.b.t==='n') { rules.add('قاعدة القوة'); return simplify({t:'b',op:'*',a:{t:'b',op:'*',a:node.b,b:{t:'b',op:'^',a:node.a,b:num(node.b.v-1)}},b:da}); }
      rules.add('قاعدة القوة والسلسلة');
      return simplify({t:'b',op:'*',a:node,b:{t:'b',op:'+',a:{t:'b',op:'*',a:db,b:{t:'f',name:'ln',arg:node.a}},b:{t:'b',op:'*',a:node.b,b:{t:'b',op:'/',a:da,b:node.a}}}});
    }
  }
  const u=node.arg, du=derivative(u,rules), f=(name,arg=u)=>({t:'f',name,arg}), mul=(a,b)=>({t:'b',op:'*',a,b}), pow=(a,b)=>({t:'b',op:'^',a,b});
  rules.add('قاعدة السلسلة');
  let outer;
  switch(node.name){
    case 'sin': outer=f('cos'); break; case 'cos': outer={t:'u',op:'-',v:f('sin')}; break;
    case 'tan': outer=pow(f('sec'),num(2)); break; case 'cot': outer={t:'u',op:'-',v:pow(f('csc'),num(2))}; break;
    case 'sec': outer=mul(f('sec'),f('tan')); break; case 'csc': outer={t:'u',op:'-',v:mul(f('csc'),f('cot'))}; break;
    case 'sinh': outer=f('cosh'); break; case 'cosh': outer=f('sinh'); break;
    case 'tanh': outer=pow(f('sech'),num(2)); break; case 'coth': outer={t:'u',op:'-',v:pow(f('csch'),num(2))}; break;
    case 'sech': outer={t:'u',op:'-',v:mul(f('sech'),f('tanh'))}; break; case 'csch': outer={t:'u',op:'-',v:mul(f('csch'),f('coth'))}; break;
    case 'exp': outer=f('exp'); break; case 'ln': outer={t:'b',op:'/',a:num(1),b:u}; break;
    case 'log': outer={t:'b',op:'/',a:num(1/Math.LN10),b:u}; break; case 'sqrt': outer={t:'b',op:'/',a:num(1/2),b:f('sqrt')}; break;
    case 'abs': outer={t:'f',name:'sign',arg:u}; break;
    default: throw new Error(`لا أستطيع اشتقاق ${node.name}.`);
  }
  return simplify(mul(outer,du));
}

function sampleSide(node, a, side) {
  const hs=[1e-3,1e-4,1e-5,1e-6]; const values=[];
  for (const h of hs) { try { values.push(evaluate(node,a+(side==='left'?-h:h))); } catch {} }
  return values;
}
function estimateSide(node, a, side) { const values=sampleSide(node,a,side); return values.length ? values[values.length-1] : null; }
function tendsUnbounded(values) {
  if(values.length<3)return false;
  const m=values.map(Math.abs);
  return m.at(-1)>1e5 && m.at(-1)>m.at(-2)*5 && m.at(-2)>m.at(-3)*5;
}
function close(a,b,tol=1e-4){ return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*(1+Math.max(Math.abs(a),Math.abs(b))); }

// LECTURE 01: compositions, a pointwise domain check, and a numerical parity hint.
if ($('composeFunctions')) $('composeFunctions').addEventListener('click',()=>{
  try {
    const f=parseExpression($('composeF').value),g=parseExpression($('composeG').value),x=readNum('composeX');
    const fg=evaluate(f,evaluate(g,x)),gf=evaluate(g,evaluate(f,x));
    show('composeResult',`f(g(${fmt(x)})) ≈ ${fmt(fg)}\ng(f(${fmt(x)})) ≈ ${fmt(gf)}`);
  } catch(e) { show('composeResult',e.message); }
});
if ($('checkFunction')) $('checkFunction').addEventListener('click',()=>{
  try {
    const node=parseExpression($('functionExpr').value),x=readNum('domainX'),value=evaluate(node,x);
    const min=readNum('rangeMin'),max=readNum('rangeMax');
    if(min>=max)throw new Error('نهاية الفترة لازم تكون أكبر من بدايتها.');
    const probes=[.37,.81,1.29,2.11]; let even=true,odd=true;
    for(const p of probes){ try{const a=evaluate(node,p),b=evaluate(node,-p);if(!close(a,b,1e-7))even=false;if(!close(a,-b,1e-7))odd=false;}catch{even=false;odd=false;} }
    const parity=even?'الدالة تبدو زوجية':odd?'الدالة تبدو فردية':'لا يظهر تماثل زوجي أو فردي';
    let low=Infinity,high=-Infinity,count=0;
    for(let i=0;i<=500;i++){const t=min+(max-min)*i/500;try{const v=evaluate(node,t);low=Math.min(low,v);high=Math.max(high,v);count++;}catch{}}
    const restrictions=domainRestrictions(node);
    show('functionResult',`f(${fmt(x)}) = ${fmt(value)}؛ x صالح في المجال.\nالمدى التقريبي على [${fmt(min)}, ${fmt(max)}]: ${count?`[${fmt(low)}, ${fmt(high)}]`:'لا توجد قيم معرّفة'} (عينات عددية).\n${parity} (فحص عددي).\n${restrictions.length?`شروط المجال: ${restrictions.join('، ')}`:'لا تظهر قيود مجال في التعبير.'}`);
  } catch(e) { show('functionResult',`القيمة غير صالحة في المجال أو التعبير غير مكتمل: ${e.message}`); }
});

// LECTURE 02: numerical one-sided, two-sided, and infinite limits.
if ($('findLimit')) $('findLimit').addEventListener('click',()=>{
  try {
    const node=parseExpression($('limitExpr').value),at=readNum('limitAt'),side=$('limitSide').value;
    if(side==='posInf'||side==='negInf'){
      const sign=side==='posInf'?1:-1,vals=[];
      for(const n of [100,1000,10000]){try{vals.push(evaluate(node,sign*n));}catch{}}
      if(!vals.length) throw new Error('التعبير غير معرّف عند القيم الكبيرة.');
      show('limitResult',`عند ${side==='posInf'?'+∞':'−∞'}: f(x) ≈ ${vals.map(fmt).join(' ← ')}\nالحد الأخير: ${fmt(vals.at(-1))} (تقريب عددي)`); return;
    }
    const left=side==='right'?null:estimateSide(node,at,'left');
    const right=side==='left'?null:estimateSide(node,at,'right');
    if(side==='left') show('limitResult',left===null?'الاقتراب من اليسار غير معرّف.':`من اليسار: f(x) ≈ ${fmt(left)} (تقريب عددي)`);
    else if(side==='right') show('limitResult',right===null?'الاقتراب من اليمين غير معرّف.':`من اليمين: f(x) ≈ ${fmt(right)} (تقريب عددي)`);
    else if(left===null||right===null) show('limitResult',`من اليسار: ${left===null?'غير معرّف':fmt(left)}\nمن اليمين: ${right===null?'غير معرّف':fmt(right)}\nلا يمكن تأكيد وجود النهاية عددياً.`);
    else show('limitResult',`من اليسار: ${fmt(left)} · من اليمين: ${fmt(right)}\n${close(left,right)?`يبدو أن النهاية موجودة ≈ ${fmt((left+right)/2)}`:'القيمتان مختلفتان؛ النهاية الثنائية غير موجودة غالبًا.'}`);
  } catch(e) { show('limitResult',e.message); }
});
if ($('checkContinuity')) $('checkContinuity').addEventListener('click',()=>{
  try {
    const node=parseExpression($('continuityExpr').value),a=readNum('continuityAt');
    let at=null; try{at=evaluate(node,a);}catch{}
    const leftValues=sampleSide(node,a,'left'),rightValues=sampleSide(node,a,'right');
    const left=leftValues.length?leftValues.at(-1):null,right=rightValues.length?rightValues.at(-1):null;
    let verdict;
    if(tendsUnbounded(leftValues)||tendsUnbounded(rightValues)) verdict='تزداد القيم بلا حد قرب النقطة: انقطاع لا نهائي محتمل.';
    else if(left!==null&&right!==null&&!close(left,right)) verdict='النهايتان الجانبيتان مختلفتان: يوجد انقطاع قفزي غالبًا.';
    else if(left===null||right===null) verdict='لا يمكن تقدير إحدى النهايتين الجانبيتين قرب النقطة.';
    else if(at===null) verdict='النهاية تبدو موجودة لكن f(a) غير معرّفة: انقطاع قابل للإزالة غالبًا.';
    else if(close(left,at)&&close(right,at)) verdict='الدالة تبدو مستمرة عند هذه النقطة.';
    else verdict='النهاية تبدو موجودة لكن لا تساوي f(a): انقطاع قابل للإزالة غالبًا.';
    show('continuityResult',`f(a): ${at===null?'غير معرّفة':fmt(at)} · من اليسار: ${left===null?'غير معرّف':fmt(left)} · من اليمين: ${right===null?'غير معرّف':fmt(right)}\n${verdict}`);
  } catch(e) { show('continuityResult',e.message); }
});

// LECTURE 03: trigonometric, exponential, and hyperbolic functions.
if ($('calculateTrans')) $('calculateTrans').addEventListener('click',()=>{
  try {
    const type=$('transType').value,unit=$('transUnit').value;const original=readNum('transValue');let x=original;
    if(['sin','cos','tan','cot','sec','csc'].includes(type)&&unit==='deg')x=x*Math.PI/180;
    const value=applyFunction(type,x);show('transResult',`${type}(${fmt(original)}) ≈ ${fmt(value)}${['sin','cos','tan','cot','sec','csc'].includes(type)?` · الزاوية ${unit==='deg'?'بالدرجات':'بالراديان'}`:''}`);
  } catch(e) { show('transResult',e.message); }
});

// LECTURE 04: principal inverse branches, logarithms, and inverse hyperbolics.
if ($('calculateInverse')) $('calculateInverse').addEventListener('click',()=>{
  try {
    const type=$('inverseType').value,x=readNum('inverseValue'),unit=$('inverseUnit').value;let a=2,b=0,n=1,y,formula=type;
    if(['linearInv','logInv','expBaseInv'].includes(type))a=readNum('inverseBase');
    if(type==='linearInv')b=readNum('inverseOffset');
    if(type==='powerInv')n=readNum('inversePower');
    if(type==='linearInv'){
      if(a===0)throw new Error('معامل x لازم يكون غير صفر عشان الدالة يكون لها عكس.');
      y=(x-b)/a;formula=`f⁻¹(y) = (y − ${fmt(b)}) / ${fmt(a)}`;
    } else if(type==='powerInv'){
      if(n===0)throw new Error('الأس n لازم يكون غير صفر.');
      if(Number.isInteger(n)&&Math.abs(n)%2===0&&x<0)throw new Error('لأس زوجي، قيمة y لازم تكون غير سالبة والفرع الرئيسي يختار x ≥ 0.');
      if(!Number.isInteger(n)&&x<0)throw new Error('الجذر الحقيقي لهذه الدرجة لا يقبل y سالبة.');
      y=Number.isInteger(n)&&Math.abs(n)%2===1?Math.sign(x)*Math.pow(Math.abs(x),1/n):Math.pow(x,1/n);
      formula=`f⁻¹(y) = ${fmt(y)} (الفرع الرئيسي)`;
    } else if(['asin','acos','atan','acot','asec','acsc'].includes(type)){
      if((type==='asin'||type==='acos')&&Math.abs(x)>1)throw new Error('sin⁻¹ وcos⁻¹ يتطلبان −1 ≤ x ≤ 1.');
      if((type==='asec'||type==='acsc')&&Math.abs(x)<1)throw new Error('sec⁻¹ وcsc⁻¹ يتطلبان |x| ≥ 1.');
      y=type==='asin'?Math.asin(x):type==='acos'?Math.acos(x):type==='atan'?Math.atan(x):type==='acot'?Math.atan2(1,x):type==='asec'?Math.acos(1/x):Math.asin(1/x);
      if(unit==='deg')y=y*180/Math.PI;
    } else if(type==='expInv'){if(x<=0)throw new Error('ln(x) يتطلب x > 0.');y=Math.log(x);}
    else if(type==='lnInv')y=Math.exp(x);
    else if(type==='logInv'||type==='expBaseInv'){
      if(a<=0||a===1)throw new Error('الأساس a لازم يكون موجبًا ومختلفًا عن 1.');
      if(type==='expBaseInv'&&x<=0)throw new Error('logₐ(x) يتطلب x > 0.');
      y=type==='logInv'?Math.pow(a,x):Math.log(x)/Math.log(a);formula=type==='logInv'?`${fmt(a)}^x`:`log_${fmt(a)}(x)`;
    } else if(type==='asinh')y=Math.asinh(x);
    else if(type==='acosh'){if(x<1)throw new Error('cosh⁻¹(x) يتطلب x ≥ 1.');y=Math.acosh(x);}
    else if(type==='atanh'){if(Math.abs(x)>=1)throw new Error('tanh⁻¹(x) يتطلب |x| < 1.');y=Math.atanh(x);}
    else if(type==='acoth'){if(Math.abs(x)<=1)throw new Error('coth⁻¹(x) يتطلب |x| > 1.');y=Math.atanh(1/x);}
    else if(type==='asech'){if(x<=0||x>1)throw new Error('sech⁻¹(x) يتطلب 0 < x ≤ 1.');y=Math.acosh(1/x);}
    else if(type==='acsch'){if(x===0)throw new Error('csch⁻¹(0) غير معرّفة.');y=Math.asinh(1/x);}
    if(!Number.isFinite(y))throw new Error('الناتج غير معرّف كعدد حقيقي.');
    show('inverseResult',type==='linearInv'||type==='powerInv'?`${formula}\nf⁻¹(${fmt(x)}) ≈ ${fmt(y)}`:`${formula} عند x = ${fmt(x)} ≈ ${fmt(y)}${['asin','acos','atan','acot','asec','acsc'].includes(type)?` ${unit==='deg'?'°':'rad'}`:''}`);
  } catch(e) { show('inverseResult',e.message); }
});

// LECTURE 05: symbolic differentiation for the rules in the lecture.
if ($('differentiate')) $('differentiate').addEventListener('click',()=>{
  try {
    const node=parseExpression($('derivativeExpr').value),x=readNum('derivativeX'),rules=new Set();
    const d=simplify(derivative(node,rules)),value=evaluate(d,x);
    show('derivativeResult',`f′(x) = ${printExpr(d)}\nf′(${fmt(x)}) = ${fmt(value)}\nالقواعد المستخدمة: ${[...rules].join('، ')||'مشتقة ثابت'}`);
  } catch(e) { show('derivativeResult',e.message); }
});

// Provide a few familiar examples without limiting calculations to a preset list.
document.querySelectorAll('.formula-input').forEach(input=>input.addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    const button=input.closest('.tool-card')?.querySelector('.calc-btn');
    if(button)button.click();
  }
}));
