const fs = require('fs');
const resolve = require('path').resolve;
const join = require('path').join;
const cp = require('child_process');

const lib = resolve(__dirname, '../lib/parsers');

function isModuleDirectory(directory) {
  return fs.existsSync(join(directory, 'package.json'));
}

fs.readdirSync(lib).forEach((d) => {
  const fullPath = join(lib, d);

  if (isModuleDirectory(fullPath)) {
    cp.spawn('npm', ['i'], { env: process.env, cwd: fullPath, stdio: 'inherit' });
  }
});
