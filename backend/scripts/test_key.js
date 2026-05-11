// backend/scripts/test_key.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
  const key = "AIzaSyB1xY46ub0iAAnNAt0f4-awbNtJSBTL1gw";
  console.log("Testing Second Key:", key);
  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Write a one-sentence lesson objective for Nouns.");
    console.log("SUCCESS!");
    console.log("Response:", result.response.text());
  } catch (e) {
    console.error("FAILED:", e.message);
  }
}
test();
