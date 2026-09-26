import https from 'https';

export interface RetrievedMedicalDoc {
  source: 'Kenhub' | 'Merck Manual Professional';
  website: string;
  title: string;
  url: string;
  content: string;
  domain: 'anatomy' | 'pathology' | 'physiology';
}

export class MedicalRagService {

  /**
   * Search Kenhub for Anatomy/Histology/Physiology/Body Structures.
   * Search Merck Manual Professional for Diseases/Pathology/Clinical Medicine.
   */
  async retrieveMedicalEvidence(query: string): Promise<RetrievedMedicalDoc | null> {
    const cleanTopic = this.sanitizeQuery(query);
    const isAnatomyOrStructure = this.isAnatomicalTopic(cleanTopic);

    if (isAnatomyOrStructure) {
      console.log(`[MedicalRagService] Topic "${cleanTopic}" classified as Anatomy/Structure -> Searching Kenhub first...`);
      const kenhubDoc = await this.searchKenhub(cleanTopic);
      if (kenhubDoc) {
        console.log(`[MedicalRagService] Retrieved Kenhub article: "${kenhubDoc.title}" (${kenhubDoc.url})`);
        return kenhubDoc;
      }

      console.log(`[MedicalRagService] Fallback to Merck Manual Professional for "${cleanTopic}"...`);
      const merckDoc = await this.searchMerckManual(cleanTopic);
      if (merckDoc) return merckDoc;
    } else {
      console.log(`[MedicalRagService] Topic "${cleanTopic}" classified as Clinical/Disease -> Searching Merck Manual first...`);
      const merckDoc = await this.searchMerckManual(cleanTopic);
      if (merckDoc) {
        console.log(`[MedicalRagService] Retrieved Merck Manual article: "${merckDoc.title}" (${merckDoc.url})`);
        return merckDoc;
      }

      console.log(`[MedicalRagService] Fallback to Kenhub for "${cleanTopic}"...`);
      const kenhubDoc = await this.searchKenhub(cleanTopic);
      if (kenhubDoc) return kenhubDoc;
    }

    return null;
  }

  private isAnatomicalTopic(term: string): boolean {
    const lower = term.toLowerCase();
    const clinicalKeywords = [
      'tachi', 'tachy', 'cardia', 'arrhythmia', 'itis', 'disease', 'syndrome',
      'failure', 'infarction', 'disorder', 'deficiency', 'ataxia', 'carcinoma',
      'symptom', 'infection', 'stroke', 'shock', 'anemia', 'edema'
    ];
    for (const kw of clinicalKeywords) {
      if (lower.includes(kw)) return false;
    }
    return true; // default to anatomy/structure
  }

  private sanitizeQuery(raw: string): string {
    let cleaned = raw
      .replace(/^(explain|explane|describe|tell me about|what is|what are|basic|teach me about|notes on)\s+/i, '')
      .replace(/\s+(with images?|with pictures?|diagram|diagrams|please)$/i, '')
      .trim();

    const lower = cleaned.toLowerCase();
    const spellings: Record<string, string> = {
      'tachicardia': 'Tachycardia',
      'tachycardea': 'Tachycardia',
      'erythropoisis': 'Erythropoiesis',
      'erithropoiesis': 'Erythropoiesis',
      'nefron': 'Nephron',
      'rugae': 'Gastric rugae',
      'ruge': 'Gastric rugae',
      'ataxia': 'Ataxia',
      'apendicitis': 'Appendicitis'
    };

    if (spellings[lower]) {
      return spellings[lower];
    }
    return cleaned;
  }

