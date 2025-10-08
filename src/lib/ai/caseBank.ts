export type MicroCase = { prompt: string; tags: string[] };
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function randomCase(system: string): MicroCase {
  switch (system) {
    case "heme": {
      const bleed = pick(["gingival bleeding","hemarthrosis","menorrhagia","post-op ooze"]);
      const pt = pick([12,18,24]); const ptt = pick([30,45,80]); const plt = pick([70,180,300]);
      return {
        prompt:
`Micro-case: ${pick([22,28,45,67])}-year-old with ${bleed}. PT ${pt}s, aPTT ${ptt}s, platelets ${plt}K.
Give ONE immediate next step and ONE test to confirm your leading suspicion.`,
        tags: ["heme:coag-initiation","heme:platelet-fxn"]
      };
    }
    case "renal": {
      const gluc = pick([110,280,480]);
      return {
        prompt:
`Micro-case: ${pick([24,28,36])}-year-old with Kussmaul respirations.
Na 132, Cl 98, HCO3 10, glucose ${gluc}.
1) Compute anion gap. 2) Name a mimic and one lab to separate them. Next action?`,
        tags: ["renal:anion-gap","renal:acid-base"]
      };
    }
    case "cards": {
      return {
        prompt:
`Micro-case: ${pick([54,62,71])}-year-old with chest discomfort, BP ${pick([86,98,132])}/${pick([54,62,78])}, HR ${pick([58,92,118])}, O2 ${pick([89,94,98])}%.
EKG pending. What is your immediate next step and one life-threat to exclude now?`,
        tags: ["cards:acs","cards:shock-types"]
      };
    }
    case "pulm": {
      return {
        prompt:
`Micro-case: ${pick([35,48,66])}-year-old post-op day 2 with sudden dyspnea and pleuritic chest pain; O2 ${pick([88,91,94])}%.
Name your first diagnostic test and one management step you would AVOID early.`,
        tags: ["pulm:pe","pulm:abg-interpret"]
      };
    }
    case "neuro": {
      return {
        prompt:
`Micro-case: ${pick([58,72])}-year-old with acute right-sided weakness and aphasia, BP 188/102, glucose 110, onset 90 min ago.
Name one imaging study, one eligibility criterion, and the next single action.`,
        tags: ["neuro:stroke"]
      };
    }
    case "endo": {
      return {
        prompt:
`Micro-case: ${pick([22,29,41])}-year-old with polyuria/polydipsia; labs: glucose 620, Na 130, K 5.6, HCO3 8, ketones positive.
State your first two interventions in order, and one parameter to monitor within 60 minutes.`,
        tags: ["endo:dm-dka-hhs"]
      };
    }
    case "gi": {
      return {
        prompt:
`Micro-case: ${pick([45,63])}-year-old with melena, HR ${pick([96,118,132])}, BP ${pick([92,104,128])}/${pick([54,62,76])}.
Name one immediate stabilization step and one test to localize the bleed.`,
        tags: ["gi:gi-bleed"]
      };
    }
    case "micro": {
      return {
        prompt:
`Micro-case: ${pick([19,26,34])}-year-old returns from camping with fever, headache, myalgias; platelet ${pick([70,120,190])}K; transaminitis mild.
Name the likely vector-borne disease and one first-line treatment.`,
        tags: ["micro:bacteria-gram","micro:abx-stewardship"]
      };
    }
    case "pharm": {
      return {
        prompt:
`Micro-case: Hypertensive emergency with pulmonary edema. Name one IV agent to reduce afterload and one contraindication to avoid.`,
        tags: ["pharm:cardio-pharm"]
      };
    }
    default:
      return {
        prompt: "From symptom → receptor/pathway → lab change: map the chain in 4 steps.",
        tags: ["reasoning:steps"]
      };
  }
}
