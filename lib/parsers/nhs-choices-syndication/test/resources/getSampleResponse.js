const fs = require('fs');

const sampleResponsesDir = './test/resources';

function getSampleResponse(responseName) {
  return fs.readFileSync(`${sampleResponsesDir}/${responseName}.xml`).toString();
}

module.exports = getSampleResponse;

