const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const menusDir = path.join(process.cwd(), 'content', 'menus');

    if (!fs.existsSync(menusDir)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ active: null, menus: [] })
      };
    }

    const files = fs
      .readdirSync(menusDir)
      .filter((file) => file.endsWith('.md'));

    const menus = files.map((file) => {
      const filePath = path.join(menusDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);

      return {
        ...data,
        filename: file,
        slug: file.replace('.md', '')
      };
    });

    const activeMenu = menus.find((menu) => menu.active === true);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        active: activeMenu || null,
        menus,
        count: menus.length
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
