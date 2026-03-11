/**
 * Creates icon.ico from icon.png for Windows builds
 * Run: node create-icon.js
 */
const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'public', 'icon.png');
const icoPath = path.join(__dirname, 'public', 'icon.ico');

if (!fs.existsSync(pngPath)) {
    console.error('❌ icon.png not found in public/');
    process.exit(1);
}

const pngData = fs.readFileSync(pngPath);

// ICO format: header (6 bytes) + 1 image entry (16 bytes) + PNG data
const buf = Buffer.alloc(6 + 16 + pngData.length);

// ICO Header
buf.writeUInt16LE(0, 0);       // Reserved
buf.writeUInt16LE(1, 2);       // Type: 1 = ICO
buf.writeUInt16LE(1, 4);       // Count: 1 image

// Image directory entry
buf.writeUInt8(0, 6);          // Width: 0 = 256
buf.writeUInt8(0, 7);          // Height: 0 = 256
buf.writeUInt8(0, 8);          // Color count
buf.writeUInt8(0, 9);          // Reserved
buf.writeUInt16LE(0, 10);      // Planes
buf.writeUInt16LE(32, 12);     // Bit count
buf.writeUInt32LE(pngData.length, 14); // Size of image data
buf.writeUInt32LE(22, 18);     // Offset: after header (6) + entry (16) = 22

// PNG data
pngData.copy(buf, 22);

fs.writeFileSync(icoPath, buf);
console.log('✅ icon.ico created successfully at', icoPath);
