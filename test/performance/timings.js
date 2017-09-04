const orgLimit = 1000;

const OpeningTimes = require('../../OpeningTimes');
const orgs = require('../resources/pharmacy-list').slice(0, orgLimit);
const Moment = require('moment');

const timeZone = 'Europe/London';

/* Notes:
 * These tests are for comparative timings and were used during performance optimisations
 * They have no assertions since they were for timing purposes only
 * Left in the code base as the basis for something which can be used during
 * CI to detect step changes in code execution time.
 */

describe('timings', function test() {
  this.timeout(6000);
  describe(`getStatus for ${orgs.length} orgs`, () => {
    it('disregarding alterations', () => {
      orgs.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, timeZone);
          openingTimes.getStatus(Moment('2016-11-05T11:00:00').tz(timeZone), { next: true });
        }
      });
    });

    it('including alterations', () => {
      orgs.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, timeZone, o.openingTimes.alterations);
          openingTimes.getStatus(Moment('2016-11-05T11:00:00').tz(timeZone), { next: true });
        }
      });
    });
  });
});
