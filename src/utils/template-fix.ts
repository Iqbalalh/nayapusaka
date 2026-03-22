/**
 * Template Fix Utility
 * 
 * This utility fixes Word document templates that have split XML runs,
 * which causes docxtemplater to fail at recognizing placeholder tags.
 * 
 * The problem: When users edit templates in Microsoft Word, the application
 * often splits placeholder text like {name} across multiple XML text runs:
 * 
 *   <w:r>
 *     <w:t>{</w:t>
 *   </w:r>
 *   <w:r>
 *     <w:t>name</w:t>
 *   </w:r>
 *   <w:r>
 *     <w:t>}</w:t>
 *   </w:r>
 * 
 * This utility merges these split runs back together so docxtemplater can
 * properly recognize the placeholder tags.
 */

import PizZip from "pizzip";

// Pattern to match docxtemplater placeholder tags
const PLACEHOLDER_PATTERN = /\{[^{}]+\}/g;

// Pattern to find potential split placeholders in text
const SPLIT_PLACEHOLDER_PATTERN = /(\{[^{}]*|[a-zA-Z_][a-zA-Z0-9_]*[^{}]*\})/g;

/**
 * Result of the template fix operation
 */
export interface TemplateFixResult {
  success: boolean;
  originalBuffer: Buffer;
  fixedBuffer: Buffer;
  wasFixed: boolean;
  fixedPlaceholders: string[];
  issues: string[];
}

/**
 * Check if a document has split placeholder issues
 */
