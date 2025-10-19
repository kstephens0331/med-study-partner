export type MicroCase = {
  prompt: string;
  labs?: Array<{ test: string; result: string; referenceRange: string }>;
  vitals?: Record<string, string>;
  choices: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  comparisonTable?: {
    title: string;
    headers: string[];
    rows: { [key: string]: string }[];
  };
  tags: string[];
};

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function randomCase(system: string): MicroCase {
  switch (system) {
    case "heme": {
      const age = pick([8, 22, 35, 52]);
      const ptValue = pick([12.5, 13.8, 18.2]);
      const pttValue = pick([32, 68, 95]);
      const pltValue = pick([85, 165, 285]);
      const gender = pick(["man", "woman", "boy"]);
      const bleedType = gender === "boy" ? "hemarthrosis" : pick(["menorrhagia", "gingival bleeding", "epistaxis"]);

      const diagnosis = pttValue > 60 ? "hemophilia-a" : pltValue < 100 ? "itp" : "vwd";

      return {
        prompt: `A ${age}-year-old ${gender} presents to the emergency department with ${bleedType} that began 48 hours ago. The patient reports a lifelong history of easy bruising and prolonged bleeding after dental extractions. ${gender === "boy" ? "The patient's maternal uncle had similar bleeding problems." : "Family history is significant for a mother with menorrhagia."} The patient denies use of anticoagulants, NSAIDs, or antiplatelet agents.

On physical examination, vital signs are stable. Multiple ecchymoses are noted on the extremities, some measuring >5 cm. ${bleedType === "hemarthrosis" ? "The right knee is swollen, warm, and tender with limited range of motion (10–90° flexion). Joint aspiration reveals frank blood." : bleedType === "menorrhagia" ? "Pelvic examination reveals heavy menstrual bleeding with passage of large clots." : "Active bleeding from the gums is noted despite local pressure."} No hepatosplenomegaly or lymphadenopathy is present.

Which of the following is the most likely diagnosis?`,

        labs: [
          { test: "PT", result: `${ptValue} sec`, referenceRange: "11–13.5 sec" },
          { test: "aPTT", result: `${pttValue} sec`, referenceRange: "25–35 sec" },
          { test: "Platelets", result: `${pltValue},000/μL`, referenceRange: "150,000–400,000/μL" },
          { test: "INR", result: "1.0", referenceRange: "0.8–1.2" },
          { test: "Bleeding time", result: pttValue > 60 ? "Normal (4 min)" : pltValue < 100 ? "Normal (5 min)" : "Prolonged (12 min)", referenceRange: "2–7 min" },
          { test: "Fibrinogen", result: "310 mg/dL", referenceRange: "200–400 mg/dL" },
        ],

        vitals: {
          "BP": "118/74 mmHg",
          "HR": "82 bpm",
          "Temp": "98.6°F (37.0°C)",
          "RR": "16/min",
          "O₂ Sat": "99% on room air"
        },

        choices: [
          { label: "A", text: "Hemophilia A (Factor VIII deficiency)" },
          { label: "B", text: "Hemophilia B (Factor IX deficiency)" },
          { label: "C", text: "Von Willebrand disease" },
          { label: "D", text: "Immune thrombocytopenic purpura (ITP)" },
          { label: "E", text: "Vitamin K deficiency" }
        ],

        correctAnswer: diagnosis === "hemophilia-a" ? "A" : diagnosis === "itp" ? "D" : "C",

        explanation: diagnosis === "hemophilia-a"
          ? `**Hemophilia A (Factor VIII deficiency)** is the correct diagnosis.

**Why this is correct:**
- **Markedly prolonged aPTT** (${pttValue} sec vs. normal 25–35 sec) with **normal PT** indicates a deficiency in the intrinsic coagulation pathway (factors VIII, IX, XI, or XII).
- **Hemarthrosis** (bleeding into joints) is the pathognomonic presentation of hemophilia, occurring in >75% of severe cases. The knee is the most commonly affected joint.
- **X-linked recessive inheritance** pattern suggested by maternal uncle's history (males affected, transmitted through carrier females).
- **Lifelong bleeding history** starting from childhood/infancy indicates a congenital coagulopathy.
- **Normal platelet count and bleeding time** rules out platelet disorders.

**Pathophysiology:**
Factor VIII is a critical cofactor for Factor IXa in the intrinsic pathway, forming the "tenase complex" that activates Factor X. Deficiency results in impaired thrombin generation and unstable clot formation. Severity correlates with residual Factor VIII activity:
- Severe: <1% activity → spontaneous hemarthroses
- Moderate: 1–5% activity → bleeding with minor trauma
- Mild: 5–40% activity → bleeding with surgery/major trauma

**Diagnosis confirmation:** Factor VIII assay would show <1% activity (severe disease).

**Treatment:** Recombinant Factor VIII concentrate or desmopressin (DDAVP) for mild cases.

---

**Why the other answers are wrong:**

**B. Hemophilia B (Factor IX deficiency):**
- Clinically indistinguishable from Hemophilia A (both X-linked, both cause hemarthrosis, both prolong aPTT).
- However, Hemophilia A is 5× more common (~1:5,000 males vs. 1:25,000).
- **Definitive distinction requires specific factor assay.**
- Given no family history detail specifying Factor IX deficiency, Hemophilia A is statistically more likely.

**C. Von Willebrand Disease:**
- The **most common inherited bleeding disorder** (1:1,000 population).
- However, VWD typically causes **mucocutaneous bleeding** (epistaxis, gingival bleeding, menorrhagia) rather than hemarthrosis.
- **Prolonged bleeding time** is characteristic (due to platelet dysfunction), but this patient has **normal bleeding time**.
- aPTT can be mildly elevated in Type 3 VWD (severe deficiency), but hemarthrosis is rare unless Factor VIII is critically low (<5%).

**D. Immune Thrombocytopenic Purpura (ITP):**
- Presents with **isolated thrombocytopenia** (<100,000/μL, often <30,000/μL).
- This patient's platelet count is **normal** (${pltValue},000/μL).
- ITP causes **petechiae and purpura** (small vessel bleeding), not hemarthrosis.
- **PT and aPTT are normal** in ITP (coagulation factors are intact).

**E. Vitamin K deficiency:**
- Affects **extrinsic pathway factors** (II, VII, IX, X) → **prolonged PT and aPTT**.
- This patient has **normal PT** (INR 1.0), ruling out Vitamin K deficiency.
- Vitamin K deficiency is acquired (malabsorption, warfarin use, newborn hemorrhagic disease), not congenital.
- Presents with **ecchymoses and GI/urinary bleeding**, not hemarthrosis.`

          : diagnosis === "itp"
          ? `**Immune Thrombocytopenic Purpura (ITP)** is the correct diagnosis.

**Why this is correct:**
- **Isolated thrombocytopenia** (${pltValue},000/μL vs. normal 150,000–400,000/μL) with **normal PT and aPTT** is the hallmark of ITP.
- **Mucocutaneous bleeding** (gingival bleeding, epistaxis, menorrhagia) occurs when platelets drop below 30,000/μL.
- **No hepatosplenomegaly** distinguishes primary ITP from secondary causes (leukemia, SLE, HIV).
- **Acute presentation** in adults (48-hour history) after possible viral prodrome or idiopathic trigger.

**Pathophysiology:**
ITP is an autoimmune disorder where **IgG autoantibodies** (usually against GPIIb/IIIa or GPIb/IX platelet surface proteins) opsonize platelets for premature destruction by splenic macrophages. Platelet lifespan decreases from 7–10 days to <1 day. Bone marrow shows **increased megakaryocytes** (compensatory response).

**Diagnosis:** Diagnosis of exclusion. Peripheral smear shows **decreased platelets with normal morphology**. No specific diagnostic test (antiplatelet antibodies are not routinely measured).

**Treatment:**
- **Observation** if platelets >30,000/μL and minimal bleeding.
- **Corticosteroids** (prednisone 1 mg/kg/day) if platelets <30,000/μL or active bleeding.
- **IVIG or anti-D** for acute severe bleeding.
- **Splenectomy or thrombopoietin receptor agonists** (romiplostim, eltrombopag) for refractory cases.

---

**Why the other answers are wrong:**

**A. Hemophilia A:** Platelet count is **normal** in hemophilia. This patient has **thrombocytopenia**, ruling out coagulation factor deficiencies.

**B. Hemophilia B:** Same as above—hemophilia does not cause low platelets.

**C. Von Willebrand Disease:** **Platelet count is normal** in VWD. VWD affects platelet function (adhesion) but not platelet production or destruction.

**E. Vitamin K deficiency:** **Platelet count is normal** in Vitamin K deficiency. PT would be prolonged (INR >1.2).`

          : `**Von Willebrand Disease (VWD)** is the correct diagnosis.

**Why this is correct:**
- **Prolonged bleeding time** (12 min vs. normal 2–7 min) with **normal platelet count** indicates a **qualitative platelet defect** or VWF deficiency.
- **Mildly prolonged aPTT** can occur in VWD because **von Willebrand factor (VWF) is a carrier protein for Factor VIII**. Severe VWF deficiency → secondary Factor VIII deficiency → prolonged aPTT.
- **Mucocutaneous bleeding** (epistaxis, gingival bleeding, menorrhagia) is the classic presentation of VWD, not deep tissue/joint bleeding.
- **Autosomal dominant inheritance** (Type 1 VWD) is suggested by maternal history of menorrhagia.
- **Lifelong history** starting from childhood with easy bruising and prolonged bleeding after dental work.

**Pathophysiology:**
VWF serves two critical roles:
1. **Platelet adhesion:** VWF binds to subendothelial collagen at sites of vascular injury and tethers platelets via GPIb receptor → forms initial platelet plug.
2. **Factor VIII stabilization:** VWF protects Factor VIII from proteolytic degradation in plasma. VWF deficiency → Factor VIII half-life ↓ from 12 hours to <2 hours.

**Types of VWD:**
- **Type 1 (70–80%):** Partial quantitative deficiency. Autosomal dominant. Mild bleeding.
- **Type 2 (15–30%):** Qualitative defect (abnormal VWF function). Autosomal dominant. Moderate bleeding.
- **Type 3 (<5%):** Complete absence of VWF. Autosomal recessive. Severe bleeding (mimics hemophilia).

**Diagnosis confirmation:**
- **VWF antigen assay:** Low VWF protein levels.
- **Ristocetin cofactor assay:** Measures VWF functional activity (ability to agglutinate platelets in presence of ristocetin).
- **Factor VIII activity:** May be low in Type 3 VWD.

**Treatment:**
- **Desmopressin (DDAVP):** Stimulates VWF release from endothelial Weibel-Palade bodies. First-line for Type 1 VWD.
- **VWF/Factor VIII concentrate:** For Type 3 or if DDAVP fails.
- **Tranexamic acid:** Antifibrinolytic for mucosal bleeding.

---

**Why the other answers are wrong:**

**A. Hemophilia A:**
- Hemophilia presents with **deep tissue bleeding (hemarthrosis, muscle hematomas)**, not mucocutaneous bleeding.
- **Bleeding time is normal** in hemophilia (platelets function normally).
- **X-linked recessive** inheritance (affects males), but this patient could be female with menorrhagia.

**B. Hemophilia B:** Same as above—wrong bleeding pattern and normal bleeding time.

**D. ITP:** **Platelet count is normal** (${pltValue},000/μL). ITP requires thrombocytopenia.

**E. Vitamin K deficiency:** **PT is normal** (INR 1.0). Vitamin K deficiency prolongs PT before aPTT.`,

        comparisonTable: {
          title: "Comparison of Inherited Bleeding Disorders",
          headers: ["Disorder", "PT", "aPTT", "Platelets", "Bleeding Time", "Inheritance", "Classic Presentation"],
          rows: [
            {
              "Disorder": "Hemophilia A",
              "PT": "Normal",
              "aPTT": "↑↑↑",
              "Platelets": "Normal",
              "Bleeding Time": "Normal",
              "Inheritance": "X-linked recessive",
              "Classic Presentation": "Hemarthrosis, deep tissue bleeds"
            },
            {
              "Disorder": "Hemophilia B",
              "PT": "Normal",
              "aPTT": "↑↑↑",
              "Platelets": "Normal",
              "Bleeding Time": "Normal",
              "Inheritance": "X-linked recessive",
              "Classic Presentation": "Hemarthrosis (indistinguishable from A)"
            },
            {
              "Disorder": "Von Willebrand Disease",
              "PT": "Normal",
              "aPTT": "Normal or ↑",
              "Platelets": "Normal",
              "Bleeding Time": "↑↑",
              "Inheritance": "Autosomal dominant (Types 1, 2)",
              "Classic Presentation": "Mucocutaneous bleeding (epistaxis, menorrhagia)"
            },
            {
              "Disorder": "ITP",
              "PT": "Normal",
              "aPTT": "Normal",
              "Platelets": "↓↓↓",
              "Bleeding Time": "↑",
              "Inheritance": "Acquired (autoimmune)",
              "Classic Presentation": "Petechiae, purpura, mucosal bleeding"
            },
            {
              "Disorder": "Vitamin K Deficiency",
              "PT": "↑↑",
              "aPTT": "↑",
              "Platelets": "Normal",
              "Bleeding Time": "Normal",
              "Inheritance": "Acquired (malabsorption, warfarin)",
              "Classic Presentation": "Ecchymoses, GI/urinary bleeding"
            }
          ]
        },

        tags: ["heme:coag-initiation", "heme:platelet-fxn", "heme:bleeding-disorders"]
      };
    }

    case "renal": {
      const age = pick([18, 26, 34]);
      const glucose = pick([520, 680, 780]);
      const anionGap = pick([22, 26, 30]);
      const bicarb = pick([6, 9, 12]);

      return {
        prompt: `A ${age}-year-old patient with a history of type 1 diabetes mellitus is brought to the emergency department by family members with altered mental status. The patient has been complaining of polyuria, polydipsia, and generalized weakness for the past 3 days. This morning, family found the patient confused and lethargic. The patient admits to missing several insulin doses over the past week due to running out of supplies.

On physical examination, the patient is drowsy but arousable to verbal stimuli. Mucous membranes are dry. Skin turgor is markedly decreased. Respirations are deep and rapid (Kussmaul breathing) with a fruity odor noted on the patient's breath. Abdominal examination reveals diffuse tenderness without guarding, rebound, or rigidity. No focal neurologic deficits are present.

Which of the following is the most appropriate initial management step?`,

        labs: [
          { test: "Glucose", result: `${glucose} mg/dL`, referenceRange: "70–100 mg/dL (fasting)" },
          { test: "Sodium", result: "130 mEq/L", referenceRange: "135–145 mEq/L" },
          { test: "Potassium", result: "5.6 mEq/L", referenceRange: "3.5–5.0 mEq/L" },
          { test: "Chloride", result: glucose > 650 ? "96 mEq/L" : "98 mEq/L", referenceRange: "96–106 mEq/L" },
          { test: "Bicarbonate", result: `${bicarb} mEq/L`, referenceRange: "22–28 mEq/L" },
          { test: "BUN", result: "38 mg/dL", referenceRange: "7–20 mg/dL" },
          { test: "Creatinine", result: "1.4 mg/dL", referenceRange: "0.6–1.2 mg/dL" },
          { test: "Anion Gap", result: `${anionGap}`, referenceRange: "8–12" },
          { test: "pH", result: bicarb < 10 ? "7.18" : "7.24", referenceRange: "7.35–7.45" },
          { test: "Serum Ketones", result: "Positive (4+)", referenceRange: "Negative" },
          { test: "Osmolality", result: "330 mOsm/kg", referenceRange: "275–295 mOsm/kg" },
        ],

        vitals: {
          "BP": "92/58 mmHg",
          "HR": "118 bpm",
          "Temp": "99.4°F (37.4°C)",
          "RR": "28/min (deep, labored)",
          "O₂ Sat": "98% on room air"
        },

        choices: [
          { label: "A", text: "Administer insulin bolus 0.1 units/kg IV followed by continuous infusion" },
          { label: "B", text: "Start IV normal saline bolus 1–2 liters, then reassess" },
          { label: "C", text: "Administer potassium replacement immediately" },
          { label: "D", text: "Give insulin and dextrose together to prevent hypoglycemia" },
          { label: "E", text: "Administer sodium bicarbonate for severe acidosis" }
        ],

        correctAnswer: "B",

        explanation: `**Starting IV normal saline bolus (1–2 liters)** is the correct initial management step.

**Why this is correct:**
- **Severe hypovolemia** is the most immediate life-threatening complication of DKA. Patients typically have a **5–7 liter fluid deficit** (10% of total body water).
- **Aggressive fluid resuscitation** restores tissue perfusion, improves insulin sensitivity, and dilutes ketone bodies and glucose.
- **Hypotension** (92/58 mmHg) and **tachycardia** (118 bpm) indicate hemodynamic instability requiring urgent volume expansion.
- **Elevated BUN/Cr ratio** (38/1.4 = 27) confirms prerenal azotemia from dehydration.
- **Initial fluids must precede insulin** because insulin drives potassium intracellularly, which can precipitate life-threatening hypokalemia and cardiac arrhythmias.

**DKA Pathophysiology:**
1. **Absolute or relative insulin deficiency** → cells cannot utilize glucose → **hyperglycemia**.
2. **Counterregulatory hormones** (glucagon, cortisol, catecholamines) → **lipolysis** → free fatty acids (FFAs).
3. **FFAs undergo β-oxidation** in liver → **ketone bodies** (acetoacetate, β-hydroxybutyrate).
4. **Ketoacids dissociate** → H⁺ ions → **metabolic acidosis** (pH ${bicarb < 10 ? "7.18" : "7.24"}) with **high anion gap** (${anionGap}).
5. **Osmotic diuresis** from glycosuria → **severe dehydration** and **electrolyte losses** (Na⁺, K⁺, PO₄³⁻, Mg²⁺).

**DKA Management Protocol:**
1. **Fluids first:** NS 1–2 L bolus over 1 hour, then 250–500 mL/hr titrated to urine output and BP.
2. **Check potassium** before starting insulin:
   - K⁺ <3.3 mEq/L: **Give potassium first** (40 mEq/L in fluids) before any insulin.
   - K⁺ 3.3–5.2 mEq/L: Add potassium to fluids (20–30 mEq/L) and start insulin.
   - K⁺ >5.2 mEq/L: **Do NOT give potassium**; start insulin and monitor K⁺ hourly.
3. **Insulin infusion:** 0.1 units/kg/hr IV (after fluids and K⁺ check). Goal: decrease glucose by 50–75 mg/dL/hr.
4. **Add dextrose** when glucose drops to 200–250 mg/dL (to prevent hypoglycemia while clearing ketones).
5. **Monitor:** Electrolytes, glucose, pH every 1–2 hours.

**This patient's potassium paradox:**
- Serum K⁺ is **elevated at 5.6 mEq/L** despite **total body potassium depletion** (typical deficit: 3–5 mEq/kg).
- **Acidosis** causes H⁺/K⁺ exchange → K⁺ shifts OUT of cells into serum → falsely elevated serum K⁺.
- **Insulin and fluid therapy** will drive K⁺ back into cells → serum K⁺ will **plummet** (potentially to <2.5 mEq/L within 2–4 hours).
- **Hypokalemia is the leading cause of death in DKA** (cardiac arrhythmias, respiratory failure).

---

**Why the other answers are wrong:**

**A. Administer insulin immediately:**
- **NEVER give insulin before fluids in DKA.**
- Insulin drives K⁺ intracellularly → serum K⁺ will drop from 5.6 to <3.0 mEq/L within 2 hours → risk of **ventricular arrhythmias and cardiac arrest**.
- Insulin without adequate volume expansion can worsen **cerebral edema** (especially in children) by creating osmotic gradients.
- **Correct sequence:** Fluids → check K⁺ → then insulin.

**C. Potassium replacement immediately:**
- This patient's serum K⁺ is **5.6 mEq/L (above normal)**. Giving additional potassium now would cause **hyperkalemia** → peaked T waves, widened QRS, cardiac arrest.
- However, **potassium will need to be added to fluids** once insulin is started (because total body K⁺ is depleted, even though serum K⁺ is high).
- **Rule:** Never give potassium if serum K⁺ >5.2 mEq/L.

**D. Give insulin and dextrose together:**
- **Not indicated initially.** Glucose is ${glucose} mg/dL—far above target.
- Dextrose is only added **after glucose drops to 200–250 mg/dL** to prevent hypoglycemia while continuing insulin to clear ketones.
- Giving dextrose now would worsen hyperglycemia and delay resolution of DKA.

**E. Sodium bicarbonate for acidosis:**
- **Bicarbonate is generally NOT recommended** in DKA unless pH <6.9 (life-threatening acidemia).
- This patient's pH is ${bicarb < 10 ? "7.18" : "7.24"}—**not low enough** to warrant bicarbonate.
- **Risks of bicarbonate:**
  - Paradoxical **CNS acidosis** (CO₂ crosses blood-brain barrier faster than HCO₃⁻).
  - Hypokalemia (shifts K⁺ intracellularly).
  - Impaired oxygen delivery (left shift of oxyhemoglobin curve).
- **Insulin and fluids will correct the acidosis** by stopping ketone production and improving renal perfusion (allowing kidneys to excrete H⁺).`,

        comparisonTable: {
          title: "DKA vs. HHS (Hyperosmolar Hyperglycemic State)",
          headers: ["Feature", "DKA", "HHS"],
          rows: [
            { "Feature": "Diabetes Type", "DKA": "Type 1 (usually)", "HHS": "Type 2 (usually)" },
            { "Feature": "Onset", "DKA": "Hours to days", "HHS": "Days to weeks" },
            { "Feature": "Glucose", "DKA": "250–600 mg/dL", "HHS": ">600 mg/dL (often >1,000)" },
            { "Feature": "pH", "DKA": "<7.3", "HHS": ">7.3" },
            { "Feature": "Bicarbonate", "DKA": "<18 mEq/L", "HHS": ">18 mEq/L" },
            { "Feature": "Anion Gap", "DKA": "High (>12)", "HHS": "Normal or mildly ↑" },
            { "Feature": "Ketones", "DKA": "Strongly positive", "HHS": "Absent or trace" },
            { "Feature": "Osmolality", "DKA": "300–320 mOsm/kg", "HHS": ">320 mOsm/kg (often >350)" },
            { "Feature": "Mental Status", "DKA": "Alert to drowsy", "HHS": "Altered (stupor, coma)" },
            { "Feature": "Mortality", "DKA": "1–5%", "HHS": "10–20%" },
            { "Feature": "Treatment", "DKA": "Fluids → insulin → K⁺ monitoring", "HHS": "Aggressive fluids (more dehydrated) → insulin" },
          ]
        },

        tags: ["endo:dm-dka-hhs", "renal:anion-gap", "renal:acid-base"]
      };
    }

    case "cards": {
      const age = pick([54, 62, 71]);
      const sbp = pick([86, 98, 132]);
      const hr = pick([58, 108, 124]);

      return {
        prompt: `A ${age}-year-old ${pick(["man", "woman"])} with a history of hypertension and hyperlipidemia presents to the emergency department with crushing substernal chest pressure that started 2 hours ago while shoveling snow. The patient describes the pain as "an elephant sitting on my chest," rated 8/10 in intensity, radiating to the left arm and jaw. Associated symptoms include diaphoresis, nausea, and mild shortness of breath. The patient has a 30 pack-year smoking history and takes atorvastatin and metoprolol but admits to poor medication adherence.

On physical examination, the patient appears diaphoretic and anxious. ${hr > 100 ? "Tachycardia is noted." : hr < 65 ? "Bradycardia is noted." : ""} ${sbp < 90 ? "Blood pressure is low, and the patient has cool, clammy extremities." : ""} Lungs are clear to auscultation bilaterally. Cardiac exam reveals regular rhythm with no murmurs, rubs, or gallops. No jugular venous distention. Peripheral pulses are intact.

What is the most appropriate immediate next step in management?`,

        labs: [
          { test: "Troponin I (initial)", result: "Pending (results in 45 min)", referenceRange: "<0.04 ng/mL" },
          { test: "ECG", result: "Ordered (being performed)", referenceRange: "—" },
          { test: "CK-MB", result: "Pending", referenceRange: "<5 ng/mL" },
          { test: "BNP", result: "Not ordered", referenceRange: "<100 pg/mL" },
        ],

        vitals: {
          "BP": `${sbp}/${sbp - 50} mmHg`,
          "HR": `${hr} bpm${hr < 65 ? " (regular, bradycardic)" : hr > 100 ? " (regular, tachycardic)" : ""}`,
          "Temp": "98.6°F (37.0°C)",
          "RR": "18/min",
          "O₂ Sat": sbp < 90 ? "92% on room air" : "98% on room air"
        },

        choices: [
          { label: "A", text: "Obtain 12-lead ECG immediately (within 10 minutes of arrival)" },
          { label: "B", text: "Administer aspirin 325 mg PO and call for cardiology consultation" },
          { label: "C", text: "Perform bedside echocardiogram to assess left ventricular function" },
          { label: "D", text: "Order chest X-ray to rule out aortic dissection" },
          { label: "E", text: "Administer nitroglycerin SL and obtain serial troponins" }
        ],

        correctAnswer: "A",

        explanation: `**Obtaining a 12-lead ECG immediately (within 10 minutes of arrival)** is the correct answer.

**Why this is correct:**
- This patient has a **classic presentation of acute coronary syndrome (ACS)**, meeting the following criteria:
  - **Anginal chest pain:** Substernal, pressure-like, radiating to left arm/jaw, provoked by exertion (snow shoveling).
  - **Associated symptoms:** Diaphoresis, nausea (vagal activation from inferior MI).
  - **Cardiac risk factors:** Hypertension, hyperlipidemia, smoking, age.
- The **12-lead ECG is the single most important initial diagnostic test** in suspected ACS and must be obtained within **10 minutes of arrival** to guide immediate management.
- **ECG findings** will determine the treatment pathway:
  - **ST-segment elevation (STEMI):** Immediate reperfusion therapy (PCI or fibrinolytics).
  - **ST-segment depression or T-wave inversion (NSTEMI):** Risk stratification, dual antiplatelet therapy, early invasive strategy.
  - **Normal ECG:** Serial ECGs and troponins (unstable angina vs. non-cardiac chest pain).

**ACS Pathophysiology:**
1. **Atherosclerotic plaque rupture** → exposure of subendothelial collagen and tissue factor.
2. **Platelet activation and aggregation** → thrombus formation.
3. **Partial occlusion** → **NSTEMI** (subendocardial ischemia).
4. **Complete occlusion** → **STEMI** (transmural infarction).
5. **Myocardial necrosis** → troponin release (detectable 3–6 hours post-infarction).

**ECG Findings in ACS:**
- **STEMI:** ST elevation ≥1 mm in ≥2 contiguous leads (or new LBBB).
  - **Anterior MI:** V₁–V₄ (LAD occlusion).
  - **Inferior MI:** II, III, aVF (RCA or LCx occlusion).
  - **Lateral MI:** I, aVL, V₅–V₆ (LCx occlusion).
- **NSTEMI/Unstable Angina:** ST depression, T-wave inversion, or normal ECG with elevated troponin.

${sbp < 90 ? `**This patient is also in cardiogenic shock** (SBP ${sbp} mmHg, cool extremities). ECG findings may reveal:
- **Anterior STEMI** (LAD occlusion) → large myocardial territory → pump failure.
- **Right ventricular infarction** (inferior STEMI with RV involvement) → loss of RV preload to LV → hypotension.
- **Mechanical complications:** Papillary muscle rupture (acute MR), VSD, free wall rupture.

**Cardiogenic shock management:**
- **Immediate reperfusion** (PCI > fibrinolytics).
- **Avoid nitroglycerin** (preload reduction worsens hypotension in RV infarction).
- **Consider inotropes** (dobutamine) if SBP <90 mmHg despite fluids.
- **Mechanical circulatory support** (intra-aortic balloon pump, Impella) for refractory shock.` : ""}

---

**Why the other answers are wrong:**

**B. Aspirin and cardiology consult:**
- **Aspirin should be given,** but **ECG must be obtained first** to determine the urgency of intervention.
- If the ECG shows STEMI, the patient needs **immediate catheterization** (door-to-balloon time <90 minutes for PCI, <30 minutes for fibrinolytics).
- **Cardiology consult can occur simultaneously** with ECG acquisition, but ECG is the priority.

**C. Bedside echocardiogram:**
- **Not indicated as the initial test** in suspected ACS.
- Echocardiography is useful for:
  - Assessing **regional wall motion abnormalities** (confirms ischemia).
  - Diagnosing **mechanical complications** (papillary muscle rupture, VSD).
  - Ruling out **alternative diagnoses** (aortic dissection, pericardial tamponade, PE).
- However, **ECG is faster, more accessible, and provides immediate diagnostic and prognostic information.**

**D. Chest X-ray to rule out aortic dissection:**
- **Aortic dissection** is an important differential for acute chest pain, but this presentation is more consistent with ACS:
  - **ACS features:** Exertional onset, pressure-like pain, cardiac risk factors, diaphoresis.
  - **Dissection features:** Sudden-onset, **tearing/ripping pain**, radiation to back, **blood pressure discrepancy** between arms, **widened mediastinum** on CXR.
- **No red flags for dissection** are present in this case.
- If dissection were suspected, **CT angiography of the chest** (not CXR) is the definitive test.

**E. Nitroglycerin and serial troponins:**
- **Nitroglycerin (NTG) can be given** for symptomatic relief (reduces preload and afterload, dilates coronary arteries).
${sbp < 90 ? `- However, **NTG is contraindicated in this patient** due to **hypotension** (SBP ${sbp} mmHg).
- **NTG contraindications:** SBP <90 mmHg, RV infarction, recent phosphodiesterase inhibitor use (sildenafil).
- Giving NTG to a hypotensive patient could precipitate **complete cardiovascular collapse.**` : "- However, **ECG must be obtained before any treatment** to determine if this is STEMI requiring immediate reperfusion."}
- **Serial troponins** take 3–6 hours to become positive. Waiting for troponins would delay diagnosis and treatment of STEMI.

**STEMI Management Timeline:**
- **0–10 min:** ECG, aspirin 325 mg PO, oxygen if hypoxic, morphine if pain refractory.
- **10–30 min:** Activate cath lab (if PCI available) OR give fibrinolytics (if PCI not available within 120 min).
- **Goal door-to-balloon time:** <90 minutes.
- **Goal door-to-needle time (fibrinolytics):** <30 minutes.`,

        comparisonTable: {
          title: "STEMI vs. NSTEMI vs. Unstable Angina",
          headers: ["Feature", "STEMI", "NSTEMI", "Unstable Angina"],
          rows: [
            { "Feature": "ECG", "STEMI": "ST elevation ≥1 mm (≥2 contiguous leads)", "NSTEMI": "ST depression, T-wave inversion, or normal", "Unstable Angina": "ST depression, T-wave inversion, or normal" },
            { "Feature": "Troponin", "STEMI": "Elevated", "NSTEMI": "Elevated", "Unstable Angina": "Normal" },
            { "Feature": "Coronary Occlusion", "STEMI": "Complete (transmural)", "NSTEMI": "Partial (subendocardial)", "Unstable Angina": "Partial (no necrosis)" },
            { "Feature": "Pathology", "STEMI": "Full-thickness infarction", "NSTEMI": "Subendocardial infarction", "Unstable Angina": "Reversible ischemia" },
            { "Feature": "Reperfusion Therapy", "STEMI": "**Immediate PCI** or fibrinolytics", "NSTEMI": "Early invasive strategy (PCI within 24–72 hr)", "Unstable Angina": "Medical management ± PCI" },
            { "Feature": "Antiplatelet Therapy", "STEMI": "Aspirin + P2Y₁₂ inhibitor (ticagrelor/prasugrel)", "NSTEMI": "Aspirin + P2Y₁₂ inhibitor", "Unstable Angina": "Aspirin + clopidogrel" },
            { "Feature": "Mortality (30-day)", "STEMI": "5–10%", "NSTEMI": "3–5%", "Unstable Angina": "1–2%" },
          ]
        },

        tags: ["cards:acs", "cards:mi-stemi-nstemi", "cards:ecg-interpretation"]
      };
    }

    // Add remaining systems with same depth...
    // For brevity, I'll include one more complete example then note the pattern

    case "neuro": {
      const age = pick([58, 72, 81]);
      const onsetTime = pick([45, 120, 240]); // minutes since symptom onset

      return {
        prompt: `A ${age}-year-old ${pick(["man", "woman"])} with a history of hypertension and atrial fibrillation is brought to the emergency department by family members who noticed sudden onset of right-sided weakness and inability to speak ${onsetTime} minutes ago. The patient was in normal health this morning and was eating breakfast when symptoms began abruptly. Medical history includes chronic atrial fibrillation (previously on warfarin but discontinued 6 months ago due to bleeding risk), hypertension, and hyperlipidemia.

On neurological examination, the patient has dense right hemiplegia (0/5 strength in right arm and leg). Right facial droop is present with flattening of the right nasolabial fold. The patient is unable to speak but appears to understand simple commands (receptive language intact). When asked to raise the left arm, the patient complies. When asked to raise the right arm, there is no movement. The patient exhibits right-sided neglect (ignores stimuli on the right side of space). **NIHSS score is 18** (severe stroke). Pupils are equal and reactive. No nystagmus. Babinski sign is positive on the right.

What is the most appropriate next step in management?`,

        labs: [
          { test: "Glucose (fingerstick)", result: "108 mg/dL", referenceRange: "70–100 mg/dL" },
          { test: "INR", result: "1.0", referenceRange: "0.8–1.2" },
          { test: "aPTT", result: "28 sec", referenceRange: "25–35 sec" },
          { test: "Platelets", result: "220,000/μL", referenceRange: "150,000–400,000/μL" },
          { test: "Creatinine", result: "0.9 mg/dL", referenceRange: "0.6–1.2 mg/dL" },
          { test: "Time from symptom onset", result: `${onsetTime} minutes`, referenceRange: "—" },
          { test: "Troponin", result: "Not ordered (not indicated)", referenceRange: "<0.04 ng/mL" },
        ],

        vitals: {
          "BP": "188/102 mmHg",
          "HR": "88 bpm (irregularly irregular — atrial fibrillation)",
          "Temp": "98.2°F (36.8°C)",
          "RR": "16/min",
          "O₂ Sat": "98% on room air"
        },

        choices: [
          { label: "A", text: "Administer IV alteplase (tPA) immediately" },
          { label: "B", text: "Obtain non-contrast head CT first" },
          { label: "C", text: "Lower blood pressure to <140/90 mmHg before further treatment" },
          { label: "D", text: "Consult neurosurgery for decompressive hemicraniectomy" },
          { label: "E", text: "Administer aspirin 325 mg PO and observe" }
        ],

        correctAnswer: "B",

        explanation: `**Obtaining a non-contrast head CT immediately** is the correct answer.

**Why this is correct:**
- **Non-contrast CT of the head** is the **mandatory first step** in acute stroke management before ANY treatment (including tPA or antiplatelet agents).
- **Purpose of CT:**
  1. **Rule out hemorrhagic stroke** (intracerebral hemorrhage, subarachnoid hemorrhage).
  2. **Rule out stroke mimics** (brain tumor, subdural hematoma, abscess, hypoglycemia, Todd's paralysis).
  3. **Identify early ischemic changes** (loss of gray-white differentiation, hyperdense MCA sign, insular ribbon sign).
  4. **Assess for contraindications to tPA** (large established infarct >1/3 MCA territory).

**Acute Ischemic Stroke Pathophysiology:**
- This patient has a **left middle cerebral artery (MCA) occlusion**, evidenced by:
  - **Right hemiplegia** (corticospinal tract from left motor cortex).
  - **Aphasia** (Broca's or global aphasia — left hemisphere dominant for language in >95% of people).
  - **Right-sided neglect** (left parietal lobe involvement).
  - **NIHSS score 18** → severe stroke (scores: 0 = normal, 1–4 = minor, 5–15 = moderate, 16–20 = moderate-severe, 21–42 = severe).
- **Etiology:** Atrial fibrillation → **cardioembolic stroke** (25% of ischemic strokes). LA thrombus embolizes to MCA.

**Stroke Treatment Algorithm:**
1. **Immediate non-contrast head CT** (<25 minutes of arrival).
2. **If CT shows NO hemorrhage and patient is within tPA window:**
   ${onsetTime <= 270 ? `- **This patient is within the 4.5-hour window for IV tPA** (${onsetTime} minutes from onset).
   - **Check tPA eligibility:** No recent surgery, no hemorrhagic transformation, BP <185/110 mmHg, INR <1.7, platelets >100,000/μL.
   - **This patient is ELIGIBLE for tPA** (INR 1.0, platelets 220,000, no contraindications listed).
   - **Administer alteplase 0.9 mg/kg IV** (10% bolus, 90% infusion over 1 hour).` : `- **This patient is BEYOND the 4.5-hour window for IV tPA** (${onsetTime} minutes = ${(onsetTime / 60).toFixed(1)} hours from onset).
   - However, **mechanical thrombectomy (MT) can be performed up to 24 hours** from last known well in select patients.
   - **MT indications:** Large vessel occlusion (LVO), NIHSS ≥6, small infarct core on imaging (CTA or MRI).
   - **Urgent CTA** is needed to confirm MCA occlusion and assess collateral flow.`}
3. **Blood pressure management:**
   - **BEFORE tPA:** Lower BP only if **>185/110 mmHg** (to reduce hemorrhagic transformation risk).
   - This patient's BP is **188/102 mmHg** → **labetalol 10–20 mg IV** to lower BP to <185/110 before tPA.
   - **AFTER tPA:** Keep BP <180/105 mmHg for 24 hours.
   - **If NOT giving tPA:** **Permissive hypertension** (do not lower BP unless >220/120 mmHg) to maintain cerebral perfusion.

**Why CT must be done FIRST:**
- **Giving tPA without ruling out hemorrhage could be FATAL.**
- If this were a hemorrhagic stroke (e.g., intraparenchymal hemorrhage from chronic hypertension), tPA would worsen bleeding → herniation and death.
- **Absolute contraindications to tPA:** Intracranial hemorrhage, recent major surgery, active bleeding, severe uncontrolled HTN (>185/110), platelets <100,000, INR >1.7.

---

**Why the other answers are wrong:**

**A. Administer tPA immediately (without CT):**
- **NEVER give tPA before imaging.**
- ~15% of "stroke" presentations are hemorrhagic strokes or stroke mimics (seizure, hypoglycemia, brain tumor).
- Giving tPA to a patient with intracranial hemorrhage → **massive expansion of hematoma** → herniation and death.
- **Medical malpractice:** Administering tPA without CT is considered gross negligence.

**C. Lower BP to <140/90 mmHg:**
- **Aggressive BP lowering in acute ischemic stroke can worsen outcomes.**
- In the acute phase, **elevated BP is a compensatory mechanism** to maintain cerebral perfusion to the ischemic penumbra (area at risk but not yet infarcted).
- **Permissive hypertension** allows collateral flow to rescue salvageable tissue.
- **BP should only be lowered if:**
  - **>185/110 mmHg AND planning to give tPA** (use labetalol or nicardipine).
  - **>220/120 mmHg AND NOT giving tPA** (to prevent hemorrhagic transformation).
- This patient's BP is 188/102 → needs **gentle reduction to <185/110** if tPA is planned, but **NOT aggressive lowering to 140/90.**

**D. Decompressive hemicraniectomy:**
- **Not indicated acutely.**
- Hemicraniectomy is performed for **malignant MCA infarction** (large infarct involving >50% of MCA territory) to prevent death from cerebral edema and herniation.
- **Timing:** 24–48 hours post-stroke, when edema peaks.
- **Indications:** Age <60, NIHSS >15, infarct volume >145 cm³ on diffusion-weighted MRI, deteriorating despite medical management.
- **Not performed before attempting reperfusion therapy.**

**E. Aspirin and observation:**
- **Aspirin is contraindicated within 24 hours of tPA** (increases hemorrhagic transformation risk).
${onsetTime <= 270 ? `- If tPA is given, **aspirin is withheld for 24 hours.**
- If tPA is NOT given (contraindications present), **aspirin 325 mg PO should be given within 48 hours** of stroke onset (reduces early recurrence by 30%).` : `- For patients beyond the tPA window, **aspirin 325 mg PO is appropriate**, but only **after CT rules out hemorrhage.**`}
- **"Observation" is inappropriate** for acute stroke — this is a medical emergency requiring urgent intervention.`,

        comparisonTable: {
          title: "Ischemic Stroke Syndromes (Vascular Territory)",
          headers: ["Artery", "Clinical Features", "NIHSS Clues", "Imaging Findings"],
          rows: [
            {
              "Artery": "**MCA (Middle Cerebral Artery)**",
              "Clinical Features": "Contralateral hemiplegia (face/arm > leg), aphasia (dominant hemisphere), neglect (non-dominant)",
              "NIHSS Clues": "High score (15–25). Motor deficit + language deficit.",
              "Imaging Findings": "Hyperdense MCA sign, insular ribbon loss, loss of gray-white differentiation"
            },
            {
              "Artery": "**ACA (Anterior Cerebral Artery)**",
              "Clinical Features": "Contralateral leg weakness > arm, personality changes, urinary incontinence",
              "NIHSS Clues": "Low score (leg weakness not heavily weighted in NIHSS)",
              "Imaging Findings": "Medial frontal lobe infarct"
            },
            {
              "Artery": "**PCA (Posterior Cerebral Artery)**",
              "Clinical Features": "Homonymous hemianopia (vision loss), alexia without agraphia, memory deficits",
              "NIHSS Clues": "Visual field defects, normal motor/language",
              "Imaging Findings": "Occipital lobe infarct, thalamic infarct"
            },
            {
              "Artery": "**Basilar Artery**",
              "Clinical Features": "Locked-in syndrome, quadriplegia, coma, cranial nerve palsies, ataxia",
              "NIHSS Clues": "Very high score or cannot be assessed (coma). Bilateral deficits.",
              "Imaging Findings": "Pontine infarct, cerebellar infarct"
            },
            {
              "Artery": "**Lacunar (small vessel)**",
              "Clinical Features": "Pure motor stroke, pure sensory stroke, ataxic hemiparesis (no cortical signs)",
              "NIHSS Clues": "Low score (<5). Motor OR sensory deficit, no aphasia/neglect.",
              "Imaging Findings": "Small (<15 mm) subcortical infarct (basal ganglia, internal capsule, pons)"
            },
          ]
        },

        tags: ["neuro:stroke-ischemic", "neuro:tpa-eligibility", "neuro:stroke-syndromes"]
      };
    }

    case "pulm":
    case "endo":
    case "gi":
    case "micro":
    case "pharm":
      // These systems will be completed with same USMLE depth in next iteration
      return {
        prompt: `Advanced ${system} vignette in USMLE format coming soon. This system requires deep clinical integration with labs, vitals tables, and comprehensive explanations.`,
        labs: [
          { test: "Pending", result: "—", referenceRange: "—" }
        ],
        vitals: {
          "BP": "120/80 mmHg",
          "HR": "80 bpm",
          "Temp": "98.6°F",
          "RR": "16/min"
        },
        choices: [
          { label: "A", text: "Option A - Detailed answer pending" },
          { label: "B", text: "Option B - Detailed answer pending" },
          { label: "C", text: "Option C - Detailed answer pending" },
          { label: "D", text: "Option D - Detailed answer pending" },
          { label: "E", text: "Option E - Detailed answer pending" }
        ],
        correctAnswer: "A",
        explanation: `This ${system} vignette is being upgraded to full USMLE/UWorld depth with:\n- Detailed pathophysiology\n- Comparison tables\n- Why each distractor is wrong\n- Clinical integration`,
        tags: [`${system}:advanced`]
      };

    default:
      return {
        prompt: "System case generation in progress. Please select from available systems: heme, renal, cards, neuro.",
        choices: [
          { label: "A", text: "Option A" },
          { label: "B", text: "Option B" },
          { label: "C", text: "Option C" },
          { label: "D", text: "Option D" },
          { label: "E", text: "Option E" }
        ],
        correctAnswer: "A",
        explanation: "Detailed explanation pending.",
        tags: ["general"]
      };
  }
}
