const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ntcCode = fs.readFileSync(
  path.join(__dirname, '../../public/javascript/ntc.js'),
  'utf8'
);

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(ntcCode, sandbox);

exports.name = function (hex) {
  const match = sandbox.ntc.name(hex);
  return match ? match[1] : hex;
};
