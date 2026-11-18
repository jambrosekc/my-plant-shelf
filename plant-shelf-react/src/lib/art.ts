// @ts-nocheck
// Plant drawings and lights, ported as-is from the original app so the look stays identical.
export function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
export const LIGHTS='<svg class="lights" viewBox="0 0 640 60" aria-hidden="true"><defs><radialGradient id="halo2"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".95"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient></defs><g class="strand"><path d="M0 8 C60 26 130 40 210 30 S350 4 430 8 S580 30 640 22" fill="none" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1.1"/><g class="bulb" transform="translate(46,24)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:0.0s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#f7e6b0" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(106,33)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:0.6s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#dfe9d4" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(170,36)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:1.1s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#f2dcd0" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(236,30)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:1.7s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#f7e6b0" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(300,20)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:2.2s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#e6ecc9" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(364,13)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:2.8s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#f7e6b0" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(428,12)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:3.3s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#dfe9d4" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(492,18)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:3.9s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#f2dcd0" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(556,25)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:4.4s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#f7e6b0" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g><g class="bulb" transform="translate(612,30)"><path d="M0 0 v6" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/><circle class="halo" cx="0" cy="15" r="15" fill="url(#halo2)" style="animation-delay:5.0s"/><ellipse cx="0" cy="14" rx="4.6" ry="6.4" fill="#e6ecc9" stroke="#2f3b33" stroke-opacity=".6" stroke-width="1"/></g></g></svg>';
export function genKey(p){return (p.genus&&p.genus!=='None')?p.genus:'Unknown'}
var gid=0;
export function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)}
var LEAF={
 Alocasia:'M0,-4 C-12,2 -17,-20 -5,-40 L0,-60 L5,-40 C17,-20 12,2 0,-4Z',
 Philodendron:'M0,-4 C-20,6 -24,-22 -10,-38 C-6,-44 -2,-50 0,-58 C2,-50 6,-44 10,-38 C24,-22 20,6 0,-4Z',
 Anthurium:'M0,-4 C-26,8 -28,-24 -9,-38 C-5,-42 -2,-46 0,-52 C2,-46 5,-42 9,-38 C28,-24 26,8 0,-4Z',
 Monstera:'M0,-4 C-24,0 -26,-34 -8,-46 C-3,-50 3,-50 8,-46 C26,-34 24,0 0,-4Z',
 Begonia:'M0,-4 C-22,4 -24,-26 -6,-42 C4,-50 20,-40 20,-20 C20,-6 10,-2 0,-4Z',
 gen:'M0,-4 C-16,-2 -18,-30 0,-54 C18,-30 16,-2 0,-4Z'
};
var LC={Alocasia:'#5f8260',Philodendron:'#7c9a62',Anthurium:'#3e6150',Monstera:'#6b9468',Begonia:'#8a9a62',Syngonium:'#9cb878',Pothos:'#9ab86a',Rhaphidophora:'#7fa070',Ficus:'#4b6648',Ceropegia:'#7fa57a',Caladium:'#b87a80'};
function leafCol(p){var t=(p.plant_name||'').toLowerCase();if(/velvet|dark phoenix|ace of spades|warocq/.test(t))return '#2f4a3a';if(/lime|neon|aurea/.test(t))return '#a9c06a';return LC[genKey(p)]||'#5f7d4a'}
var TRAIL={Pothos:1,Ceropegia:1};
function varColor(p){
  var t=(p.plant_name||'').toLowerCase();
  if(/pink/.test(t))return '#e6b8bd'; if(/aurea|gold/.test(t))return '#d5cf8a'; if(/mint/.test(t))return '#bfe0cc';
  if(/albo|variegat|marble|snow|tricolor|splash|ghost|galaxy|\bvar\b/.test(t))return '#f3f1e4'; return null;
}
export function plantSVG(p){
  var g=genKey(p),path=LEAF[g]||LEAF.gen,h=hash(p.plant_id||p.plant_name||''),n=3+h%3,vc=varColor(p),
      semi=/semi|leca|hydro/i.test(p.soil_medium||'')||p.purchase_stage==='TC',out='',defs='',stems='',leaves='';
  var id='g'+(++gid),lc=leafCol(p),velvet=lc==='#2f4a3a';
  if(vc)defs='<linearGradient id="'+id+'" x1="0" x2="1" y1="0" y2="0"><stop offset=".5" stop-color="'+lc+'"/><stop offset=".5" stop-color="'+vc+'"/></linearGradient>';
  for(var i=0;i<n;i++){
    var a=(-48+96*i/(n-1))+((h>>(i*3))%13-6), L=22+((h>>i)%9), sc=.75+(((h>>(i+2))%5)/14),
        x=50+Math.sin(a*Math.PI/180)*L, y=84-Math.cos(a*Math.PI/180)*L;
    stems+='<line x1="50" y1="86" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--ink)" stroke-opacity=".7" stroke-width="1.1"/>';
    var fill=(vc&&i%2===0)?'url(#'+id+')':lc;
    leaves+='<g transform="translate('+x.toFixed(1)+','+y.toFixed(1)+') rotate('+a.toFixed(0)+') scale('+sc.toFixed(2)+')"><path d="'+path+'" fill="'+fill+'" stroke="var(--ink)" stroke-opacity=".75" stroke-width="1.2" stroke-linejoin="round"/><path d="M0,-4 L0,-46 M0,-18 L-9,-28 M0,-18 L9,-28 M0,-30 L-7,-38 M0,-30 L7,-38" stroke="#f6ead0" stroke-opacity="'+(velvet?'.85':'.5')+'" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>';
  }
  var pot;
  if(semi){
    var balls='';for(var r=0;r<5;r++)for(var c=0;c<5;c++){balls+='<circle cx="'+(31+c*9.5+(r%2)*4)+'" cy="'+(94+r*8)+'" r="4.4" fill="#c6b49a" stroke="#2f3b33" stroke-opacity=".5" stroke-width=".8"/>'}
    pot='<clipPath id="c'+id+'"><path d="M26 86 H74 V118 Q74 126 66 126 H34 Q26 126 26 118Z"/></clipPath><g clip-path="url(#c'+id+')">'+balls+'<path d="M34 112 q6 6 4 12 M60 100 q-6 8 -2 16" stroke="#f4efe0" stroke-width=".8" fill="none"/></g>'+
        '<path d="M26 86 H74 V118 Q74 126 66 126 H34 Q26 126 26 118Z" fill="var(--glass)" stroke="var(--ink)" stroke-width="1.3" stroke-linejoin="round"/><path d="M32 90 V118" stroke="#fff" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>';
  }else{var ps=h%3,pc=ps===0?'var(--pot)':(ps===1?'#f1eee2':'#a9b79f');
    pot='<path d="M26 88 H74 L69 126 H31Z" fill="'+pc+'" stroke="var(--ink)" stroke-width="1.3" stroke-linejoin="round"/><rect x="24" y="84" width="52" height="8" rx="3" fill="'+pc+'" stroke="var(--ink)" stroke-width="1.3"/>'+(ps===1?'<path d="M28 104 H72" stroke="var(--terra)" stroke-width="2.5"/>':'')+(ps===2?'<path d="M32 98 q18 8 36 0" stroke="var(--ink)" stroke-opacity=".6" stroke-width="1" fill="none"/>':'');}
  if(TRAIL[g]){var tr='';[[30,-1],[70,1]].forEach(function(s){var x0=s[0],d=s[1];tr+='<path d="M'+x0+' 90 C'+(x0+d*14)+' 100 '+(x0-d*6)+' 112 '+(x0+d*8)+' 126" fill="none" stroke="var(--ink)" stroke-opacity=".7" stroke-width="1.1"/>';[[x0+d*9,102],[x0-d*1,112],[x0+d*7,122]].forEach(function(q){tr+='<ellipse cx="'+q[0]+'" cy="'+q[1]+'" rx="6" ry="4.4" fill="'+lc+'" stroke="var(--ink)" stroke-opacity=".7" stroke-width="1" transform="rotate('+(d*30)+' '+q[0]+' '+q[1]+')"/>'})});pot+=tr}
  return '<svg viewBox="-12 0 124 130" role="img" aria-label="'+esc(p.plant_name)+'"><defs>'+defs+'</defs>'+stems+leaves+pot+'</svg>';
}
