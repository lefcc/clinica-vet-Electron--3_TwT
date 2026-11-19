// Script para gerar PDF da documentação usando Puppeteer
// Uso: node scripts/generate-pdf.js

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const markdownPath = path.join(__dirname, '../docs/ESTRUTURA_PROJETO.md');
const outputPath = path.join(__dirname, '../docs/ESTRUTURA_PROJETO.pdf');

// HTML template com estilo para PDF
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 60px;
    }
    h1 { color: #2E7D32; border-bottom: 2px solid #2E7D32; padding-bottom: 8px; margin-top: 40px; }
    h2 { color: #6D4C41; border-bottom: 1px solid #D7CCC8; padding-bottom: 4px; margin-top: 32px; }
    h3 { color: #3B2F2A; margin-top: 24px; }
    h4 { color: #3B2F2A; margin-top: 16px; }
    code { background: #F5F5F5; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; font-size: 0.9em; }
    pre { background: #2D2D2D; color: #F8F8F2; padding: 16px; border-radius: 6px; overflow-x: auto; page-break-inside: avoid; }
    pre code { background: none; padding: 0; color: inherit; font-size: 0.85em; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9em; }
    th, td { border: 1px solid #D7CCC8; padding: 8px 12px; text-align: left; }
    th { background: #F7F3EC; font-weight: 600; }
    tr:nth-child(even) { background: #FAFAFA; }
    blockquote { border-left: 4px solid #2E7D32; padding-left: 16px; margin: 16px 0; color: #666; font-style: italic; }
    ul, ol { padding-left: 24px; }
    li { margin: 4px 0; }
    .toc { background: #F7F3EC; border: 1px solid #D7CCC8; border-radius: 8px; padding: 20px; margin-bottom: 32px; }
    .toc h2 { margin-top: 0; border: none; }
    .toc ul { list-style: none; padding-left: 0; }
    .toc li { margin: 6px 0; }
    .toc a { color: #2E7D32; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #D7CCC8; margin: 32px 0; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #2E7D32; }
    .header h1 { margin: 0; border: none; }
    .header p { color: #666; margin: 8px 0 0; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  {{CONTENT}}
</body>
</html>
`;

async function generatePdf() {
  // Ler markdown
  const markdown = fs.readFileSync(markdownPath, 'utf-8');

  // Converter markdown para HTML usando marked
  const htmlContent = marked.parse(markdown);

  // Inserir no template
  const fullHtml = htmlTemplate.replace('{{CONTENT}}', htmlContent);

  // Iniciar Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Definir conteúdo HTML
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  // Gerar PDF
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    printBackground: true,
    preferCSSPageSize: true
  });

  await browser.close();
  console.log(`✅ PDF gerado: ${outputPath}`);
}

generatePdf().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});