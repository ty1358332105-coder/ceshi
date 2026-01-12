import { GoogleGenAI } from "@google/genai";

// Shared CSS styles for the final output - High Fidelity - ULTRA COMPACT
// Optimized to prevent cropping even with heavy text expansion (CN -> EN)
const SHARED_CSS = `
@page { size: A4; margin: 0; }
body { margin: 0; padding: 0; background: #f0f0f0; font-family: 'Arial', 'Helvetica Neue', sans-serif; -webkit-print-color-adjust: exact; }

/* MAIN PAGE CONTAINER - A4 SINGLE PAGE */
.page-container {
    width: 210mm; 
    height: 297mm; /* Fixed height A4 */
    /* ULTRA COMPACT PADDING to maximize usable space */
    /* Top: 3mm, Bottom: 6mm (reserved for footer), Sides: 10mm */
    padding: 3mm 10mm 12mm 10mm; 
    margin: 40px auto; 
    background: white; 
    overflow: hidden; 
    position: relative;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
    box-sizing: border-box;
    /* Typography Base - Smaller default for safety */
    font-size: 9.5pt; 
    line-height: 1.25; 
    color: #333;
    page-break-after: always;
}

.page-container:last-child { margin-bottom: 40px; page-break-after: auto; }

@media print {
    body { background: white; }
    .page-container { 
        margin: 0; 
        box-shadow: none; 
        width: 210mm; 
        height: 297mm; 
        overflow: hidden;
        border: none;
    }
}

/* --- FLEXIBLE TYPOGRAPHY STRUCTURE (COMPACT) --- */

/* Top Level Header */
.main-title {
    font-weight: bold;
    margin-top: 0;
    margin-bottom: 6px; 
    line-height: 1.1;
    /* Defaults */
    font-size: 14pt; 
    color: #000;
}

/* Section Header */
.section-header {
    display: flex;
    align-items: baseline;
    border-bottom: 1px solid #ccc; 
    padding-bottom: 3px;
    margin-top: 10px; 
    margin-bottom: 6px; 
    /* Defaults */
    font-size: 12pt;
    font-weight: bold;
    color: #000;
}
.section-number {
    margin-right: 8px;
    font-size: 1.3em; 
}

/* --- WARNING / CAUTION BOXES --- */
.warning-box {
    background-color: #f9f9f9; 
    border: 1px solid #ddd;
    padding: 6px 8px; 
    margin-bottom: 8px; 
    border-radius: 4px;
    page-break-inside: avoid;
}

.warning-title {
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 3px;
    font-size: 10pt;
    color: #000;
}

.icon-triangle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-size: 12px;
}

/* --- LISTS & PARAGRAPHS --- */
ul { margin: 0; padding-left: 16px; }
li { margin-bottom: 2px; text-align: justify; } 
p { margin-bottom: 5px; text-align: justify; } 

/* --- IMAGES / FIGURES --- */
/* STRICT SIZE PRESERVATION */
.figure-box {
    width: 100%;
    /* Height is now primarily controlled by the AI via inline styles to match original */
    /* We provide a small fallback, but rely on AI for correct sizing */
    min-height: 10mm; 
    border: 1px dashed #ccc; 
    background-color: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0; /* Remove padding to allow image to fill exactly */
    box-sizing: border-box;
    margin: 8px 0; 
    cursor: pointer;
    transition: all 0.2s;
    page-break-inside: avoid;
    overflow: hidden; /* Ensure content stays within strict bounds */
}
.figure-box:hover { background-color: #f0f0f0; }
.figure-label { 
    font-weight: bold; 
    margin: 4px 0 2px 0; 
    font-size: 8.5pt; 
    pointer-events: none; /* Let click pass to box */
}
.figure-hint { 
    font-size: 7.5pt; 
    color: #999; 
    margin-bottom: 4px;
    pointer-events: none;
}

/* --- FOOTER --- */
.page-footer {
    position: absolute;
    bottom: 5mm; 
    left: 10mm;
    right: 10mm;
    display: flex;
    justify-content: center; 
    align-items: center;
    font-size: 9pt;
    color: #000;
    z-index: 50;
    height: 5mm;
}

.page-number-box {
    font-weight: bold;
    padding: 0 5px;
    display: inline-block;
}

/* UTILS */
.bold { font-weight: bold; }
`;

const SHARED_SCRIPT = `
<script>
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    let currentBox = null;

    document.body.addEventListener('click', (e) => {
      const box = e.target.closest('.figure-box');
      if (box) {
        currentBox = box;
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && currentBox) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result;
            // Clear content and add image
            currentBox.innerHTML = '';
            const img = document.createElement('img');
            img.src = base64Data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain'; 
            currentBox.appendChild(img);
            
            currentBox.style.border = 'none';
            currentBox.style.background = 'transparent';
        };
        reader.readAsDataURL(file);
      }
      fileInput.value = '';
    });
  });
})();
</script>
`;

