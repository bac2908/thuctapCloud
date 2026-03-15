const fs = require('fs');
const p = 'd:/ThuctapCloud/FE_vpn/src/pages/Admin.jsx';
const s = fs.readFileSync(p, 'utf8');
console.log('{', s.split('{').length - 1, '}', s.split('}').length - 1, '(', s.split('(').length - 1, ')', s.split(')').length - 1);
