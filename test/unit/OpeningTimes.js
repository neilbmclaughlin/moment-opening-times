const chai = require('chai');
const chaiMoment = require('chai-moment');
const AssertionError = require('assert').AssertionError;
const OpeningTimes = require('../../OpeningTimes');
const Moment = require('moment');
require('moment-timezone');

const expect = chai.expect;
const aSunday = Moment('2016-07-24T00:00:00+00:00');

chai.use(chaiMoment);
chaiMoment.setErrorFormat('LLLL');

function getMoment(day, hours, minutes, timeZone) {
  const dayNumber = Moment
    .weekdays()
    .map(d => d.toLowerCase())
    .indexOf(day);
  const moment = Moment(aSunday).tz(timeZone);
  moment.add(dayNumber, 'days').hours(hours).minutes(minutes);
  return moment;
}

function getClosedDay() {
  return [];
}

function getSingleSessionDay() {
  return [{ closes: '17:30', opens: '09:00' }];
}

function getDoubleSessionDay() {
  return [
    { closes: '12:30', opens: '09:00' },
    { closes: '17:30', opens: '13:30' },
  ];
}

function setUpAllWeek(getTimes) {
  const week = {};

  Moment.weekdays().forEach((d) => {
    const day = d.toLowerCase();
    week[day] = getTimes();
  });

  return week;
}

function getClosedAllWeek() {
  return setUpAllWeek(getClosedDay);
}

function getRegularWorkingWeek() {
  const week = setUpAllWeek(getSingleSessionDay);
  week.sunday = getClosedDay();
  return week;
}

