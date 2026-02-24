const fs = require("fs");
const path = require("path");

const env = {
  NG_APP_CLOUDINARY_CLOUD_NAME: process.env.NG_APP_CLOUDINARY_CLOUD_NAME || "",
  NG_APP_UPLOAD_PRESET: process.env.NG_APP_UPLOAD_PRESET || "",
  NG_APP_CLOUDINARY_API_KEY: process.env.NG_APP_CLOUDINARY_API_KEY || "",
  NG_APP_IA_MODEL: process.env.NG_APP_IA_MODEL || "",
  NG_APP_IA_API_URL:
    process.env.NG_APP_IA_API_URL ||
    "https://openrouter.ai/api/v1/chat/completions",
  NG_APP_IA_API_KEY: process.env.NG_APP_IA_API_KEY || "",
  NG_APP_API_KEY:
    process.env.NG_APP_API_KEY ||
    process.env.NG_APP_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "",
  NG_APP_AUTH_DOMAIN:
    process.env.NG_APP_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "",
  NG_APP_PROJECT_ID:
    process.env.NG_APP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "",
  NG_APP_STORAGE_BUCKET:
    process.env.NG_APP_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    "",
  NG_APP_MESSAGING_SENDER_ID:
    process.env.NG_APP_MESSAGING_SENDER_ID ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    "",
  NG_APP_APP_ID: process.env.NG_APP_APP_ID || process.env.FIREBASE_APP_ID || "",
  NG_APP_MEASUREMENT_ID:
    process.env.NG_APP_MEASUREMENT_ID ||
    process.env.FIREBASE_MEASUREMENT_ID ||
    "",
};

const output = `window.__env__ = ${JSON.stringify(env, null, 2)};\nObject.assign(window, window.__env__);\n`;
const outputPath = path.resolve(__dirname, "../src/assets/env.js");

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Generated runtime env file at: ${outputPath}`);
