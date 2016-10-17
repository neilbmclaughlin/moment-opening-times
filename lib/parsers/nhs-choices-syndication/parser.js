const xml2js = require('xml2js');
const jsonQuery = require('json-query');
const stripPrefix = require('xml2js/lib/processors').stripPrefix;
const assert = require('assert');
const Verror = require('verror');

const parseOpeningTimesFromSyndicationXml = (openingTimesType, xml) => {
  assert(openingTimesType, 'parameter \'openingTimesType\' undefined/empty');
  assert(xml, 'parameter \'xml\' undefined/empty');
  assert.equal(typeof (openingTimesType),
    'string', 'parameter \'openingTimesType\' must be a string');
  assert.equal(typeof (xml),
    'string', 'parameter \'xml\' must be a string');
  const openingTimes = {};
  const options = {
    tagNameProcessors: [stripPrefix],
  };
  const xmlParser = new xml2js.Parser(options);
  xmlParser.parseString(xml, (err, result) => {
    if (err) {
      throw new Verror(err, 'Unable to parse opening times XML');
    }

    let openingTimesForType = null;
    try {
      if (result.feed.entry[0].content[0].overview[0].openingTimes) {
        const allOpeningTimes =
          result.feed.entry[0].content[0].overview[0].openingTimes[0].timesSessionTypes[0];

        openingTimesForType = jsonQuery('timesSessionType[*:isType]', {
          data: allOpeningTimes,
          locals: {
            isType: (item) => item.$.sessionType === openingTimesType,
          },
        }).value[0];

        openingTimesForType.daysOfWeek[0].dayOfWeek.forEach((item) => {
          const dayName = item.dayName[0].toLowerCase();
          openingTimes[dayName] = [];
          item.timesSessions[0].timesSession.forEach((t) => {
            if (t.fromTime) {
              // session details are a time range
              openingTimes[dayName].push({ opens: t.fromTime[0], closes: t.toTime[0] });
            }
          });
        });
      }
    } catch (e) {
      throw new Verror(e, `Unable to get '${openingTimesType}' opening times from xml`);
    }
  });
  return openingTimes;
};

module.exports = parseOpeningTimesFromSyndicationXml;
