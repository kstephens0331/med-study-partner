// src/lib/srs.ts
export type SM2State={interval_days:number; ease:number; reps:number; lapses:number};
export function sm2Step(state:SM2State, quality:number){
  const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
  let {interval_days:I,ease:E,reps,lapses}=state; const q=clamp(Math.round(quality),0,5);
  let wasLapse=false;
  if(q<3){ wasLapse=true; lapses+=1; reps=0; I=1; E=Math.max(1.3, E-0.2); }
  else { if(reps===0) I=1; else if(reps===1) I=3; else I=Math.round(I*E);
         E = E + (0.1 - (5-q)*(0.08+(5-q)*0.02)); E=clamp(E,1.3,2.8); reps+=1; }
  return { next:{interval_days:I,ease:E,reps,lapses}, newInterval:I, wasLapse };
}
export function nowPlusDays(days:number){ const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString(); }
