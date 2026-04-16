const fs = require('fs');

const filePath = 'server.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const occurrences = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("app.post('/api/students/check-phone'")) {
        occurrences.push(i);
    }
}

if (occurrences.length >= 2) {
    const idx = occurrences[1]; // Second occurrence
    const startIdx = idx - 1; // Include the comment
    let endIdx = idx;
    while (endIdx < lines.length && !lines[endIdx].includes('});')) {
        endIdx++;
    }

    const newBlock = [
        "// Check if a student email is already registered",
        "app.post('/api/students/check-email', async (req, res) => {",
        "  try {",
        "    const { email } = req.body || {};",
        "    if (!email) {",
        "      return res.status(400).json({ error: 'Email address is required' });",
        "    }",
        "",
        "    const existingStudent = await db.collection('students').findOne({ email });",
        "",
        "    return res.json({ exists: !!existingStudent });",
        "  } catch (error) {",
        "    console.error('Check email error:', error);",
        "    res.status(500).json({ error: 'Failed to check email' });",
        "  }",
        "});"
    ];

    lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock);

    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Successfully replaced second occurrence at line ${idx + 1}`);
} else {
    console.log(`Found ${occurrences.length} occurrences. Need at least 2.`);
    process.exit(1);
}