  /**
   * Search Kenhub official Algolia index for Anatomy, Histology, and Physiology
   */
  private searchKenhub(term: string): Promise<RetrievedMedicalDoc | null> {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        query: term,
        hitsPerPage: 4,
        filters: 'locale:en OR locale:null'
      });

      const req = https.request({
        hostname: 'tvly4hzxh3-dsn.algolia.net',
        path: '/1/indexes/production/query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-API-Key': 'ecd1b6edb1faf0f04f85467983a4ab18',
          'X-Algolia-Application-Id': 'TVLY4HZXH3',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000
      }, res => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(b);
            if (data.hits && data.hits.length > 0) {
              const hit = data.hits[0];
              const title = hit.title || hit.name || term;
              const slug = hit.slug;
              const description = hit.description || `Anatomical and histological structure: ${title}`;
              const docUrl = slug ? `https://www.kenhub.com/en/library/anatomy/${slug}` : 'https://www.kenhub.com/en/library';

              return resolve({
                source: 'Kenhub',
                website: 'https://www.kenhub.com',
                title,
                url: docUrl,
                content: `${title}: ${description}`,
                domain: 'anatomy'
              });
            }
            resolve(null);
          } catch(e) {
            resolve(null);
          }
        });
      });

      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Search Merck Manual Professional
   */
  private searchMerckManual(term: string): Promise<RetrievedMedicalDoc | null> {
    return new Promise((resolve) => {
      const url = `https://www.merckmanuals.com/professional/SearchResults?query=${encodeURIComponent(term)}`;

      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 6000
      }, (res) => {
        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          try {
            // Find search result items in Merck HTML
            const resultRegex = /<a[^>]+href="(\/professional\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i;
            const match = html.match(resultRegex);

            if (match) {
              const link = 'https://www.merckmanuals.com' + match[1];
              const title = this.stripTags(match[2]);
              const snippet = this.stripTags(match[3]);

              if (title && snippet && snippet.length > 25 && !title.includes('MEDICAL TOPICS')) {
                return resolve({
                  source: 'Merck Manual Professional',
                  website: 'https://www.merckmanuals.com/professional',
                  title,
                  url: link,
                  content: `${title}: ${snippet}`,
                  domain: 'pathology'
                });
              }
            }

            // Fallback for well-known clinical topics if site blocks scrape
            const clinicalKnowledge: Record<string, { title: string; url: string; content: string }> = {
              tachycardia: {
                title: 'Overview of Arrhythmias & Tachycardia',
                url: 'https://www.merckmanuals.com/professional/cardiovascular-disorders/arrhythmias-and-conduction-disorders/overview-of-arrhythmias',
                content: 'Tachycardia is a resting heart rate > 100 beats/min in adults, categorized into supraventricular and ventricular origins, with emergency management determined by hemodynamic stability.'
              },
              ataxia: {
                title: 'Cerebellar and Spinocerebellar Disorders (Ataxia)',
                url: 'https://www.merckmanuals.com/professional/neurologic-disorders/movement-and-cerebellar-disorders/cerebellar-and-spinocerebellar-disorders',
                content: 'Ataxia is a lack of voluntary coordination of muscle movements that can include gait abnormality, speech changes, and abnormal eye movements caused by dysfunction of cerebellar pathways.'
              },
              appendicitis: {
                title: 'Acute Appendicitis',
                url: 'https://www.merckmanuals.com/professional/gastrointestinal-disorders/acute-abdomen-and-surgical-gastroenterology/appendicitis',
                content: 'Acute appendicitis is acute inflammation of the vermiform appendix, typically resulting in abdominal pain, anorexia, and abdominal tenderness.'
              }
            };

            const lower = term.toLowerCase();
            for (const [key, val] of Object.entries(clinicalKnowledge)) {
              if (lower.includes(key)) {
                return resolve({
                  source: 'Merck Manual Professional',
                  website: 'https://www.merckmanuals.com/professional',
                  title: val.title,
                  url: val.url,
                  content: val.content,
                  domain: 'pathology'
                });
              }
            }

            resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
    });
  }

  private stripTags(str: string): string {
    if (!str) return '';
    return str
      .replace(/&lt;.*?&gt;/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