// PROMPT: STRICT IMAGE SIZING & COMPACT LAYOUT
const BASE_SYSTEM_INSTRUCTION = `
# ROLE
You are the "Engineering Manual Reconstructor", an advanced AI specialized in converting Chinese HVAC engineering PDF pages into high-fidelity, A4-printable English HTML pages.
# CORE OBJECTIVE
Your goal is to produce **Raw HTML Code** that visually mirrors the original PDF layout.
# KEY DIRECTIVE: STRICT IMAGE FIDELITY
1. **NO NEW LAYOUTS:** Do not invent new arrangements for diagrams. If the original has a specific diagram (e.g., "Bottom View" stacked on "Side View"), represent it exactly as it is spatially.
2. **USE A SINGLE CONTAINER:** If a diagram consists of multiple parts (like views, arrows, labels) visually grouped together, put them in **ONE** single \`.figure-box\`. Do not split them into multiple boxes unless they are completely unrelated figures separated by paragraphs of text.
3. **SIZE ESTIMATION:** You **MUST** estimate the height of the figure in the original page and apply it.
   - Example: \`<div class="figure-box" style="height: 55mm">...</div>\`
   - If a figure is small/narrow, use a small height. If it is large, use a large height. **Match the original exactly.**

# LAYOUT RULES (COMPACT A4)
1. **FIT TO PAGE:** English text expands. Use **9pt** font. Reduce margins. Ensure NO cropping at the bottom.
2. **WARNING BOXES:** Ensure colored warning boxes at the bottom are fully preserved and visible.

# VISUAL RESTORATION
- **Colors:** Match header colors (Red/Blue/Black) using inline styles.
- **Font Sizes:** Match relative font hierarchies.

# CSS CLASS MAPPING
- Titles: \`<h1 class="main-title" style="...">...</h1>\`
- Sections: \`<div class="section-header" style="...">...</div>\`
- Figures: 
  \`\`\`html
  <div class="figure-box" style="height: [ESTIMATED_HEIGHT]mm">
     <div class="figure-label">[Optional: Figure Label if outside diagram]</div>
     <div class="figure-hint">Click to upload original diagram</div>
  </div>
  \`\`\`
- Warnings: \`<div class="warning-box" style="...">...</div>\`
- Footer: \`<div class="page-footer">...</div>\`

# OUTPUT FORMAT
Return **ONLY** the HTML content wrapped in \`<div class="page-container">\`.
`;

/**
 * Parses a string like "1-3, 5" into [1, 2, 3, 5]
 */
function parsePageRanges(input: string): number[] {
  const pages = new Set<number>();
  const parts = input.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      }
    } else {
      const num = Number(trimmed);
      if (!isNaN(num)) {
        pages.add(num);
      }
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Extracts inner HTML of page-container divs from a full HTML response
 */
function extractPageContainerContent(fullHtml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');
    const containers = doc.querySelectorAll('.page-container');
    if (containers.length > 0) {
      return Array.from(containers).map(c => c.outerHTML).join('\n\n');
    }
    if (doc.body && doc.body.innerHTML.trim().length > 0) {
        return `<div class="page-container">${doc.body.innerHTML}</div>`;
    }
  } catch (e) {
    console.warn("DOM parsing failed", e);
  }
  return fullHtml;
}

/**
 * Generates a single page.
 */
async function generateSinglePage(
  ai: GoogleGenAI, 
  imageBase64: string, 
  mimeType: string, 
  pageNumber: number
): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `
TASK: RECONSTRUCT PAGE ${pageNumber} (STRICT VISUAL MATCH)

REQUIREMENTS:
1. **IMAGES:** Identify the diagrams. Create a \`.figure-box\` with a \`style="height:..."\` that MATCHES the visual height in the original image. Do not create new layouts. Keep grouped diagrams together.
2. **TEXT:** Translate to English. Fit to page (use compact styling).
3. **LAYOUT:** Prevent cropping. Ensure bottom footer/warnings are visible.

Output ONLY the <div class="page-container">...</div>
`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: BASE_SYSTEM_INSTRUCTION,
      temperature: 0.1, 
    },
  });

  let text = response.text || "";
  text = text.replace(/```html/g, '').replace(/```/g, '').trim();
  return text;
}

export const reconstructManualPage = async (
  imageBase64: string,
  mimeType: string,
  pageRangeInput: string,
  onProgress?: (msg: string) => void
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set in the environment.");
  }
// 检查是否配置了 Gateway URL
  const gatewayUrl = process.env.GEMINI_GATEWAY_URL;
  const clientConfig: any = { 
    apiKey: process.env.API_KEY 
  };

  // 如果配置了 Gateway，注入 httpOptions
  if (gatewayUrl && gatewayUrl.startsWith('http')) {
    clientConfig.httpOptions = {
      baseUrl: gatewayUrl
    };
  }

  const ai = new GoogleGenAI(clientConfig);
  // --- 修改结束 ---
  const targetPages = parsePageRanges(pageRangeInput);

  if (targetPages.length === 0) {
    throw new Error("Invalid page range.");
  }

  const pageHtmls: string[] = [];

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];
    const total = targetPages.length;
    
    if (onProgress) {
      onProgress(`处理中: 第 ${pageNum} 页 (进度: ${i + 1}/${total})...`);
    }

    try {
      // Dynamic delay to prevent Rate Limits
      const delay = i === 0 ? 0 : (total > 5 ? 1500 : 500);
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
      
      const rawHtml = await generateSinglePage(ai, imageBase64, mimeType, pageNum);
      const containerHtml = extractPageContainerContent(rawHtml);
      pageHtmls.push(containerHtml);
      
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      pageHtmls.push(`
        <div class="page-container" style="display:flex;align-items:center;justify-content:center;color:red;flex-direction:column;">
          <h2>⚠️ Page ${pageNum} Reconstruction Failed</h2>
        </div>
      `);
    }
  }

  if (onProgress) {
    onProgress("正在合并最终结果...");
  }

  const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${SHARED_CSS}
</style>
</head>
<body>
${pageHtmls.join('\n')}
${SHARED_SCRIPT}
</body>
</html>
  `;

  return finalHtml.trim();
};