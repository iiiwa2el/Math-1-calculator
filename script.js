const $ = (id) => document.getElementById(id);
const fmt = (n) => Number.isFinite(n) ? Number(n.toPrecision(8)).toString() : 'غير معرّف';
const derivativeType = $('derivativeType');
derivativeType.addEventListener('change', () => { $('powerField').style.display = derivativeType.value === 'power' ? 'block' : 'none'; });
$('differentiate').addEventListener('click', () => {
  const type=derivativeType.value, x=Number($('derivativeX').value), n=Number($('powerN').value);
  if (!Number.isFinite(x) || (type==='power'&&!Number.isFinite(n))) return show('derivativeResult','أدخلي أرقامًا صحيحة في الحقول.');
  let formula,value;
  switch(type){
    case 'power': formula=n===0?'0':`${fmt(n)}x${n-1===0?'':`^${fmt(n-1)}`}`; value=n===0?0:n*Math.pow(x,n-1); break;
    case 'sin': formula='cos x'; value=Math.cos(x); break;
    case 'cos': formula='−sin x'; value=-Math.sin(x); break;
    case 'tan': formula='sec² x'; value=1/Math.pow(Math.cos(x),2); break;
    case 'exp': formula='eˣ'; value=Math.exp(x); break;
    case 'ln': formula='1/x'; value=x===0?NaN:1/x; break;
    case 'sinh': formula='cosh x'; value=Math.cosh(x); break;
    case 'cosh': formula='sinh x'; value=Math.sinh(x); break;
    case 'tanh': formula='sech² x'; value=1/Math.pow(Math.cosh(x),2); break;
  }
  $('derivativeResult').innerHTML=`<div><span class="result-formula">f′(x) = ${formula}</span><br>عند x = ${fmt(x)}: <strong>${fmt(value)}</strong></div>`;
});
function show(id,text){$(id).textContent=text;}
const limits={
 sinc:{f:x=>Math.sin(x)/x,exact:'1'}, onecos:{f:x=>(1-Math.cos(x))/(x*x),exact:'1/2'},
 expm:{f:x=>(Math.exp(x)-1)/x,exact:'1'}, lnm:{f:x=>Math.log1p(x)/x,exact:'1'},
 rational:{f:x=>(x*x-1)/(x-1),exact:'2'}
};
$('findLimit').addEventListener('click',()=>{
 const item=limits[$('limitType').value], h=1e-6, left=item.f(-h), right=item.f(h);
 $('limitResult').innerHTML=`<div>من اليسار: <strong>${fmt(left)}</strong> · من اليمين: <strong>${fmt(right)}</strong><br>النهاية المتوقعة: <span class="result-formula">${item.exact}</span></div>`;
});
$('calculateTrig').addEventListener('click',()=>{
 let x=Number($('trigValue').value), type=$('trigType').value, unit=$('angleUnit').value, result;
 if(!Number.isFinite(x)) return show('trigResult','أدخلي قيمة رقمية.');
 if(['asin','acos','atan'].includes(type)){
   if((type==='asin'||type==='acos')&&(x < -1||x > 1)) return show('trigResult','مدخل sin⁻¹ وcos⁻¹ لازم يكون بين −1 و1.');
   result=type==='asin'?Math.asin(x):type==='acos'?Math.acos(x):Math.atan(x);
   if(unit==='deg') result=result*180/Math.PI;
 } else {
   if(unit==='deg') x=x*Math.PI/180;
   result=type==='sin'?Math.sin(x):type==='cos'?Math.cos(x):Math.tan(x);
 }
 $('trigResult').innerHTML=`القيمة التقريبية: <strong>${fmt(result)}</strong> <span class="result-formula">${unit==='deg'?'°':'rad'}</span>`;
});