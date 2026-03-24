import fs from 'fs';

const filePath = 'server.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the end of check-phone route
let insertIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("app.post('/api/students/check-phone'")) {
        // Find the following '});'
        let j = i;
        while (j < lines.length && !lines[j].includes('});')) {
            j++;
        }
        insertIdx = j + 1;
        break; 
    }
}

if (insertIdx !== -1) {
    const newBlock = [
        "",
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
        "});",
        ""
    ];

    lines.splice(insertIdx, 0, ...newBlock);

    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Successfully inserted check-email route at line ${insertIdx + 1}`);
} else {
    console.log(`Could not find check-phone route to insert after.`);
    process.exit(1);
}
