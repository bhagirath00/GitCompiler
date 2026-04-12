// JavaScript Full Boilerplate Template
// Language ID: 102 (JavaScript Node.js 22.08.0)

const JAVASCRIPT_TEMPLATE = `const fs = require('fs');

const input = fs.readFileSync(0, 'utf8').split(/\\s+/);
if (input.length >= 2) {
    const a = parseInt(input[0]);
    const b = parseInt(input[1]);
    console.log(a + b);
}
`;

const JAVASCRIPT_LANGUAGE_ID = 102;
const JAVASCRIPT_FLAVOR = "CE";
const JAVASCRIPT_MONACO_MODE = "javascript";
const JAVASCRIPT_FILENAME = "solution.js";
