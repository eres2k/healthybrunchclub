const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');

// Stelle sicher, dass der Output-Ordner existiert
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

try {
  // Markdown-Datei mit Front Matter lesen
  const file = fs.readFileSync('content/post.md', 'utf8');
  const { data, content } = matter(file);
  
  console.log('Front Matter:', data);
  console.log('Content:', content);
  
  // Hier kannst du deine Build-Logik hinzufügen
  // z.B. HTML generieren, Dateien kopieren, etc.
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
