const orgLimit = 1000;

const OpeningTimes = require('../OpeningTimes');
const orgs = require('./pharmacy-list').slice(0, orgLimit);
const Moment = require('moment');

const timeZone = 'Europe/London';
const now = new Moment().tz(timeZone);

function preProcessOrgs() {
  orgs.forEach((org) => {
    if (org.openingTimes) {
      Object.keys(org.openingTimes.alterations).forEach((alteration) => {
        if (new Moment(alteration).tz(timeZone).isBefore(now, 'day')) {
          // console.log(alteration);
          // eslint-disable-next-line no-param-reassign
          delete org.openingTimes[alteration];
        }
      });
    }
  });
}

describe('timings', function () {
  this.timeout(6000);
  preProcessOrgs(orgs);
  describe(`isOpen for ${orgs.length} orgs`, () => {
    it('disregarding alterations', () => {
      orgs.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, timeZone);
          openingTimes.isOpen(new Moment('2016-11-05T11:00:00').tz(timeZone));
        }
      });
    });
    it('including alterations', () => {
      orgs.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, timeZone, o.openingTimes.alterations);
          openingTimes.isOpen(new Moment('2016-11-05T11:00:00').tz(timeZone));
        }
      });
    });
  });
  describe(`getOpeningHoursMessage() for ${orgs.length} orgs`, () => {
    it('disregarding alterations', () => {
      orgs.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, timeZone);
          openingTimes.getOpeningHoursMessage(new Moment('2016-11-05T11:00:00').tz(timeZone));
        }
      });
    });
    it('including alterations', () => {
      orgs.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, timeZone, o.openingTimes.alterations);
          openingTimes
            .getOpeningHoursMessage(new Moment('2016-11-05T11:00:00').tz(timeZone));
        }
      });
    });
  });
});