function getRegularWorkingWeekWithLunchBreaks() {
  const week = setUpAllWeek(getDoubleSessionDay);
  week.sunday = getClosedDay();
  return week;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getRegularWorkingWeekWithCustomSession(session) {
  const getCustomSession = () => (clone(session));
  const week = setUpAllWeek(getCustomSession);
  week.sunday = getClosedDay();
  return week;
}

function momentsShouldBeSame(moment1, moment2) {
  expect(moment1).to.be.sameMoment(moment2);
}

function getNewOpeningTimes(openingTimes, timeZone, alterations) {
  return new OpeningTimes(openingTimes, timeZone, alterations);
}

describe('OpeningTimes', () => {
  describe('constructor', () => {
    /* eslint-disable no-new, max-len */
    describe('should validate parameters', () => {
      it('opening times should be defined', () => {
        expect(() => { new OpeningTimes(); })
          .to.throw(
            AssertionError,
            'parameter \'openingTimes\' undefined/empty'
          );
      });

      it('opening times should cover all days of the week', () => {
        const openingTimesJson = getRegularWorkingWeek();
        delete openingTimesJson.monday;
        expect(() => { new OpeningTimes(openingTimesJson); })
          .to.throw(
            AssertionError,
            'parameter \'openingTimes\' should have all days of the week (friday,saturday,sunday,thursday,tuesday,wednesday)'
          );
      });

      it('opening times should have opening times for each day of the week', () => {
        const openingTimesJson = getRegularWorkingWeek();
        openingTimesJson.monday = undefined;
        expect(() => { new OpeningTimes(openingTimesJson); })
          .to.throw(
            AssertionError,
            'parameter \'openingTimes\' should define opening times for each day. ({ sunday: [],\n  monday: undefined,\n  tuesday: [ { closes: \'17:30\', opens: \'09:00\' } ],\n  wednesday: [ { closes: \'17:30\', opens: \'09:00\' } ],\n  thursday: [ { closes: \'17:30\', opens: \'09:00\' } ],\n  friday: [ { closes: \'17:30\', opens: \'09:00\' } ],\n  saturday: [ { closes: \'17:30\', opens: \'09:00\' } ] })'
          );
      });

      it('time zone should be defined', () => {
        const openingTimesJson = getRegularWorkingWeek();
        expect(() => { new OpeningTimes(openingTimesJson); })
          .to.throw(
            AssertionError,
            'parameter \'timeZone\' undefined/empty'
          );
      });

      it('time zone should be valid', () => {
        const openingTimesJson = getRegularWorkingWeek();
        expect(() => { new OpeningTimes(openingTimesJson, 'blah'); })
          .to.throw(
            AssertionError,
            'parameter \'timeZone\' not a valid timezone'
          );
      });
    });
    /* eslint-enable no-new, max-len */
  });

  describe('getStatus()', () => {
    describe('returned status value', () => {
      const openingTimesJson = getRegularWorkingWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      describe('default values', () => {
        const moment = getMoment('monday', 11, 30, 'Europe/London');
        const status = openingTimes.getStatus(moment);
        it('isOpen should be populated', () => {
          expect(status.isOpen).to.not.equal(undefined);
        });
        it('moment should be populated', () => {
          expect(status.moment).to.not.equal(undefined);
        });
        it('nextOpen should not be populated', () => {
          expect(status.nextOpen).to.equal(undefined);
        });
        it('nextClosed should not be populated', () => {
          expect(status.nextClosed).to.equal(undefined);
        });
      });

      describe('passed extended option', () => {
        const moment = getMoment('monday', 11, 30, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be populated', () => {
          expect(status.isOpen).to.not.equal(undefined);
        });
        it('moment should be populated', () => {
          expect(status.moment).to.not.equal(undefined);
        });
        it('nextOpen should be populated', () => {
          expect(status.nextOpen).to.not.equal(undefined);
        });
        it('nextClosed should be populated', () => {
          expect(status.nextClosed).to.not.equal(undefined);
        });
      });
    });

    describe('boundary tests', () => {
      const openingTimesJson = getRegularWorkingWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      describe('moment at session start', () => {
        const moment = getMoment('monday', 9, 0, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be next closed', () => {
          momentsShouldBeSame(status.nextClosed, getMoment('monday', 17, 30, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });

      describe('moment 1 minute before session start', () => {
        const moment = getMoment('monday', 8, 59, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be next open', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('monday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('moment 1 minute after session start', () => {
        const moment = getMoment('monday', 9, 1, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be next closed', () => {
          momentsShouldBeSame(status.nextClosed, getMoment('monday', 17, 30, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });

      describe('moment at session end', () => {
        const moment = getMoment('monday', 17, 30, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be next open', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('tuesday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('moment 1 minute before session end', () => {
        const moment = getMoment('monday', 17, 29, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be next closed', () => {
          momentsShouldBeSame(status.nextClosed, getMoment('monday', 17, 30, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });

      describe('moment 1 minute after session end', () => {
        const moment = getMoment('monday', 17, 31, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be next open', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('tuesday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });
    });

    describe('single session (9:00 - 17:30)', () => {
      const openingTimesJson = getRegularWorkingWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      describe('moment inside opening times', () => {
        const moment = getMoment('monday', 11, 30, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be next closed', () => {
          momentsShouldBeSame(status.nextClosed, getMoment('monday', 17, 30, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });

      describe('moment outside opening times', () => {
        const moment = getMoment('monday', 18, 30, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be next open', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('tuesday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });
    });

    describe('split sessions (9:00 - 12:30, 13:30 - 17:30)', () => {
      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      describe('moment inside lunch time', () => {
        const moment = getMoment('monday', 13, 0, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be start of afternoon session', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('monday', 13, 30, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('moment during the morning session', () => {
        const moment = getMoment('monday', 10, 0, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be end of morning session', () => {
          momentsShouldBeSame(status.nextClosed, getMoment('monday', 12, 30, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });

      describe('moment during the afternoon session', () => {
        const moment = getMoment('monday', 14, 0, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be end of afternoon session', () => {
          momentsShouldBeSame(status.nextClosed, getMoment('monday', 17, 30, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });

      describe('moment after the afternoon session', () => {
        const moment = getMoment('monday', 18, 0, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be the start of tomorrows morning session', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('tuesday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('moment before the morning session', () => {
        const moment = getMoment('monday', 8, 0, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be the start of the morning session', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('monday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });
    });

    describe('closed', () => {
      describe('closed all week', () => {
        const openingTimesJson = getClosedAllWeek();
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('monday', 12, 40, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be passed undefined', () => {
          expect(status.nextOpen).to.equal(undefined);
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('closed today', () => {
        const openingTimesJson = getRegularWorkingWeek();
        openingTimesJson.monday = [];
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('monday', 12, 40, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be start of tomorrows morning session', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('tuesday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('after friday and closed for the weekend', () => {
        const openingTimesJson = getRegularWorkingWeek();
        openingTimesJson.saturday = [];
        openingTimesJson.sunday = [];
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('friday', 18, 30, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be start of mondays morning session', () => {
          const expectedOpeningDateTime =
            Moment(moment)
              .add(3, 'days')
              .hours(9)
              .minutes(0);
          momentsShouldBeSame(status.nextOpen, expectedOpeningDateTime);
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('closing time of midnight', () => {
        const openingTimesJson = getRegularWorkingWeekWithCustomSession([
          { closes: '17:30', opens: '09:00' },
          { closes: '00:00', opens: '18:30' },
        ]);
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('monday', 21, 30, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be midnight', () => {
          momentsShouldBeSame(status.nextClosed, getMoment('tuesday', 0, 0, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });
    });

    describe('opening times spanning midnight (09:00 - 12:00. 13:00 - 01:00)', () => {
      const openingTimesJson = getRegularWorkingWeekWithCustomSession([{ closes: '12:00', opens: '09:00' },
        { closes: '01:00', opens: '13:00' }]);
      describe('moment after midnight but before closing', () => {
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('tuesday', 0, 55, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be true', () => {
          expect(status.isOpen).to.equal(true);
        });
        it('nextClosed should be 1:00 am', () => {
          expect(status.isOpen).to.equal(true);
          momentsShouldBeSame(status.nextClosed, getMoment('tuesday', 1, 0, 'Europe/London'));
        });
        it('nextOpen should be passed moment', () => {
          momentsShouldBeSame(status.nextOpen, moment);
        });
      });

      describe('moment after midnight and after closing', () => {
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('tuesday', 1, 5, 'Europe/London');
        const status = openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be start of tomorrows morning session', () => {
          momentsShouldBeSame(status.nextOpen, getMoment('tuesday', 9, 0, 'Europe/London'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });
    });

    describe('with opening times in different time zones', () => {
      describe('Opening times - London 9:00 - 17:30', () => {
        const openingTimesJson = getRegularWorkingWeek();
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

        describe('8 am UTC time', () => {
          const moment = getMoment('monday', 8, 0, 'UTC');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be false', () => {
            expect(status.isOpen).to.equal(true);
          });
          it('nextClosed should be end of todays session in time zone of opening times', () => {
            // TODO: consider if getStatus should return time in the timezone of the moment
            // passed to getStatus
            momentsShouldBeSame(status.nextClosed, getMoment('monday', 17, 30, 'Europe/London'));
          });
          it('nextOpen should be passed moment', () => {
            momentsShouldBeSame(status.nextOpen, moment);
          });
        });
      });

      describe('Opening times - Tokyo 9:00 - 17:30', () => {
        const openingTimesJson = getRegularWorkingWeek();
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Asia/Tokyo');

        describe('8 am Europe/London time', () => {
          const moment = getMoment('monday', 8, 0, 'Europe/London');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be true', () => {
            expect(status.isOpen).to.equal(true);
          });
          it('nextClosed should be end of todays session in TZ of opening times', () => {
            // TODO: consider if getStatus should return time in the timezone of the moment
            // passed to getStatus
            momentsShouldBeSame(status.nextClosed, getMoment('monday', 17, 30, 'Asia/Tokyo'));
          });
          it('nextOpen should be passed moment', () => {
            momentsShouldBeSame(status.nextOpen, moment);
          });
        });

        describe('11 am Europe/London time', () => {
          const moment = getMoment('monday', 11, 0, 'Europe/London');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be false', () => {
            expect(status.isOpen).to.equal(false);
          });
          it('nextOpen should be start of tomorrows session in TZ of opening times', () => {
            momentsShouldBeSame(status.nextOpen, getMoment('tuesday', 9, 0, 'Asia/Tokyo'));
          });
          it('nextClosed should be passed moment', () => {
            momentsShouldBeSame(status.nextClosed, moment);
          });
        });
      });
    });

    describe('opening time alterations', () => {
      describe('closed for a day', () => {
        const timeZone = 'Europe/London';
        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [],
        };
        const moment = Moment('2016-08-29T10:55:00+01:00');
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        const status =
          openingTimes.getStatus(moment, { next: true });
        it('isOpen should be false', () => {
          expect(status.isOpen).to.equal(false);
        });
        it('nextOpen should be start of tomorrows session', () => {
          momentsShouldBeSame(status.nextOpen, Moment('2016-08-30T09:00:00+01:00'));
        });
        it('nextClosed should be passed moment', () => {
          momentsShouldBeSame(status.nextClosed, moment);
        });
      });

      describe('reduced opening hours', () => {
        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ closes: '16:30', opens: '11:00' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);

        describe('moment during the alteration', () => {
          const moment = Moment('2016-08-29T12:30:00+01:00');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be true', () => {
            expect(status.isOpen).to.equal(true);
          });
          it('nextClosed should be end of afternoon session', () => {
            momentsShouldBeSame(status.nextClosed, Moment('2016-08-29T16:30:00+01:00'));
          });
          it('nextOpen should be passed moment', () => {
            momentsShouldBeSame(status.nextOpen, moment);
          });
        });

        describe('moment after the alteration', () => {
          const moment = Moment('2016-08-29T16:35:00+01:00');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be false', () => {
            expect(status.isOpen).to.equal(false);
          });
          it('nextOpen should be the start of tomorrows morning session', () => {
            momentsShouldBeSame(status.nextOpen, Moment('2016-08-30T09:00:00+01:00'));
          });
          it('nextClosed should be passed moment', () => {
            momentsShouldBeSame(status.nextClosed, moment);
          });
        });

        describe('moment before the alteration', () => {
          const moment = Moment('2016-08-29T10:55:00+01:00');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be false', () => {
            expect(status.isOpen).to.equal(false);
          });
          it('nextOpen should be the start of the morning session', () => {
            momentsShouldBeSame(status.nextOpen, Moment('2016-08-29T11:00:00+01:00'));
          });
          it('nextClosed should be passed moment', () => {
            momentsShouldBeSame(status.nextClosed, moment);
          });
        });
      });

      describe('spanning midnight', () => {
        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ closes: '01:30', opens: '07:00' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);

        describe('moment before midnight and during the alteration', () => {
          const moment = Moment('2016-08-29T11:30:00+01:00');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be true', () => {
            expect(status.isOpen).to.equal(true);
          });
          it('nextClosed should be end of session', () => {
            momentsShouldBeSame(status.nextClosed, Moment('2016-08-30T01:30:00+01:00'));
          });
          it('nextOpen should be passed moment', () => {
            momentsShouldBeSame(status.nextOpen, moment);
          });
        });

        describe('moment after midnight and during the alteration', () => {
          const moment = Moment('2016-08-30T01:25:00+01:00');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be true', () => {
            expect(status.isOpen).to.equal(true);
          });
          it('nextClosed should be end of session', () => {
            momentsShouldBeSame(status.nextClosed, Moment('2016-08-30T01:30:00+01:00'));
          });
          it('nextOpen should be passed moment', () => {
            momentsShouldBeSame(status.nextOpen, moment);
          });
        });

        describe('moment after midnight and after the alteration', () => {
          const moment = Moment('2016-08-30T01:35:00+01:00');
          const status = openingTimes.getStatus(moment, { next: true });
          it('isOpen should be false', () => {
            expect(status.isOpen).to.equal(false);
          });
          it('nextOpen should be start of tomorrows session', () => {
            momentsShouldBeSame(status.nextOpen, Moment('2016-08-30T09:00:00+01:00'));
          });
          it('nextClosed should be passed moment', () => {
            momentsShouldBeSame(status.nextClosed, moment);
          });
        });
      });
    });
  });

  describe('formatOpeningTimes()', () => {
    it('when passed the format string \'HH:mm\' times should be returned in that format', () => {
      const openingTimesJson = getRegularWorkingWeekWithCustomSession([
        { closes: '12:30', opens: '09:00' },
        { closes: '17:30', opens: '13:30' },
        { closes: '00:00', opens: '18:30' },
      ]);
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const formattedOpeningTimes = openingTimes.getFormattedOpeningTimes('HH:mm');
      expect(formattedOpeningTimes.monday[0].opens).to.equal('09:00');
      expect(formattedOpeningTimes.monday[0].closes).to.equal('12:30');
      expect(formattedOpeningTimes.monday[1].opens).to.equal('13:30');
      expect(formattedOpeningTimes.monday[1].closes).to.equal('17:30');
      expect(formattedOpeningTimes.monday[2].opens).to.equal('18:30');
      expect(formattedOpeningTimes.monday[2].closes).to.equal('midnight');
    });

    it('by default times should be returned as am/pm', () => {
      const openingTimesJson = getRegularWorkingWeekWithCustomSession([
        { closes: '12:30', opens: '09:00' },
        { closes: '17:30', opens: '13:30' },
        { closes: '00:00', opens: '18:30' },
      ]);
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const formattedOpeningTimes = openingTimes.getFormattedOpeningTimes();
      expect(formattedOpeningTimes.monday[0].opens).to.equal('9:00 am');
      expect(formattedOpeningTimes.monday[0].closes).to.equal('12:30 pm');
      expect(formattedOpeningTimes.monday[1].opens).to.equal('1:30 pm');
      expect(formattedOpeningTimes.monday[1].closes).to.equal('5:30 pm');
      expect(formattedOpeningTimes.monday[2].opens).to.equal('6:30 pm');
      expect(formattedOpeningTimes.monday[2].closes).to.equal('midnight');
    });

    it('should handle closed all week', () => {
      const openingTimesJson = getClosedAllWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const formattedOpeningTimes = openingTimes.getFormattedOpeningTimes();
      expect(formattedOpeningTimes.monday.length).to.equal(0);
    });
  });
});
