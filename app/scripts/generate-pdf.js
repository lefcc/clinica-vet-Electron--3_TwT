// Script para gerar PDF da documentação usando Electron
// Uso: npx electron scripts/generate-pdf.js

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Caminhos
const markdownPath = path.join(__dirname, '../../docs/ESTRUTURA_PROJETO.md');
const outputPath = path.join(__dirname, '../../docs/ESTRUTURA_PROJETO.pdf');

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
  <div class="header">
    <h1>Clínica Veterinária</h1>
    <p>Estrutura do Projeto e Responsabilidades</p>
    <p style="font-size: 0.9em; color: #999;">Gerado em 2026-11-19</p>
  </div>
  {{CONTENT}}
</body>
</html>
`;

// Converter Markdown simples para HTML (básico)
function markdownToHtml(md) {
  return md
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold/italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Tables (simplificado)
    .replace(/^\|(.+)\|\n\|[-:]+\|\n((?:\|.+\|\n?)+)/gm, (match, headers, rows) => {
      const ths = headers.split('|').slice(1, -1).map(h => `<th>${h.trim()}</th>`).join('');
      const trs = rows.trim().split('\n').map(row => {
        const tds = row.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Paragraphs
    .replace(/^(?!<[hultbp])(.+)$/gm, '<p>$1</p>')
    // Fix nested tags
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<table>)/g, '$1')
    .replace(/(<\/table>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>(<hr>)/g, '$1')
    .replace(/(<hr>)<\/p>/g, '$1')
    .replace(/<p>(<pre>)/g, '$1')
    .replace(/(<\/pre>)<\/p>/g, '$1');
}

function generatePdf() {
  // Ler markdown
  const markdown = fs.readFileSync(markdownPath, 'utf-8');
  const htmlContent = markdownToHtml(markdown);
  const fullHtml = htmlTemplate.replace('{{CONTENT}}', htmlContent);

  // Criar janela invisível
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    webPreferences: {
      offscreen: true
    }
  });

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

  win.webContents.on('did-finish-load', async () => {
    // Aguardar renderização
    await new Promise(resolve => setTimeout(resolve, 500));

    // Gerar PDF
    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      printBackground: true,
      landscape: false
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`✅ PDF gerado: ${outputPath}`);

    win.destroy();
    app.quit();
  });
}

// Electron app event handlers
app.on('ready', generatePdf);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});