export interface BibleVersion {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  /** helloao.org translation id — real text source when no API.Bible key */
  helloaoId: string;
  /** Display name of the actual text being served via helloao */
  fallbackName: string;
  /** API.Bible translation id (requires API key for licensed text) */
  apiBibleId?: string;
}

export const BIBLE_VERSIONS: BibleVersion[] = [
  {
    id: "NIV",
    name: "New International Version",
    abbreviation: "NIV",
    description: "Clear, accurate, and readable modern English.",
    helloaoId: "BSB",
    fallbackName: "Berean Standard Bible (NIV requires API key)",
    apiBibleId: "06125adad2d5898a-01",
  },
  {
    id: "NLT",
    name: "New Living Translation",
    abbreviation: "NLT",
    description: "Thought-for-thought translation in everyday language.",
    helloaoId: "eng_fbv",
    fallbackName: "Free Bible Version (NLT requires API key)",
    apiBibleId: "06125adad2d5898a-02",
  },
  {
    id: "ERV",
    name: "Easy-to-Read Version",
    abbreviation: "ERV",
    description: "Simple vocabulary for new readers and ESL learners.",
    helloaoId: "eng_bbe",
    fallbackName: "Bible in Basic English (ERV requires API key)",
    apiBibleId: "06125adad2d5898a-03",
  },
  {
    id: "CJB",
    name: "Complete Jewish Bible",
    abbreviation: "CJB",
    description: "Jewish perspective with restored Hebrew names and context.",
    helloaoId: "eng_jps",
    fallbackName: "JPS TaNaKH 1917 (CJB requires API key)",
    apiBibleId: "06125adad2d5898a-04",
  },
  {
    id: "AMP",
    name: "Amplified Bible",
    abbreviation: "AMP",
    description: "Expanded word meanings for deeper study.",
    helloaoId: "eng_asv",
    fallbackName: "American Standard Version (AMP requires API key)",
    apiBibleId: "06125adad2d5898a-05",
  },
  {
    id: "CEB",
    name: "Common English Bible",
    abbreviation: "CEB",
    description: "Contemporary English for church and personal reading.",
    helloaoId: "eng_net",
    fallbackName: "NET Bible (CEB requires API key)",
    apiBibleId: "06125adad2d5898a-06",
  },
];

export const DEFAULT_VERSION = "NIV";

export function getVersion(id: string): BibleVersion | undefined {
  return BIBLE_VERSIONS.find((v) => v.id === id);
}
