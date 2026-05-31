// invify-admin/scripts/build-search-index.js
const fs = require('fs');
const path = require('path');

const ADMIN_DIR = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ADMIN_DIR, 'src', 'pages');
const ROUTES_FILE = path.join(ADMIN_DIR, 'src', 'router', 'routes.js');
const OUTPUT_FILE = path.join(ADMIN_DIR, 'src', 'assets', 'ui-search-index.json');

console.log('Starting search index generator...');
console.log('Pages directory:', PAGES_DIR);
console.log('Routes file:', ROUTES_FILE);

// Parse routes.js to map component paths to route URLs
function parseRoutes() {
  const content = fs.readFileSync(ROUTES_FILE, 'utf8');
  const routeMap = []; // Array of { componentPath: string, routePath: string, title: string, keywords: string[] }
  
  // We will parse using standard JS regexp over the file content
  // Since routes.js is relatively structured:
  // Top-level or nested children.
  // Let's find child blocks.
  // To be super safe and accurate, let's extract matches of:
  // path: '...', component: () => import('pages/...')
  // or path: '...', component: () => import('pages/governance/...')
  
  // Let's find parent groups. We can see two layouts: MainLayout.vue (under path '/') and TenantLayout.vue (under path '/tenant')
  // We can write a custom regex-based parser that scans routes.js.
  
  // Let's search for all imports
  const importRegex = /path:\s*['"]([^'"]*)['"],\s*(?:redirect:[^,]+,?\s*)*component:\s*\(\)\s*=>\s*import\(['"](?:pages\/)?([^'"]+)['"]\)(?:,\s*meta:\s*\{([^}]+)\})?/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rawPath = match[1];
    const compPath = match[2];
    const metaStr = match[3] || '';
    
    // Resolve absolute route path
    let routePath = rawPath;
    
    // Determine parent context
    // We can check where in the file the match was found.
    // MainLayout is defined around line 43. TenantLayout is defined around line 309.
    // If the index of match is after TenantLayout definition, prefix with /tenant/
    const index = match.index;
    const tenantLayoutIndex = content.indexOf('layouts/TenantLayout.vue');
    const mainLayoutIndex = content.indexOf('layouts/MainLayout.vue');
    
    if (tenantLayoutIndex !== -1 && index > tenantLayoutIndex) {
      // It's a tenant route child
      routePath = '/tenant/' + rawPath;
    } else if (mainLayoutIndex !== -1 && index > mainLayoutIndex && index < tenantLayoutIndex) {
      // It's a main layout child
      routePath = '/' + rawPath;
    } else {
      // Top level route
      if (!routePath.startsWith('/')) {
        routePath = '/' + routePath;
      }
    }
    
    // Clean route path (remove double slashes)
    routePath = routePath.replace(/\/+/g, '/');
    if (routePath.endsWith('/') && routePath.length > 1) {
      routePath = routePath.slice(0, -1);
    }
    
    // Parse meta fields if any
    let title = '';
    let keywords = [];
    if (metaStr) {
      const titleMatch = /title:\s*['"]([^'"]+)['"]/.exec(metaStr);
      if (titleMatch) title = titleMatch[1];
      
      const keywordsMatch = /keywords:\s*\[([^\]]+)\]/.exec(metaStr);
      if (keywordsMatch) {
        keywords = keywordsMatch[1].split(',').map(k => k.replace(/['"\s]/g, ''));
      }
    }
    
    routeMap.push({
      componentPath: compPath,
      routePath: routePath,
      title: title,
      keywords: keywords
    });
  }
  
  return routeMap;
}

// Extract static text tokens from a Vue file template
function extractTextFromVue(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract template block
  const templateMatch = /<template>([\s\S]*)<\/template>/.exec(content);
  if (!templateMatch) return [];
  
  const template = templateMatch[1];
  
  const texts = new Set();
  
  // 1. Find all labels, placeholders, titles, tooltips, descriptions in attributes
  const attrRegex = /(?:label|placeholder|title|tooltip|description|impact)=["']([^"']+)["']/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(template)) !== null) {
    const txt = attrMatch[1].trim();
    if (txt && !txt.includes('{{') && !txt.startsWith(':') && txt.length > 2) {
      texts.add(txt);
    }
  }
  
  // 2. Find text inside tags. We strip out tags and scripts, match anything between > and <
  // Let's use a regex to match content between tags
  const tagTextRegex = />\s*([^<>\n\r\t{}{}]+)\s*</g;
  let tagMatch;
  while ((tagMatch = tagTextRegex.exec(template)) !== null) {
    const txt = tagMatch[1].trim();
    // Exclude if it looks like javascript expressions, vue bindings, style rules, or too short
    if (txt && 
        txt.length > 2 && 
        !txt.startsWith('{{') && 
        !txt.endsWith('}}') && 
        !txt.includes('=>') &&
        !txt.includes('===') &&
        !txt.includes('&&') &&
        !txt.includes('||') &&
        !/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()]+$/.test(txt)) {
      texts.add(txt);
    }
  }
  
  // 3. Find functions and methods (functional identifiers)
  // Let's look for @click or @update handlers that call methods
  const actionRegex = /@\w+="([^"]+)"/g;
  let actionMatch;
  while ((actionMatch = actionRegex.exec(template)) !== null) {
    const action = actionMatch[1].trim();
    // Extract method name (e.g. "openCreateModal" from "openCreateModal" or "toggleStatus(row)")
    const methodName = action.split('(')[0].trim();
    if (methodName && !['true', 'false', 'null'].includes(methodName) && methodName.length > 2) {
      // Split camelcase to readable words
      const readable = methodName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      texts.add(`Action: ${readable}`);
    }
  }
  
  return Array.from(texts);
}

function run() {
  const routes = parseRoutes();
  console.log(`Parsed ${routes.length} route mappings from routes.js`);
  
  const searchIndex = [];
  
  routes.forEach(route => {
    // Resolve file path
    // componentPath is like 'TenantsPage.vue' or 'governance/ContactMaintenancePage.vue'
    const fullPath = path.join(PAGES_DIR, route.componentPath);
    console.log(`Extracting strings from page: ${route.componentPath} -> Route: ${route.routePath}`);
    
    const pageTexts = extractTextFromVue(fullPath);
    
    pageTexts.forEach(text => {
      searchIndex.push({
        text: text,
        route: route.routePath,
        pageTitle: route.title || route.componentPath.replace('Page.vue', ''),
        keywords: route.keywords
      });
    });
  });
  
  // Let's write the index file to src/assets/ui-search-index.json
  const assetsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(searchIndex, null, 2), 'utf8');
  console.log(`Successfully generated search index with ${searchIndex.length} entries at ${OUTPUT_FILE}`);
}

run();
