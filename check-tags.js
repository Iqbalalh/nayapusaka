const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, '..', 'sipusaka', 'src', 'utils', '20250616_Bansos Pendidikan AY YP di BY Mri.docx');
const content = fs.readFileSync(docPath);
const zip = new PizZip(content);

// Check document.xml
const docXml = zip.file('word/document.xml');
if (docXml) {
  const xml = docXml.asText();
  
  // Search for curly braces patterns
  const tagPattern = /\{[^}]+\}/g;
  const matches = xml.match(tagPattern);
  console.log('=== Tags found with regex ===');
  console.log(matches ? matches : 'No tags found');
  console.log('');
  
  // Also search for partial braces
  const openBraces = (xml.match(/\{/g) || []).length;
  const closeBraces = (xml.match(/\}/g) || []).length;
  console.log('Open braces count:', openBraces);
  console.log('Close braces count:', closeBraces);
  
  // Find context around braces
  const braceContext = xml.substring(xml.indexOf('{') - 50, xml.indexOf('}') + 50);
  console.log('\n=== Context around first brace ===');
  console.log(braceContext);
}

// List all files in the archive
console.log('\n=== Files in docx archive ===');
const files = Object.keys(zip.files);
console.log(files);
