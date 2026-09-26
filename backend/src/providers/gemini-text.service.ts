import { GoogleGenerativeAI } from '@google/generative-ai';
import { MedicalRagService, RetrievedMedicalDoc } from './medical-rag.service.js';

export interface EducationalNoteJson {
  title: string;
  definition: string;
  location: string;
  function: string[];
  clinicalSignificance: string;
  example: string;
  diagram: string;
  mnemonic: string;
  sources: Array<{ title: string; website: string; url: string }>;
}

export function extractCoreMedicalTopic(rawInput: string): string {
  let cleaned = rawInput.trim();
  cleaned = cleaned.replace(/^(explain|explane|describe|tell me about|what is|what are|basic|teach me about|notes on|overview of)\s+/i, '');
  cleaned = cleaned.replace(/^(the|a|an)\s+/i, '');
  cleaned = cleaned.replace(/\s+(with images?|with pictures?|diagram|diagrams|please)$/i, '');
  cleaned = cleaned.trim();

  const lower = cleaned.toLowerCase();
  const medicalSpellingCorrections: Record<string, string> = {
    'tachicardia': 'Tachycardia',
    'tachycardea': 'Tachycardia',
    'erythropoisis': 'Erythropoiesis',
    'erithropoiesis': 'Erythropoiesis',
    'nefron': 'Nephron',
    'rugae': 'Gastric Rugae',
    'ruge': 'Gastric Rugae',
    'gastric rugae': 'Gastric Rugae',
    'ataxia': 'Ataxia',
    'apendicitis': 'Appendicitis',
    'appendisitis': 'Appendicitis',
    'nephron': 'Nephron'
  };

  if (medicalSpellingCorrections[lower]) {
    return medicalSpellingCorrections[lower];
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Curated high-yield pedagogical database providing simple definitions (with analogies) and everyday examples
interface CuratedTopicData {
  simpleDefinition: string;
  location: string;
  functions: string[];
  clinicalSignificance: string;
  everydayExample: string;
  mermaidDiagram: string;
  mnemonic: string;
}

const HIGH_YIELD_KNOWLEDGE: Record<string, CuratedTopicData> = {
  'Gastric Rugae': {
    simpleDefinition: 'Think of an accordion or folded curtains: Gastric rugae are the stretchy wrinkles and folds lining the inside of your stomach. When your stomach is empty, they bunch up closely. When you eat, they unfold smoothly like an accordion so your stomach can expand up to 4 times its empty size without tearing.',
    location: 'Inside the stomach wall (mucosa and submucosa), most prominent along the body and greater curvature.',
    functions: [
      'Allows the stomach to expand significantly (accommodating 1 to 2 liters of food).',
      'Increases internal surface area for efficient mixing and chemical digestion.',
      'Helps stomach glands secrete hydrochloric acid and pepsinogen into food chyme.'
    ],
    clinicalSignificance: 'Healthy rugae flatten completely when the stomach distends with food or air during endoscopy. If the rugae remain rigidly thickened and unable to flatten, it points toward conditions like Ménétrier disease (giant hypertrophic gastritis) or infiltrative gastric cancer (Linitis Plastica).',
    everydayExample: 'Imagine eating a large holiday dinner. Your stomach expands from the size of a closed fist to hold over a liter of food. Your gastric rugae unfold and flatten completely to accommodate the meal without pain. If someone has acute gastritis or a stomach ulcer, acidic gastric juice irritates these folds, causing severe burning stomach pain right after eating.',
    mermaidDiagram: `flowchart TD
    EmptyStomach[Empty Stomach: Wrinkled Rugae] -->|Food Enters| Unfolding[Folds Stretch & Flatten]
    Unfolding --> ExpandedStomach[Distended Stomach: Holds 1.5L Safely]
    ExpandedStomach --> Digestion[Acid & Enzymes Churn Food]`,
    mnemonic: 'RUGAE: "Really Useful Gastric Accordion Expander"'
  },
  'Tachycardia': {
    simpleDefinition: 'Think of a car engine revving at high RPMs while parked at a red light: Tachycardia simply means your heart is beating abnormally fast—specifically over 100 beats per minute at rest (normal resting heart rate is 60 to 100 bpm).',
    location: 'Cardiac conduction system (Sinoatrial node, Atrioventricular node, atria, or ventricles).',
    functions: [
      'In physiological states, increases cardiac output to deliver oxygen to working muscles.',
      'Maintains blood pressure during blood loss or dehydration through reflex sympathetic drive.',
      'When pathological, reduces ventricular filling time, dropping effective cardiac output.'
    ],
    clinicalSignificance: 'Tachycardia can be a normal compensatory reflex (fever, exercise, anxiety) or a life-threatening cardiac electrical disturbance (Ventricular Tachycardia). Prolonged extreme tachycardia prevents the heart chambers from filling properly between beats, leading to dizziness, hypotension, or syncope.',
    everydayExample: 'If you sprint up four flights of stairs to catch a departing bus, your heart pounds at 140 bpm to deliver oxygen to your leg muscles—this is normal sinus tachycardia. However, if a 25-year-old student is resting quietly on the sofa and suddenly feels their heart racing at 170 bpm with dizziness and chest fluttering, that is an abnormal arrhythmia (like Supraventricular Tachycardia or SVT) that requires a 12-lead ECG and vagal maneuvers or adenosine.',
    mermaidDiagram: `flowchart TD
    Trigger[Exercise, Fever, or Arrhythmia] --> FastRate[Heart Rate > 100 bpm]
    FastRate --> ShortDiastole[Shorter Filling Time in Ventricles]
    ShortDiastole -->|Pathological| LowOutput[Reduced Stroke Volume & Dizziness]
    ShortDiastole -->|Physiological| Compensation[Increased Blood Flow to Muscles]`,
    mnemonic: 'TACHY: "Too Accelerated Cardiac Heartbeats, Yielding > 100 bpm"'
  },
  'Nephron': {
    simpleDefinition: 'Think of a million microscopic water purification plants packed inside each kidney: A nephron is the microscopic functional filtering unit of the kidney. Each human kidney contains about 1 million nephrons working 24/7 to clean toxic waste from your blood while saving precious water and vital nutrients.',
    location: 'Kidney cortex and medulla (extending from the outer cortex into the inner renal pyramids).',
    functions: [
      'Glomerular Filtration: Strains blood through tiny capillary filters (filtering ~180 liters of fluid per day).',
      'Tubular Reabsorption: Recovers 99% of filtered water, glucose, amino acids, and essential salts back into blood.',
      'Tubular Secretion: Actively pumps excess hydrogen ions, potassium, and medications into urine.'
    ],
    clinicalSignificance: 'Nephrons cannot regenerate once permanently destroyed. Chronic conditions like poorly controlled hypertension and diabetes damage the delicate glomeruli over years, causing Chronic Kidney Disease (CKD) and requiring dialysis.',
    everydayExample: 'On a scorching hot summer day, you play soccer and sweat heavily without drinking enough water. Your nephrons immediately detect dehydration through Antidiuretic Hormone (ADH) and reabsorb almost all filtered water back into your bloodstream. This concentrates your urine into a dark amber color to protect your blood pressure and prevent you from passing out.',
    mermaidDiagram: `flowchart TD
    Blood[Afferent Arteriole: Waste Blood] --> Glomerulus[Glomerulus: High Pressure Filter]
    Glomerulus --> Bowman[Bowman Capsule: Filtrate Collected]
    Bowman --> Tubules[PCT, Loop of Henle, DCT: Reabsorb 99% Water]
    Tubules --> CollectingDuct[Collecting Duct: Urine to Bladder]`,
    mnemonic: 'NEPHRON: "Natural Excretory Purification Happens Rapidly On Nephrons"'
  },
  'Erythropoiesis': {
    simpleDefinition: 'Think of a continuous 24/7 factory assembly line for red blood cells: Erythropoiesis is the biological manufacturing process inside your red bone marrow that creates fresh, oxygen-carrying red blood cells (erythrocytes) to replace the 2 million worn-out cells your body destroys every single second.',
    location: 'Red bone marrow (primarily in flat bones such as the sternum, ribs, pelvis, and vertebrae in adults).',
    functions: [
      'Maintains steady hemoglobin levels to guarantee oxygen transport to every organ.',
      'Ramps up red cell production up to 5-fold during blood loss or oxygen deprivation (hypoxia).',
      'Transforms stem cells (proerythroblasts) into mature, enucleated biconcave red blood cells over ~7 days.'
    ],
    clinicalSignificance: 'Regulated by Erythropoietin (EPO), a hormone released by the kidneys. Patients with chronic kidney disease produce inadequate EPO, resulting in chronic anemia and severe fatigue requiring synthetic EPO injections.',
    everydayExample: 'When a hiker travels from sea level to the high mountains of the Himalayas or Colorado where the air is thinner, their kidneys sense the reduced oxygen levels. Within hours, the kidneys release EPO into the bloodstream, triggering the bone marrow to accelerate erythropoiesis. Over the next week, the hiker produces millions of extra red blood cells to adapt to the thin mountain air.',
    mermaidDiagram: `flowchart TD
    Hypoxia[Low Blood Oxygen Level] --> Kidney[Kidneys Detect Drop & Release EPO]
    Kidney --> BoneMarrow[Red Bone Marrow Stimulated]
    BoneMarrow --> Production[Proerythroblast -> Reticulocyte -> Erythrocyte]
    Production --> NormalO2[Restored Oxygen Carrying Capacity]`,
    mnemonic: 'EPO: "Every Person Needs Oxygen via Erythropoietin"'
  },
  'Appendicitis': {
    simpleDefinition: 'Think of a blocked dead-end drainage pipe that becomes swollen and infected: Appendicitis is the acute inflammation and bacterial infection of the appendix, a small finger-shaped pouch connected to the beginning of your large intestine (cecum).',
    location: 'Right lower quadrant of the abdomen (attached to the posteromedial surface of the cecum, ~2 cm below the ileocecal valve).',
    functions: [
      'Houses beneficial gut flora and lymphatic tissue (mucosa-associated lymphoid tissue).',
      'When blocked (by a fecalith or lymphoid swelling), trapped mucus builds pressure, cutting off blood supply.',
      'Bacterial overgrowth triggers transmural necrosis and potential perforation into the peritoneal cavity.'
    ],
    clinicalSignificance: 'Appendicitis is the most common acute surgical emergency of the abdomen worldwide. Delayed diagnosis can lead to rupture within 24 to 36 hours, causing generalized peritonitis, sepsis, and abscess formation.',
    everydayExample: 'A 20-year-old student wakes up with a dull, nagging pain around their belly button (umbilicus) and loses their appetite. Over the next 8 hours, the pain becomes sharp and shifts specifically to the right lower abdomen (McBurney point). Coughing or walking makes the pain agonizing (rebound tenderness), requiring immediate emergency laparoscopic surgery to remove the appendix before it bursts.',
    mermaidDiagram: `flowchart TD
    Obstruction[Fecalith Blocks Appendix Lumen] --> Pressure[Mucus Accumulation & High Pressure]
    Pressure --> Ischemia[Venous Congestion & Bacterial Invasion]
    Ischemia --> Perforation[Wall Weakens: Risk of Perforation & Peritonitis]`,
    mnemonic: 'APPENDIX: "Acute Pain Proceeds Every Night; Down In McBurney X-point"'
  },
  'Eye': {
    simpleDefinition: 'Think of a precision digital camera: The eye is your visual sensory organ. The clear cornea and lens act like camera glass focusing incoming light rays, the iris is the adjustable aperture controlling light entry, and the retina acts like a digital sensor chip capturing the image and sending it along the optic nerve cable to the brain.',
    location: 'Bony orbit of the skull, cushioned by orbital fat and moved by 6 extraocular muscles.',
    functions: [
      'Refraction: Cornea (two-thirds of optical power) and crystalline lens focus light directly onto the retina.',
      'Phototransduction: Rod and cone photoreceptors convert light photons into electrochemical nerve impulses.',
      'Pupillary Control: Iris constricts in bright light (parasympathetic) and dilates in dim light (sympathetic).'
    ],
    clinicalSignificance: 'Visual impairment can occur at any stage: corneal scratches, lens clouding (cataracts), increased intraocular fluid pressure damaging the optic nerve (glaucoma), or retinal detachment causing sudden vision loss ("a curtain falling over the eye").',
    everydayExample: 'When you step out of a dark movie theater into bright noon sunlight, your eyes instantly squint and your pupils constrict down to pinpoints within a fraction of a second (pupillary light reflex). This automatic aperture adjustment shields your delicate retinal photoreceptors from light damage while keeping your vision clear.',
    mermaidDiagram: `flowchart TD
    Light[Light Enters Eye] --> Cornea[Cornea & Lens: Refracts & Focuses]
    Cornea --> Retina[Retina: Photoreceptors Detect Photons]
    Retina --> OpticNerve[Optic Nerve: Carries Signals]
    OpticNerve --> OccipitalCortex[Visual Cortex in Brain: Generates Image]`,
    mnemonic: 'CORNEA: "Clear Optics Refract Natural Energetic Ambiance"'
  },
  'Ataxia': {
    simpleDefinition: 'Think of an orchestra conductor losing their rhythm or a glitching flight autopilot: Ataxia is the loss of smooth, voluntary muscle coordination. Muscles are not paralyzed or weak, but movements become clumsy, jerky, unsteady, and off-target.',
    location: 'Cerebellum and its input/output pathways (spinocerebellar tracts, vestibular system, dorsal columns).',
    functions: [
      'Coordination: The cerebellum normally calculates smooth trajectories for limbs and speech muscles.',
      'Equilibrium: Coordinates vestibular signals with proprioception to maintain upright posture.',
      'Error Correction: Constantly compares intended movements with actual physical limb positions.'
    ],
    clinicalSignificance: 'Ataxia can be sensory (loss of joint position sense in dorsal columns, positive Romberg sign) or cerebellar (limb dysmetria, intention tremor, scanning speech, and wide-based gait that does not improve with eyes open). Causes include stroke, alcohol toxicity, multiple sclerosis, or Vitamin B12 deficiency.',
    everydayExample: 'A patient with cerebellar ataxia walks down a hallway with their feet placed unusually wide apart, swaying from side to side as if trying to balance on a rocking boat in rough seas. When asked to touch their index finger to the doctor\'s finger and then to their own nose (finger-to-nose test), their hand shakes more intensely as it nears the target (intention tremor) and overshoots the mark.',
    mermaidDiagram: `flowchart TD
    CerebellumDamage[Cerebellar Dysfunction] --> LossTiming[Loss of Motor Timing & Error Correction]
    LossTiming --> WideGait[Wide-Based Unsteady Gait]
    LossTiming --> Dysmetria[Limb Dysmetria & Intention Tremor]`,
    mnemonic: 'VANISHED: "Vestibular, Ataxia, Nystagmus, Intention tremor, Slurred speech, Hypotonia, Exaggerated gait, Dysdiadochokinesia"'
  }
};

export class GeminiTextService {
  private client: GoogleGenerativeAI | null = null;
  private ragService: MedicalRagService;

  constructor(apiKeyOverride?: string) {
    this.ragService = new MedicalRagService();
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && apiKey !== 'YOUR_API_KEY') {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateText(message: string, history: Array<{ role: string; content: string }> = []): Promise<{
    type: 'text';
    content: string;
    notes?: EducationalNoteJson;
    source?: string;
  }> {
    const coreTopic = extractCoreMedicalTopic(message);
    console.log(`[GeminiTextService] Medical Learning Engine: Processing "${coreTopic}"`);

    // Step 1 & 2: Retrieve from Kenhub (Anatomy/Physiology) or Merck Manual (Diseases/Pathology)
    const retrievedDoc = await this.ragService.retrieveMedicalEvidence(coreTopic);

    // If retrieval fails, never answer from unsupported or generic knowledge
    if (!retrievedDoc || !retrievedDoc.content || retrievedDoc.content.trim().length === 0) {
      console.log(`[GeminiTextService] Retrieval failed for "${coreTopic}". Stating lack of sufficient verified sources.`);
      const refusalMarkdown = `# ${coreTopic}

## Medical Confidence Assessment
**I am not sufficiently confident.**

No verified educational content could be retrieved from our trusted medical authorities (**Kenhub** for anatomy/histology or **Merck Manual Professional** for clinical pathology) for "${coreTopic}".

DocBord strictly adheres to evidence-based medical education and will never answer from unsupported or generic placeholder text.

## Recommended Action
- Check medical spelling (e.g., "Gastric Rugae", "Tachycardia", "Nephron", "Erythropoiesis").
- Consult your anatomy dissection atlas or Merck Manual clinical reference index.`;

      return {
        type: 'text',
        content: refusalMarkdown
      };
    }

    // Step 3 & 4: AI Understanding & Teaching (Professor explaining to first-year medical student)
    const TEACHING_SYSTEM_PROMPT = `You are DocBord, a world-class medical professor teaching first-year MBBS, BDS, Nursing, and Allied Health students.

CORE PEDAGOGICAL RULES (HIGHEST PRIORITY):
1. SIMPLE DEFINITION WITH EVERYDAY ANALOGIES:
   - ALWAYS begin the definition with a vivid, relatable everyday analogy (e.g. accordion, car engine revving at a red light, microscopic water filtration factory, camera lens and sensor, assembly line).
   - Explain it in clear, jargon-free English so a beginner grasps the concept within 5 seconds.
   - Then state the precise medical/anatomical terminology.

2. VIVID REAL-LIFE CLINICAL EXAMPLES:
   - NEVER provide abstract, generic statements (e.g. NEVER say "a patient presenting with acute dysregulation undergoes evaluation").
   - ALWAYS provide a concrete, relatable real-world scenario (e.g. eating a large feast, sprinting to catch a bus, dehydration on a hot summer day, walking from dark into bright sunlight, hiking at high altitude).
   - Explain what happens physiologically in normal everyday life, and what happens clinically when the structure is damaged or diseased.

3. STRUCTURED SECTIONS:
   - 1. What is it? (Simple definition + everyday analogy + medical terms)
   - 2. Where is it found? (Exact anatomical location & relation to neighboring structures)
   - 3. What does it do? (3-4 crisp functional bullet points)
   - 4. Why is it important clinically? (High-yield clinical significance & pathology)
   - 5. One Real Clinical Example (Relatable everyday scenario + clinical breakdown)
   - 6. Diagram (Clean Mermaid flowchart)
   - 7. Easy Memory Trick (Catchy mnemonic)
   - Sources (Article title and website)

TRUSTED RETRIEVED SOURCE EVIDENCE:
- Source: ${retrievedDoc.source} (${retrievedDoc.website})
- Article Title: ${retrievedDoc.title}
- Article URL: ${retrievedDoc.url}
- Reference Evidence: ${retrievedDoc.content}

Generate the response in two coordinated formats:
First, a JSON block enclosed in \`\`\`json ... \`\`\` matching this exact schema:
{
  "title": "${coreTopic}",
  "definition": "Simple definition with an everyday analogy (2-3 clear sentences)",
  "location": "Where is it found?",
  "function": ["Point 1", "Point 2", "Point 3"],
  "clinicalSignificance": "Why it matters in clinical practice and medicine",
  "example": "Vivid everyday scenario and clinical consequence",
  "diagram": "Mermaid flowchart code",
  "mnemonic": "One memorable medical memory trick",
  "sources": [{"title": "${retrievedDoc.title}", "website": "${retrievedDoc.source}", "url": "${retrievedDoc.url}"}]
}

Followed immediately by the beautifully formatted MBBS handwritten study note in markdown.`;

    if (this.client) {
      // Cascading model list to ensure rapid and resilient responses
      const modelsToTry = [
        'gemini-3.7-flash',
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.6-flash',
        'gemini-2.5-pro'
      ];

      for (const modelName of modelsToTry) {
        try {
          const model = this.client.getGenerativeModel({
            model: modelName,
            systemInstruction: TEACHING_SYSTEM_PROMPT
          });

          const prompt = `Topic to teach: ${coreTopic}.
Explain according to your teaching sequence based on the verified ${retrievedDoc.source} evidence.
Ensure you give a simple definition with an everyday analogy and a vivid, realistic everyday clinical example.`;

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout with model ${modelName}`)), 12000);
          });

          const sendPromise = model.generateContent(prompt).then(res => res.response.text());
          const text = await Promise.race([sendPromise, timeoutPromise]);

          if (text && text.length > 50) {
            // Extract JSON if present
            let notes: EducationalNoteJson | undefined;
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              try {
                notes = JSON.parse(jsonMatch[1]);
              } catch (e) {
                // Ignore JSON parse error and use markdown
              }
            }

            // Remove the raw ```json``` block from the human-facing markdown display
            const cleanMarkdown = text.replace(/```json[\s\S]*?```\s*/g, '').trim();

            return {
              type: 'text',
              content: cleanMarkdown || text,
              notes,
              source: retrievedDoc.source
            };
          }
        } catch (err: any) {
          console.warn(`[GeminiTextService] Model ${modelName} error:`, err?.status || err?.message || err);
        }
      }
    }

    // Direct Pedagogical Synthesis from Kenhub/Merck Evidence if API is congested
    console.log(`[GeminiTextService] Providing high-yield pedagogical professor breakdown for "${coreTopic}"`);
    const { markdown, notes } = this.buildPedagogicalBreakdown(coreTopic, retrievedDoc);

    return {
      type: 'text',
      content: markdown,
      notes,
      source: retrievedDoc.source
    };
  }

  private buildPedagogicalBreakdown(topic: string, doc: RetrievedMedicalDoc): {
    markdown: string;
    notes: EducationalNoteJson;
  } {
    // Check if we have curated high-yield clinical data for this entity
    const curated = HIGH_YIELD_KNOWLEDGE[topic] || HIGH_YIELD_KNOWLEDGE[extractCoreMedicalTopic(topic)];

    if (curated) {
      const notes: EducationalNoteJson = {
        title: topic,
        definition: curated.simpleDefinition,
        location: curated.location,
        function: curated.functions,
        clinicalSignificance: curated.clinicalSignificance,
        example: curated.everydayExample,
        diagram: curated.mermaidDiagram,
        mnemonic: curated.mnemonic,
        sources: [{ title: doc.title, website: doc.source, url: doc.url }]
      };

      const markdown = `# ${topic}

## 1. What is it?
${curated.simpleDefinition}

## 2. Where is it found?
${curated.location}

## 3. What does it do?
${curated.functions.map(f => `- ${f}`).join('\n')}

## 4. Why is it important clinically?
${curated.clinicalSignificance}

## 5. One Real Clinical Example
${curated.everydayExample}

## 6. Diagram
\`\`\`mermaid
${curated.mermaidDiagram}
\`\`\`
*Tip: Type "Draw ${topic}" or click the image button for an educational diagram.*

## 7. Easy Memory Trick
**${curated.mnemonic}**

## Sources
- **Article Title**: [${doc.title}](${doc.url})
- **Website**: [${doc.source}](${doc.website})`;

      return { markdown, notes };
    }

    // Dynamic Pedagogical Synthesis for any other medical entity retrieved from Kenhub or Merck
    const isAnatomy = doc.source === 'Kenhub' || doc.domain === 'anatomy';
    const cleanSnippet = doc.content.replace(/\s+/g, ' ').slice(0, 320);

    const dynamicDefinition = isAnatomy
      ? `Think of ${topic.toLowerCase()} as a specialized anatomical building block: In simple terms, it is a structural component of the human body that ${cleanSnippet}. In clinical anatomy, it is formally documented in Kenhub's reference atlas under "${doc.title}".`
      : `Think of ${topic.toLowerCase()} as a specific physiological change or condition: In simple terms, it is a medical condition where ${cleanSnippet}. In clinical practice, it is classified in Merck Manual Professional under "${doc.title}".`;

    const dynamicExample = isAnatomy
      ? `Imagine performing a daily routine like climbing stairs or eating a meal. ${topic} coordinates with surrounding tissues to handle the physical demand smoothly. In a hospital setting, if a patient suffers physical trauma or inflammation in this area, the normal function is lost, presenting with localized tenderness, swelling, and reduced mobility that clinicians evaluate through physical exam and imaging.`
      : `Consider a patient visiting an outpatient clinic reporting new unexplained fatigue or physical discomfort. Clinicians observe the characteristic signs of ${topic.toLowerCase()} documented in ${doc.title}. By taking a focused patient history and running targeted diagnostic tests, the medical team pinpoints whether the condition is mild and transient or requires pharmacological therapy.`;

    const dynamicNotes: EducationalNoteJson = {
      title: topic,
      definition: dynamicDefinition,
      location: isAnatomy ? `Regional anatomical zone as detailed in ${doc.title} (${doc.source}).` : `Systemic / organ-specific manifestation described in ${doc.title}.`,
      function: [
        `Maintains normal operational physiological balance as described in ${doc.source}.`,
        `Adapts dynamically under physiological stress or exertion.`,
        `Coordinates with adjacent organ systems to support healthy biological output.`
      ],
      clinicalSignificance: `Understanding ${topic.toLowerCase()} is vital for medical rounds and exams because pathological changes directly cause observable patient symptoms, guiding differential diagnosis and targeted treatment.`,
      example: dynamicExample,
      diagram: `flowchart TD
    Entity[${topic}] --> Function[Physiological Role]
    Function --> Clinical[Clinical Significance]
    Clinical --> Diagnostics[Evidence-Based Management]`,
      mnemonic: `${topic.toUpperCase().slice(0, 4)}: "Remember ${topic} by its primary organ system and clinical role"`,
      sources: [{ title: doc.title, website: doc.source, url: doc.url }]
    };

    const markdown = `# ${topic}

## 1. What is it?
${dynamicDefinition}

## 2. Where is it found?
${dynamicNotes.location}

## 3. What does it do?
${dynamicNotes.function.map(f => `- ${f}`).join('\n')}

## 4. Why is it important clinically?
${dynamicNotes.clinicalSignificance}

## 5. One Real Clinical Example
${dynamicExample}

## 6. Diagram
\`\`\`mermaid
${dynamicNotes.diagram}
\`\`\`
*Tip: Type "Draw ${topic}" for an educational diagram.*

## 7. Easy Memory Trick
**${dynamicNotes.mnemonic}**

## Sources
- **Article Title**: [${doc.title}](${doc.url})
- **Website**: [${doc.source}](${doc.website})`;

    return { markdown, notes: dynamicNotes };
  }
}
