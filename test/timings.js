const OpeningTimes = require('../OpeningTimes');
const orgs = require('./pharmacy-list');
const Moment = require('moment');

describe('timings', function () {
  this.timeout(3000);
  describe('isOpen for 1000 orgs', () => {
    const orgList = orgs.slice(0, 1000);
    it('disregarding alterations', () => {
      orgList.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, 'Europe/London');
          openingTimes.isOpen(new Moment());
        }
      });
    });
    it('including alterations', () => {
      orgList.forEach((o) => {
        if (o.openingTimes) {
          const openingTimes =
            new OpeningTimes(o.openingTimes.general, 'Europe/London', o.openingTimes.alterations);
          openingTimes.isOpen(new Moment());
        }
      });
    });
  });
});

