const fs = require('fs');

const bakPath = 'src/pages/admin/PlatformOverviewPage.vue.bak';
const curPath = 'src/pages/admin/PlatformOverviewPage.vue';

const bakContent = fs.readFileSync(bakPath, 'utf-8');
const curContent = fs.readFileSync(curPath, 'utf-8');

// The <template> starts at the beginning of the file, up to the LAST </template>
const templateStartIndex = bakContent.indexOf('<template>');
const templateEndIndex = bakContent.lastIndexOf('</template>');
if (templateStartIndex === -1 || templateEndIndex === -1) throw new Error("Could not find outer template bounds in bak");

let rawTemplate = bakContent.substring(templateStartIndex + '<template>'.length, templateEndIndex);

// Strip <q-page> wrapper from rawTemplate because we already have it
rawTemplate = rawTemplate.replace(/<q-page.*?>/, '');
rawTemplate = rawTemplate.substring(0, rawTemplate.lastIndexOf('</q-page>'));

// For curContent, we will extract the exact wrapper.
// We want to keep everything from the beginning to `<div v-else>`
// and everything from `<script setup lang="ts">` to the end.

const divElseIndex = curContent.indexOf('<div v-else>');
if (divElseIndex === -1) throw new Error("Could not find <div v-else> in curContent");
const wrapperTop = curContent.substring(0, divElseIndex + '<div v-else>'.length);

const scriptStartIndex = curContent.indexOf('<script setup lang="ts">');
if (scriptStartIndex === -1) throw new Error("Could not find <script setup lang=\"ts\"> in curContent");

const scriptBlock = curContent.substring(scriptStartIndex);

const newCurContent = wrapperTop + '\n' + rawTemplate + '\n    </div>\n  </q-page>\n</template>\n\n' + scriptBlock;

fs.writeFileSync(curPath, newCurContent);
console.log("Template successfully merged (V2).");
