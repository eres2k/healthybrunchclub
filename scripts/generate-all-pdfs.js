const fetch = require('node-fetch');

async function generateAllPDFs() {
  console.log('🚀 Starting PDF generation...\n');

  const menus = ['regular', 'kids'];

  for (const menuType of menus) {
    try {
      console.log(`📄 Generating ${menuType} menu PDF...`);

      const response = await fetch(
        `http://localhost:8888/.netlify/functions/generate-menu-pdf?menuType=${menuType}`
      );

      if (response.ok) {
        console.log(`✅ ${menuType} menu PDF generated successfully\n`);
      } else {
        console.error(`❌ Failed to generate ${menuType} menu PDF\n`);
      }
    } catch (error) {
      console.error(`❌ Error generating ${menuType} menu:`, error.message, '\n');
    }
  }

  console.log('✨ PDF generation complete!');
}

generateAllPDFs();
