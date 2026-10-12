const fs = require('fs');
const path = require('path');

function search(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') search(full);
        } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
            const content = fs.readFileSync(full, 'utf8');
            if (content.includes("Present") && (content.includes("attendance") || content.includes("Attendance"))) {
                console.log(full);
            }
        }
    });
}
search('src');
