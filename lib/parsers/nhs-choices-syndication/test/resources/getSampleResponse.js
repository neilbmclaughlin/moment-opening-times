const fs = require('fs');

function getSampleResponse(responseName) {
  return fs.readFileSync(`${__dirname}/${responseName}.xml`).toString();
}

module.exports = getSampleResponse;