export function hasSplitPlaceholderIssues(xmlContent: string): boolean {
  // Look for text content that looks like split placeholders
  // but aren't complete placeholders
  const allText = xmlContent.replace(/<[^>]+>/g, "");
  
  // Find all complete placeholders in the raw text
  const completePlaceholders = allText.match(PLACEHOLDER_PATTERN) || [];
  
  // Look for orphaned braces that suggest split placeholders
  const orphanedOpenBraces = allText.match(/\{(?![^{}]*\})/g) || [];
  const orphanedCloseBraces = allText.match(/(?<!\{[^{}]*)\}/g) || [];
  
  // If we have orphaned braces, there might be split issues
  if (orphanedOpenBraces.length > 0 || orphanedCloseBraces.length > 0) {
    return true;
  }
  
  // Check for text runs that contain partial placeholders
  const textRuns = xmlContent.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || [];
  for (const run of textRuns) {
    const text = run.replace(/<[^>]+>/g, "");
    // Check if this run contains a partial placeholder pattern
    if (text === "{" || text === "}" || /^\{[a-zA-Z_]*$/.test(text) || /^[a-zA-Z_0-9]*\}$/.test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract all text from XML content
 */
function extractAllText(xmlContent: string): string {
  return xmlContent.replace(/<[^>]+>/g, "");
}

/**
 * Find all complete placeholders in text
 */
function findPlaceholders(text: string): string[] {
  const matches = text.match(PLACEHOLDER_PATTERN) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Merge adjacent text runs within a paragraph
 * This is the core fix function that combines split runs
 */
function mergeTextRunsInParagraph(paragraphXml: string): { xml: string; fixedCount: number } {
  let fixedCount = 0;
  
  // Pattern to match a text run
  const runPattern = /<w:r(?:[^>]*?)>(.*?)<\/w:r>/gs;
  const textPattern = /<w:t(?:[^>]*?)>([^<]*)<\/w:t>/g;
  
  // Find all runs in the paragraph
  const runs: Array<{
    fullMatch: string;
    content: string;
    textContent: string;
    startIndex: number;
    endIndex: number;
  }> = [];
  
  let match;
  while ((match = runPattern.exec(paragraphXml)) !== null) {
    const fullMatch = match[0];
    const content = match[1];
    
    // Extract text content from the run
    let textContent = "";
    let textMatch;
    const textPatternLocal = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    while ((textMatch = textPatternLocal.exec(content)) !== null) {
      textContent += textMatch[1];
    }
    
    runs.push({
      fullMatch,
      content,
      textContent,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    });
  }
  
  // If no runs or only one run, nothing to merge
  if (runs.length <= 1) {
    return { xml: paragraphXml, fixedCount: 0 };
  }
  
  // Look for sequences of runs that should be merged
  // We merge runs that appear to be part of a split placeholder
  let result = paragraphXml;
  let offset = 0;
  
  for (let i = 0; i < runs.length - 1; i++) {
    const currentRun = runs[i];
    const nextRun = runs[i + 1];
    
    // Check if these runs should be merged
    const combinedText = currentRun.textContent + nextRun.textContent;
    const shouldMerge = shouldMergeRuns(currentRun.textContent, nextRun.textContent, combinedText);
    
    if (shouldMerge) {
      // Merge the runs
      const mergedRun = createMergedRun(currentRun.fullMatch, nextRun.textContent);
      
      // Calculate positions in the current result string
      const startInResult = currentRun.startIndex + offset;
      const endInResult = nextRun.endIndex + offset;
      
      // Replace both runs with the merged run
      result = result.substring(0, startInResult) + mergedRun + result.substring(endInResult);
      
      // Update offset for subsequent replacements
      const originalLength = nextRun.endIndex - currentRun.startIndex;
      offset += mergedRun.length - originalLength;
      
      fixedCount++;
      
      // Skip the next run since we've merged it
      i++;
    }
  }
  
  return { xml: result, fixedCount };
}

/**
 * Determine if two adjacent runs should be merged
 */
function shouldMergeRuns(text1: string, text2: string, combined: string): boolean {
  // Check if combining them creates a complete placeholder
  if (PLACEHOLDER_PATTERN.test(combined)) {
    // Check if either individual text doesn't already contain a complete placeholder
    if (!PLACEHOLDER_PATTERN.test(text1) && !PLACEHOLDER_PATTERN.test(text2)) {
      return true;
    }
  }
  
  // Check for partial placeholder patterns
  // Pattern: { followed by identifier characters
  if (/^\{[a-zA-Z_]*$/.test(text1) && /^[a-zA-Z_0-9]*\}$/.test(text2)) {
    return true;
  }
  
  // Pattern: { at end of first run
  if (text1.endsWith("{") && /^[a-zA-Z_]/.test(text2)) {
    return true;
  }
  
  // Pattern: } at start of second run
  if (text1.length > 0 && text2.startsWith("}")) {
    return true;
  }
  
  // Pattern: partial identifier between braces
  if (/^\{[a-zA-Z_][a-zA-Z_0-9]*$/.test(text1) && /^[a-zA-Z_0-9]*\}$/.test(text2)) {
    return true;
  }
  
  return false;
}

/**
 * Create a merged run from two runs
 */
function createMergedRun(firstRunXml: string, secondTextContent: string): string {
  // Extract the run properties from the first run
  const propsMatch = firstRunXml.match(/<w:rPr[^>]*>.*?<\/w:rPr>/s);
  const runProps = propsMatch ? propsMatch[0] : "";
  
  // Extract existing text content from first run
  const textMatch = firstRunXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
  const firstTextContent = textMatch ? textMatch[1] : "";
  
  // Check if the first run had the xml:space attribute
  const spaceAttr = firstRunXml.includes('xml:space="preserve"') ? ' xml:space="preserve"' : "";
  
  // Create merged text
  const mergedText = firstTextContent + secondTextContent;
  
  // Build the new run
  if (runProps) {
    return `<w:r>${runProps}<w:t${spaceAttr}>${mergedText}</w:t></w:r>`;
  } else {
    return `<w:r><w:t${spaceAttr}>${mergedText}</w:t></w:r>`;
  }
}

/**
 * Fix split placeholders in a document.xml file
 */
function fixDocumentXml(xmlContent: string): { xml: string; fixedCount: number } {
  let totalFixedCount = 0;
  let result = xmlContent;
  
  // Process each paragraph
  const paragraphPattern = /<w:p[^>]*>.*?<\/w:p>/gs;
  let match;
  const paragraphs: Array<{ fullMatch: string; index: number }> = [];
  
  while ((match = paragraphPattern.exec(xmlContent)) !== null) {
    paragraphs.push({
      fullMatch: match[0],
      index: match.index,
    });
  }
  
  // Fix each paragraph
  let offset = 0;
  for (const para of paragraphs) {
    const { xml: fixedPara, fixedCount } = mergeTextRunsInParagraph(para.fullMatch);
    
    if (fixedCount > 0) {
      const startInResult = para.index + offset;
      const endInResult = startInResult + para.fullMatch.length;
      
      result = result.substring(0, startInResult) + fixedPara + result.substring(endInResult);
      offset += fixedPara.length - para.fullMatch.length;
      totalFixedCount += fixedCount;
    }
  }
  
  return { xml: result, fixedCount: totalFixedCount };
}

/**
 * Main function to fix a template buffer
 * Takes a .docx file buffer and returns a fixed buffer
 */
export async function fixTemplate(templateBuffer: Buffer): Promise<TemplateFixResult> {
  const issues: string[] = [];
  const fixedPlaceholders: string[] = [];
  
  try {
    // Load the docx file
    const zip = new PizZip(templateBuffer);
    
    // Get the main document XML
    const documentXml = zip.file("word/document.xml");
    if (!documentXml) {
      return {
        success: false,
        originalBuffer: templateBuffer,
        fixedBuffer: templateBuffer,
        wasFixed: false,
        fixedPlaceholders: [],
        issues: ["Invalid .docx file: missing word/document.xml"],
      };
    }
    
    const originalXml = documentXml.asText() || "";
    
    // Check if there are split placeholder issues
    if (!hasSplitPlaceholderIssues(originalXml)) {
      return {
        success: true,
        originalBuffer: templateBuffer,
        fixedBuffer: templateBuffer,
        wasFixed: false,
        fixedPlaceholders: [],
        issues: ["No split placeholder issues detected"],
      };
    }
    
    issues.push("Split placeholder issues detected, attempting to fix...");
    
    // Fix the document XML
    const { xml: fixedXml, fixedCount } = fixDocumentXml(originalXml);
    
    if (fixedCount === 0) {
      return {
        success: true,
        originalBuffer: templateBuffer,
        fixedBuffer: templateBuffer,
        wasFixed: false,
        fixedPlaceholders: [],
        issues: ["Issues detected but no fixes were applied"],
      };
    }
    
    // Update the zip file with the fixed XML
    zip.file("word/document.xml", fixedXml);
    
    // Generate the fixed buffer
    const fixedBuffer = zip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
    
    // Find placeholders in the fixed document
    const fixedPlaceholdersList = findPlaceholders(extractAllText(fixedXml));
    
    issues.push(`Fixed ${fixedCount} split text run(s)`);
    
    return {
      success: true,
      originalBuffer: templateBuffer,
      fixedBuffer,
      wasFixed: true,
      fixedPlaceholders: fixedPlaceholdersList,
      issues,
    };
  } catch (error) {
    return {
      success: false,
      originalBuffer: templateBuffer,
      fixedBuffer: templateBuffer,
      wasFixed: false,
      fixedPlaceholders: [],
      issues: [`Error fixing template: ${error instanceof Error ? error.message : "Unknown error"}`],
    };
  }
}

/**
 * Check if a template needs fixing
 */
export async function templateNeedsFixing(templateBuffer: Buffer): Promise<boolean> {
  try {
    const zip = new PizZip(templateBuffer);
    const documentXml = zip.file("word/document.xml");
    
    if (!documentXml) {
      return false;
    }
    
    const xmlContent = documentXml.asText() || "";
    return hasSplitPlaceholderIssues(xmlContent);
  } catch {
    return false;
  }
}

export default {
  fixTemplate,
  templateNeedsFixing,
  hasSplitPlaceholderIssues,
};
