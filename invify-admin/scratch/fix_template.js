const fs = require('fs');

const bakPath = 'src/pages/admin/PlatformOverviewPage.vue.bak';
const curPath = 'src/pages/admin/PlatformOverviewPage.vue';

const bakContent = fs.readFileSync(bakPath, 'utf-8');
const curContent = fs.readFileSync(curPath, 'utf-8');

// Get the raw template block from bak
const rawTemplateMatch = bakContent.match(/<template>([\s\S]*?)<\/template>/);
if (!rawTemplateMatch) throw new Error("Could not find template in bak");

let rawTemplate = rawTemplateMatch[1];
// Strip <q-page> wrapper from rawTemplate because we already have it
rawTemplate = rawTemplate.replace(/<q-page.*?>/, '');
rawTemplate = rawTemplate.replace(/<\/q-page>/, '');

// The curContent currently looks like:
/*
<template>

  <q-page class="q-pa-lg text-white command-center-page" style="background: #071220; min-height: 100vh;">
    <!-- Loading State -->
    ...
    <!-- Main Content -->
    <div v-else>
    </div>
  </q-page>
</template>

<script setup lang="ts">
...
*/

// We want to inject rawTemplate inside `<div v-else> ... </div>`
const newCurContent = curContent.replace(/<div v-else>\s*<\/div>/, '<div v-else>\n' + rawTemplate + '\n    </div>');

fs.writeFileSync(curPath, newCurContent);
console.log("Template successfully merged.");
