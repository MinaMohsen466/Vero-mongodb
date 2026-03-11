import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');
const translationsFile = path.join(srcDir, 'translations.js');

async function main() {
    const translationsModule = await import(`file://${translationsFile}`);
    const translationsData = translationsModule.default;

    const allUsedKeys = new Set();
    const keyToEnglish = {};

    function scanDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                scanDir(fullPath);
            } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const regex = /t\(['"`](.*?)['"`]\)(?:\s*\|\|\s*['"`](.*?)['"`])?/g;
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const key = match[1];
                    const englishFallback = match[2];
                    allUsedKeys.add(key);
                    if (englishFallback && !keyToEnglish[key]) {
                        keyToEnglish[key] = englishFallback;
                    }
                }
            }
        }
    }

    scanDir(srcDir);

    const arKeys = new Set(Object.keys(translationsData.ar));
    const enKeys = new Set(Object.keys(translationsData.en));

    const missingAr = [];
    const missingEn = [];

    for (const key of allUsedKeys) {
        if (!arKeys.has(key)) missingAr.push(key);
        if (!enKeys.has(key)) missingEn.push(key);
    }

    fs.writeFileSync(path.join(__dirname, 'missing.json'), JSON.stringify({
        missingAr, missingEn, keyToEnglish
    }, null, 2));

    console.log(`Saved ${missingAr.length} missing AR keys and ${missingEn.length} missing EN keys to missing.json`);
}

main().catch(console.error);
