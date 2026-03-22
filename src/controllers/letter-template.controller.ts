import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import {
  selectAllLetterTemplates,
  selectLetterTemplateById,
  selectLetterTemplateByType,
  selectLetterTemplateCount,
  insertLetterTemplate,
  updateLetterTemplateById,
  deactivateLetterTemplateById,
  deleteLetterTemplateById,
  templateExistsForType,
} from "../services/letter-template.services";
import { uploadToS3, deleteFromS3, getPresignedUrl } from "../utils/storage/s3.storage";
import { LetterType, Prisma } from "../generated/prisma/client";
import { fixTemplate, templateNeedsFixing, TemplateFixResult } from "../utils/template-fix";

// ============================================================================
// GET ALL LETTER TEMPLATES
// ============================================================================
export const getAllLetterTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, isActive } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const isActiveFilter =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    const [templates, total] = await Promise.all([
      selectAllLetterTemplates(skip, limitNum, isActiveFilter),
      selectLetterTemplateCount(isActiveFilter),
    ]);

    // Add presigned URLs for each template
    const templatesWithUrls = await Promise.all(
      templates.map(async (template) => ({
        ...template,
        downloadUrl: await getPresignedUrl(template.s3Path),
      }))
    );

    res.json({
      data: templatesWithUrls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// GET LETTER TEMPLATE BY ID
// ============================================================================
export const getLetterTemplateById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    const template = await selectLetterTemplateById(templateId);

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Add presigned URL for download
    const downloadUrl = await getPresignedUrl(template.s3Path);

    res.json({
      data: {
        ...template,
        downloadUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// GET LETTER TEMPLATE BY LETTER TYPE (for docxtemplater integration)
// ============================================================================
export const getLetterTemplateByType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { letterType } = req.params;

    // Validate letter type
    if (!Object.values(LetterType).includes(letterType as LetterType)) {
      return res.status(400).json({ error: "Invalid letter type" });
    }

    const template = await selectLetterTemplateByType(letterType as LetterType);

    if (!template) {
      return res.status(404).json({ error: "No active template found for this letter type" });
    }

    // Get presigned URL for template download
    const downloadUrl = await getPresignedUrl(template.s3Path);

    res.json({
      data: {
        ...template,
        downloadUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// DOWNLOAD TEMPLATE FILE
// ============================================================================
export const downloadTemplateFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    const template = await selectLetterTemplateById(templateId);

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const downloadUrl = await getPresignedUrl(template.s3Path);

    if (!downloadUrl) {
      return res.status(404).json({ error: "Template file not found" });
    }

    res.json({ downloadUrl });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// CREATE LETTER TEMPLATE (with file upload)
// ============================================================================
export const createLetterTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { letterType, templateName, variables } = req.body;
    const file = req.file;
    const user = req.user as { id: number; username: string; role: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate required fields
    if (!letterType || !templateName) {
      return res.status(400).json({
        error: "Letter type and template name are required",
      });
    }

    // Validate letter type
    if (!Object.values(LetterType).includes(letterType as LetterType)) {
      return res.status(400).json({ error: "Invalid letter type" });
    }

    // Check if file is provided
    if (!file) {
      return res.status(400).json({ error: "Template file is required" });
    }

    // Check if template already exists for this letter type
    const exists = await templateExistsForType(letterType as LetterType);
    if (exists) {
      return res.status(409).json({
        error: "An active template already exists for this letter type. Please deactivate it first or update the existing template.",
      });
    }

    // Parse variables if provided
    let parsedVariables: Prisma.InputJsonValue | undefined;
    if (variables) {
      try {
        const parsed = typeof variables === "string" ? JSON.parse(variables) : variables;
        parsedVariables = parsed as Prisma.InputJsonValue;
      } catch {
        return res.status(400).json({ error: "Invalid variables JSON format" });
      }
    }

    // Upload file to S3
    const s3Path = await uploadToS3(
      file,
      `template-${Date.now()}`,
      templateName,
      "letter-templates"
    );

    if (!s3Path) {
      return res.status(500).json({ error: "Failed to upload template file" });
    }

    // Create template record
    const template = await insertLetterTemplate({
      letterType: letterType as LetterType,
      templateName,
      s3Path,
      version: 1,
      isActive: true,
      variables: parsedVariables,
      createdBy: user.id,
    });

    res.status(201).json({
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// UPDATE LETTER TEMPLATE
// ============================================================================
export const updateLetterTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { templateName, variables, isActive } = req.body;
    const file = req.file;
    const user = req.user as { id: number; username: string; role: string } | undefined;
    const templateId = parseInt(id);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (isNaN(templateId)) {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    // Check if template exists
    const existingTemplate = await selectLetterTemplateById(templateId);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Parse variables if provided
    let parsedVariables: Prisma.InputJsonValue | undefined;
    if (variables) {
      try {
        const parsed = typeof variables === "string" ? JSON.parse(variables) : variables;
        parsedVariables = parsed as Prisma.InputJsonValue;
      } catch {
        return res.status(400).json({ error: "Invalid variables JSON format" });
      }
    }

    // Prepare update data
    const updateData: Prisma.LetterTemplateUncheckedUpdateInput = {
      editedBy: user.id,
    };

    if (templateName) updateData.templateName = templateName;
    if (parsedVariables) updateData.variables = parsedVariables;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle file upload (new template file)
    if (file) {
      // Delete old file from S3
      await deleteFromS3(existingTemplate.s3Path);

      // Upload new file
      const newS3Path = await uploadToS3(
        file,
        `template-${templateId}`,
        templateName || existingTemplate.templateName,
        "letter-templates"
      );

      if (newS3Path) {
        updateData.s3Path = newS3Path;
        updateData.version = existingTemplate.version + 1;
      }
    }

    // Update template
    const updatedTemplate = await updateLetterTemplateById(templateId, updateData);

    res.json({
      message: "Template updated successfully",
      data: updatedTemplate,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// DEACTIVATE LETTER TEMPLATE (soft delete)
// ============================================================================
export const deactivateLetterTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user as { id: number; username: string; role: string } | undefined;
    const templateId = parseInt(id);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (isNaN(templateId)) {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    // Check if template exists
    const existingTemplate = await selectLetterTemplateById(templateId);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    await deactivateLetterTemplateById(templateId, user.id);

    res.json({ message: "Template deactivated successfully" });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// DELETE LETTER TEMPLATE (hard delete)
// ============================================================================
export const deleteLetterTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    // Check if template exists
    const existingTemplate = await selectLetterTemplateById(templateId);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Check if template is being used by letters
    if (existingTemplate._count && existingTemplate._count.letters > 0) {
      return res.status(409).json({
        error: "Cannot delete template that is being used by letters. Deactivate it instead.",
      });
    }

    // Delete file from S3
    await deleteFromS3(existingTemplate.s3Path);

    // Delete template from database
    await deleteLetterTemplateById(templateId);

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EXTRACT TEMPLATE VARIABLES (helper for docxtemplater)
// This endpoint requires docxtemplater and pizzip packages
// ============================================================================
export const extractTemplateVariables = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Template file is required" });
    }

    // Dynamic import for docxtemplater and pizzip
    // These packages need to be installed: npm install docxtemplater pizzip
    const PizZip = await import("pizzip").then((m) => m.default);
    const Docxtemplater = await import("docxtemplater").then((m) => m.default);

    // Read the docx file and extract variables
    const zip = new PizZip(file.buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Use getTags() to properly extract all template tags
    // This handles XML run splitting that getFullText() cannot handle
    // When Word splits text like "{name}" across multiple XML runs,
    // getFullText() may return "{name" or "name}" or even "na me"
    // getTags() parses the XML structure directly and finds all tags correctly
    // Note: getTags() is available at runtime but not in TypeScript definitions
    const tags = (doc as any).getTags();
    
    // Debug logging to help diagnose tag extraction issues
    console.log("[extractTemplateVariables] Raw getTags() result:", JSON.stringify(tags, null, 2));
    
    // getTags() returns a nested structure:
    // { headers: [], footers: [], document: { target: "...", tags: { tagName: {} } } }
    // Each header/footer in the arrays can also contain tags
    // We need to extract tag names from all possible locations
    
    const allTags: Set<string> = new Set();
    
    // Extract tags from document body
    const documentTags = tags.document?.tags || {};
    Object.keys(documentTags).forEach(tag => allTags.add(tag));
    
    // Extract tags from headers (headers is an array of sections)
    if (Array.isArray(tags.headers)) {
      tags.headers.forEach((header: any) => {
        if (header?.tags) {
          Object.keys(header.tags).forEach((tag: string) => allTags.add(tag));
        }
      });
    }
    
    // Extract tags from footers (footers is an array of sections)
    if (Array.isArray(tags.footers)) {
      tags.footers.forEach((footer: any) => {
        if (footer?.tags) {
          Object.keys(footer.tags).forEach((tag: string) => allTags.add(tag));
        }
      });
    }
    
    const variables = Array.from(allTags);
    
    console.log("[extractTemplateVariables] Extracted variables:", variables);
    console.log("[extractTemplateVariables] Total count:", variables.length);

    res.json({
      data: {
        variables,
        count: variables.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// VALIDATE TEMPLATE FILE (detects broken/split variables)
// This endpoint provides detailed diagnostics about template health
// ============================================================================
export const validateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Template file is required" });
    }

    // Dynamic import for docxtemplater and pizzip
    const PizZip = await import("pizzip").then((m) => m.default);
    const Docxtemplater = await import("docxtemplater").then((m) => m.default);

    // Read the docx file
    const zip = new PizZip(file.buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Extract variables using getTags()
    const tags = (doc as any).getTags();
    
    // Collect all recognized variables
    const recognizedVariables: Set<string> = new Set();
    
    // Extract tags from document body
    const documentTags = tags.document?.tags || {};
    Object.keys(documentTags).forEach(tag => recognizedVariables.add(tag));
    
    // Extract tags from headers
    if (Array.isArray(tags.headers)) {
      tags.headers.forEach((header: any) => {
        if (header?.tags) {
          Object.keys(header.tags).forEach((tag: string) => recognizedVariables.add(tag));
        }
      });
    }
    
    // Extract tags from footers
    if (Array.isArray(tags.footers)) {
      tags.footers.forEach((footer: any) => {
        if (footer?.tags) {
          Object.keys(footer.tags).forEach((tag: string) => recognizedVariables.add(tag));
        }
      });
    }

    // Get full text to detect potential broken variables
    const fullText = doc.getFullText();
    
    // Find potential broken variables in the text
    // These are text fragments that look like partial template tags
    const brokenPatterns: string[] = [];
    
    // Pattern 1: Opening brace without closing (e.g., "{name" or "{ name")
    const openOnlyMatches = fullText.match(/\{[^}]*$/g);
    if (openOnlyMatches) {
      brokenPatterns.push(...openOnlyMatches);
    }
    
    // Pattern 2: Closing brace without opening (e.g., "name}" or "name }")
    const closeOnlyMatches = fullText.match(/^[^{]*\}/g);
    if (closeOnlyMatches) {
      brokenPatterns.push(...closeOnlyMatches);
    }
    
    // Pattern 3: Variables with spaces inside (e.g., "{ name }" or "{na me}")
    const spacedMatches = fullText.match(/\{[^}]*\s+[^}]*\}/g);
    if (spacedMatches) {
      brokenPatterns.push(...spacedMatches);
    }

    // Also check the raw XML for split tags
    // This is more reliable for detecting XML run splitting issues
    const xmlContent = zip.files["word/document.xml"];
    let splitTagIssues: string[] = [];
    
    if (xmlContent) {
      const docXml = xmlContent.asText();
      
      // Look for patterns like: <w:t>{</w:t>...<w:t>name</w:t>...<w:t>}</w:t>
      // This indicates the tag is split across multiple text runs
      
      // Find all text content within <w:t> tags
      const textRuns = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      
      // Check for partial tags in individual runs
      textRuns.forEach((run: string) => {
        const content = run.replace(/<[^>]*>/g, "");
        
        // Check for opening brace only
        if (/^\s*\{\s*$/.test(content)) {
          splitTagIssues.push(`Found isolated "{" in XML run - tag is likely split`);
        }
        
        // Check for closing brace only
        if (/^\s*\}\s*$/.test(content)) {
          splitTagIssues.push(`Found isolated "}" in XML run - tag is likely split`);
        }
        
        // Check for partial variable patterns
        if (/^\s*\{[^}]*$/.test(content) && content.trim() !== "{") {
          splitTagIssues.push(`Found incomplete tag "${content.trim()}" - tag is split across runs`);
        }
        if (/^[^{]*\}\s*$/.test(content) && content.trim() !== "}") {
          splitTagIssues.push(`Found incomplete tag "${content.trim()}" - tag is split across runs`);
        }
      });
    }

    // Determine overall validation status
    const isValid = recognizedVariables.size > 0 && brokenPatterns.length === 0 && splitTagIssues.length === 0;
    
    // Prepare response
    const validationResult = {
      isValid,
      variables: Array.from(recognizedVariables),
      variableCount: recognizedVariables.size,
      issues: {
        brokenPatterns: [...new Set(brokenPatterns)], // Remove duplicates
        splitTagIssues: [...new Set(splitTagIssues)],
      },
      recommendations: [] as string[],
    };

    // Add recommendations based on issues found
    if (recognizedVariables.size === 0) {
      validationResult.recommendations.push(
        "No template variables detected. Make sure your template uses the correct syntax: {variableName}"
      );
    }
    
    if (brokenPatterns.length > 0 || splitTagIssues.length > 0) {
      validationResult.recommendations.push(
        "Template variables appear to be broken or split. This usually happens when:",
        "1. Variables were copy-pasted from another source",
        "2. The document was edited and saved by Word, which splits the XML",
        "",
        "To fix this issue:",
        "• Open the template in Microsoft Word",
        "• DELETE the existing variable text completely",
        "• TYPE the variable manually (e.g., {name}) - do NOT copy-paste",
        "• Save the document",
        "• Upload the fixed template again"
      );
    }

    // Debug logging
    console.log("[validateTemplate] Validation result:", JSON.stringify(validationResult, null, 2));

    res.json({
      data: validationResult,
    });
  } catch (error) {
    console.error("[validateTemplate] Error:", error);
    next(error);
  }
};

// ============================================================================
// FIX TEMPLATE FILE (auto-merge split XML runs)
// This endpoint fixes templates with split placeholder issues
// ============================================================================
export const fixTemplateController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Template file is required" });
    }

    console.log("[fixTemplate] Processing template file:", file.originalname);

    // Apply the fix to the template
    const result = await fixTemplate(file.buffer);

    if (!result.success) {
      return res.status(400).json({
        error: "Failed to fix template",
        issues: result.issues,
      });
    }

    if (!result.wasFixed) {
      // Template didn't need fixing
      return res.json({
        data: {
          wasFixed: false,
          message: "Template does not need fixing - no split placeholder issues detected",
          issues: result.issues,
        },
      });
    }

    // Template was fixed - return the fixed file
    console.log("[fixTemplate] Template fixed successfully:", {
      fixedPlaceholders: result.fixedPlaceholders,
      issues: result.issues,
    });

    // Return the fixed file as a download
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="fixed-${file.originalname}"`);
    res.send(result.fixedBuffer);
  } catch (error) {
    console.error("[fixTemplate] Error:", error);
    next(error);
  }
};

// ============================================================================
// CHECK IF TEMPLATE NEEDS FIXING
// ============================================================================
export const checkTemplateNeedsFixing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Template file is required" });
    }

    const needsFixing = await templateNeedsFixing(file.buffer);

    res.json({
      data: {
        needsFixing,
        message: needsFixing
          ? "Template has split placeholder issues and should be fixed"
          : "Template appears to be in good condition",
      },
    });
  } catch (error) {
    next(error);
  }
};
