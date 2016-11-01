const chai = require('chai');
const chaiMoment = require('chai-moment');
const AssertionError = require('assert').AssertionError;
const OpeningTimes = require('../OpeningTimes');
const Moment = require('moment');
require('moment-timezone');

const expect = chai.expect;
const aSunday = new Moment('2016-07-24T00:00:00+00:00');

chai.use(chaiMoment);
chaiMoment.setErrorFormat('LLLL');

function getMoment(day, hours, minutes, timeZone) {

  const dayNumber = Moment
    .weekdays()
    .map((d) => d.toLowerCase())
    .indexOf(day);
  const moment = new Moment(aSunday).tz(timeZone);
  moment.add(dayNumber, 'days').hours(hours).minutes(minutes);
  return moment;

}

function getClosedDay() {

  return [];

}

function getSingleSessionDay() {

  return [{ opens: '09:00', closes: '17:30' }];

}

function getDoubleSessionDay() {

  return [
    { opens: '09:00', closes: '12:30' },
    { opens: '13:30', closes: '17:30' },
  ];

}

function getTripleSessionDay() {

  return [
    { opens: '09:00', closes: '12:30' },
    { opens: '13:30', closes: '17:30' },
    { opens: '18:30', closes: '22:30' },
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

function getRegularWorkingWeekWithLunchBreaksAndEveningSession() {

  const week = setUpAllWeek(getTripleSessionDay);
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

function expectOpeningTimes(openingTimes, expectedOpenStatus, timeZone) {

  expectedOpenStatus.forEach((test) => {

    const aMoment = new Moment(test.time).tz(timeZone);
    expect(openingTimes.isOpen(aMoment)).to.equal(test.expected);

  });

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

        expect(() => {

          new OpeningTimes();

        })
          .to.throw(
            AssertionError,
            'parameter \'openingTimes\' undefined/empty');

      });

      it('opening times should cover all days of the week', () => {

        const openingTimesJson = getRegularWorkingWeek();
        delete openingTimesJson.monday;
        expect(() => {

          new OpeningTimes(openingTimesJson);

        })
          .to.throw(
            AssertionError,
            'parameter \'openingTimes\' should have all days of the week (friday,saturday,sunday,thursday,tuesday,wednesday)');

      });

      it('opening times should have opening times for each day of the week', () => {

        const openingTimesJson = getRegularWorkingWeek();
        openingTimesJson.monday = undefined;
        expect(() => {

          new OpeningTimes(openingTimesJson);

        })
          .to.throw(
            AssertionError,
            'parameter \'openingTimes\' should define opening times for each day. ({ sunday: [],\n  monday: undefined,\n  tuesday: [ { opens: \'09:00\', closes: \'17:30\' } ],\n  wednesday: [ { opens: \'09:00\', closes: \'17:30\' } ],\n  thursday: [ { opens: \'09:00\', closes: \'17:30\' } ],\n  friday: [ { opens: \'09:00\', closes: \'17:30\' } ],\n  saturday: [ { opens: \'09:00\', closes: \'17:30\' } ] })');

      });

      it('time zone should be defined', () => {

        const openingTimesJson = getRegularWorkingWeek();
        expect(() => {

          new OpeningTimes(openingTimesJson);

        })
          .to.throw(
            AssertionError,
            'parameter \'timeZone\' undefined/empty');

      });

      it('time zone should be valid', () => {

        const openingTimesJson = getRegularWorkingWeek();
        expect(() => {

          new OpeningTimes(openingTimesJson, 'blah');

        })
          .to.throw(
            AssertionError,
            'parameter \'timeZone\' not a valid timezone');

      });

    });
    /* eslint-enable no-new, max-len */

  });

  describe('isOpen()', () => {

    describe('single session (9:00 - 17:30)', () => {

      const openingTimesJson = getRegularWorkingWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      it('should return true if time is inside opening times', () => {

        const moment = getMoment('monday', 11, 30, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(true);

      });

      it('should return false if time is outside opening times', () => {

        const moment = getMoment('monday', 18, 30, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(false);

      });

    });

    describe('split sessions (9:00 - 12:30, 13:30 - 17:30)', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      it('should return false if time is during lunchtime', () => {

        const moment = getMoment('monday', 13, 0, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(false);

      });

      it('should return true if time is during the morning session', () => {

        const moment = getMoment('monday', 10, 0, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(true);

      });

      it('should return true if time is during the afternoon session', () => {

        const moment = getMoment('monday', 14, 0, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(true);

      });

      it('should return false if time is after the afternoon session', () => {

        const moment = getMoment('monday', 18, 0, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(false);

      });

      it('should return false if time is before the morning session', () => {

        const moment = getMoment('monday', 8, 0, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(false);

      });

    });

    describe('opening times spanning midnight (09:00 - 12:00. 13:00 - 01:00)', () => {

      it('should handle times after midnight but before closing', () => {

        const openingTimesJson = getRegularWorkingWeekWithCustomSession(
          [{ opens: '09:00', closes: '12:00' },
            { opens: '13:00', closes: '01:00' }]);
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('tuesday', 0, 55, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(true);

      });

      it('should handle times after midnight and after closing', () => {

        const openingTimesJson = getRegularWorkingWeekWithCustomSession(
          [{ opens: '09:00', closes: '12:00' },
            { opens: '13:00', closes: '01:00' }]);
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
        const moment = getMoment('tuesday', 1, 5, 'Europe/London');
        expect(openingTimes.isOpen(moment)).to.equal(false);

      });

    });
    describe('with opening times in different time zones', () => {

      describe('Opening times - London 9:00 - 17:30', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

        it('should return true for 8 am UTC time', () => {

          const moment = getMoment('monday', 8, 0, 'UTC');
          expect(openingTimes.isOpen(moment)).to.equal(true);

        });

      });

      describe('Opening times - Tokyo 9:00 - 17:30', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Asia/Tokyo');

        it('should return true for 8 am London time', () => {

          const moment = getMoment('monday', 8, 0, 'Europe/London');
          expect(openingTimes.isOpen(moment)).to.equal(true);

        });

        it('should return false for 4 pm London time ', () => {

          const moment = getMoment('monday', 11, 0, 'Europe/London');
          expect(openingTimes.isOpen(moment)).to.equal(false);

        });

      });

    });
    describe('opening time alterations', () => {

      it('should handle closed', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const aBankHoliday = new Moment('2016-08-29T10:30:00+00:00');
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [],
        };
        const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London', alterations);
        expect(openingTimes.isOpen(aBankHoliday)).to.equal(false);

      });

      it('should handle reduced opening hours', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '11:00', closes: '16:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        expectOpeningTimes(
          openingTimes,
          [
            { time: '2016-08-29T10:55:00+01:00', expected: false },
            { time: '2016-08-29T12:30:00+01:00', expected: true },
            { time: '2016-08-29T16:35:00+01:00', expected: false },
          ],
          timeZone);

      });

      it('should handle extended opening hours', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '07:00', closes: '01:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        expectOpeningTimes(
          openingTimes,
          [
            { time: '2016-08-29T06:55:00+01:00', expected: false },
            { time: '2016-08-29T11:30:00+01:00', expected: true },
            { time: '2016-08-30T22:35:00+01:00', expected: false },
          ],
          timeZone);

      });

      it('should handle extended opening hours which span midnight', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '07:00', closes: '01:30' }],
        };

        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        [
          { time: '2016-08-30T01:25:00+01:00', expected: true },
        ].forEach((test) => {

          const aMoment = new Moment(test.time).tz(timeZone);
          expect(openingTimes.isOpen(aMoment)).to.equal(test.expected);

        });

      });

    });

  });
  describe('nextOpen()', () => {

    it('when closed all week should return undefined', () => {

      const openingTimesJson = getClosedAllWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 12, 40, 'Europe/London');
      expect(openingTimes.nextOpen(moment)).to.equal(undefined);

    });

    it('when closed today should return start of tomorrows morning session', () => {

      const openingTimesJson = getRegularWorkingWeek();
      openingTimesJson.monday = [];
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 12, 40, 'Europe/London');
      const expectedOpeningDateTime = getMoment('tuesday', 9, 0, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextOpen(moment), expectedOpeningDateTime);

    });

    it('when during lunchtime should return start of afternoon session', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 12, 40, 'Europe/London');
      const expectedOpeningDateTime = getMoment('monday', 13, 30, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextOpen(moment), expectedOpeningDateTime);

    });

    it('when during dinnertime should return start of evening session', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaksAndEveningSession();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 17, 40, 'Europe/London');
      const expectedOpeningDateTime = getMoment('monday', 18, 30, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextOpen(moment), expectedOpeningDateTime);

    });

    it('when before days opening time should return following opening time', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 8, 30, 'Europe/London');
      const expectedOpeningDateTime = getMoment('monday', 9, 0, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextOpen(moment), expectedOpeningDateTime);

    });

    it('when after days closing time should return following days opening time', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 18, 30, 'Europe/London');
      const expectedOpeningDateTime = getMoment('tuesday', 9, 0, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextOpen(moment), expectedOpeningDateTime);

    });

    it('when after fridays closing time should return mondays opening time', () => {

      const openingTimesJson = getRegularWorkingWeek();
      openingTimesJson.saturday = [];
      openingTimesJson.sunday = [];
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('friday', 18, 30, 'Europe/London');
      const expectedOpeningDateTime =
        new Moment(moment)
        .add(3, 'days')
        .hours(9)
        .minutes(0);
      momentsShouldBeSame(openingTimes.nextOpen(moment), expectedOpeningDateTime);

    });

    it('when currently open should return the passed moment', () => {

      const openingTimesJson = getRegularWorkingWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 11, 30, 'Europe/London');
      const expectedOpeningDateTime = new Moment(moment);
      momentsShouldBeSame(openingTimes.nextOpen(moment), expectedOpeningDateTime);

    });

    describe('alterations', () => {

      it('should use alterations within a day', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '11:00', closes: '16:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        const aMoment = new Moment('2016-08-27T22:30:00+01:00').tz(timeZone);
        momentsShouldBeSame(openingTimes
          .nextOpen(aMoment), new Moment('2016-08-29T11:00:00+01:00'));

      });

      it('should use alterations which span midnight', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '11:00', closes: '01:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        const aMoment = new Moment('2016-08-30T01:00:00+01:00').tz(timeZone);
        momentsShouldBeSame(openingTimes
          .nextOpen(aMoment), new Moment('2016-08-30T01:00:00+01:00'));

      });

    });

  });
  describe('nextClosed()', () => {

    it('when during morning opening should return lunchtime closing', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 11, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('monday', 12, 30, 'Europe/London');
      momentsShouldBeSame(openingTimes
        .nextClosed(moment), expectedClosingDateTime);

    });

    it('when during afternoon opening should return evening closing', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 15, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('monday', 17, 30, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextClosed(moment), expectedClosingDateTime);

    });

    it('when currently closed should return the passed moment', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = new Moment(moment);
      momentsShouldBeSame(openingTimes.nextClosed(moment), expectedClosingDateTime);

    });

    it('should handle closing time of midnight', () => {

      const openingTimesJson = getRegularWorkingWeekWithCustomSession(
        [
          { opens: '09:00', closes: '17:30' },
          { opens: '18:30', closes: '00:00' },
        ]);
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('tuesday', 0, 0, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextClosed(moment), expectedClosingDateTime);

    });

    it('should handle closing time of after midnight', () => {

      const openingTimesJson = getRegularWorkingWeekWithCustomSession(
        [
          { opens: '09:00', closes: '17:30' },
          { opens: '18:30', closes: '01:00' },
        ]);
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('tuesday', 1, 0, 'Europe/London');
      momentsShouldBeSame(openingTimes.nextClosed(moment), expectedClosingDateTime);

    });

    describe('alterations', () => {

      it('should use alterations within a day', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '11:00', closes: '16:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        const aMoment = new Moment('2016-08-29T11:30:00+01:00').tz(timeZone);
        momentsShouldBeSame(openingTimes
          .nextClosed(aMoment), new Moment('2016-08-29T16:30:00+01:00'));

      });

      it('should use alterations which span midnight', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '11:00', closes: '01:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        const aMoment = new Moment('2016-08-29T11:30:00+01:00').tz(timeZone);
        momentsShouldBeSame(openingTimes
          .nextClosed(aMoment), new Moment('2016-08-30T01:30:00+01:00'));

      });

    });

  });
  describe('getOpeningHoursMessage()', () => {

    describe('regular opening hours', () => {

      const openingTimesJson = getRegularWorkingWeekWithLunchBreaks();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      it('when currently closed and opening tomorrow should return closed message', () => {

        const moment = getMoment('tuesday', 18, 0, 'Europe/London');
        expect(openingTimes.getOpeningHoursMessage(moment))
          .to.equal('Closed until 9:00 am tomorrow');

      });

      it('when currently closed and opening in 2 hours should return closed message', () => {

        const moment = getMoment('monday', 7, 0, 'Europe/London');
        expect(openingTimes.getOpeningHoursMessage(moment)).to.equal('Closed until 9:00 am today');

      });

      it('when currently closed and opening in 30 minutes should return closed message', () => {

        const moment = getMoment('monday', 8, 30, 'Europe/London');
        expect(openingTimes.getOpeningHoursMessage(moment)).to.equal('Opening in 30 minutes');

      });

    });
    describe('midnight opening hours', () => {

      const openingTimesJson = getRegularWorkingWeekWithCustomSession(
        [
          { opens: '09:00', closes: '12:30' },
          { opens: '13:30', closes: '17:30' },
          { opens: '18:30', closes: '00:00' },
        ]);
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');

      it('when currently open should return open message', () => {

        const moment = getMoment('monday', 13, 30, 'Europe/London');
        expect(openingTimes.getOpeningHoursMessage(moment)).to.equal('Open until 5:30 pm today');

      });

      it('when currently open and closing at 00:00 should return midnight message', () => {

        const moment = getMoment('monday', 19, 30, 'Europe/London');
        expect(openingTimes.getOpeningHoursMessage(moment)).to.equal('Open until midnight');

      });

    });
    describe('closed all week', () => {

      const openingTimesJson = getClosedAllWeek();
      const openingTimes = getNewOpeningTimes(openingTimesJson, 'Europe/London');
      const moment = getMoment('monday', 19, 30, 'Europe/London');

      it('should return a message asking to call for times', () => {

        const message = openingTimes.getOpeningHoursMessage(moment);
        expect(message).to.be.equal('Call for opening times.');

      });

    });
    describe('alterations', () => {

      it('should use alterations within a day ', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '11:00', closes: '16:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        const aMoment = new Moment('2016-08-29T11:30:00+01:00').tz(timeZone);
        expect(openingTimes.getOpeningHoursMessage(aMoment)).to.equal('Open until 4:30 pm today');

      });

      it('should use alterations which span midnight', () => {

        const openingTimesJson = getRegularWorkingWeek();
        const alterations = {
          '2016-01-01': [],
          '2016-08-29': [{ opens: '11:00', closes: '01:30' }],
        };
        const timeZone = 'Europe/London';
        const openingTimes = getNewOpeningTimes(openingTimesJson, timeZone, alterations);
        const aMoment = new Moment('2016-08-29T11:30:00+01:00').tz(timeZone);
        expect(openingTimes.getOpeningHoursMessage(aMoment))
          .to.equal('Open until 1:30 am tomorrow');

      });

    });

  });
  describe('formatOpeningTimes()', () => {

    it('when passed the format string \'HH:mm\' times should be returned in that format', () => {

      const openingTimesJson = getRegularWorkingWeekWithCustomSession([
        { opens: '09:00', closes: '12:30' },
        { opens: '13:30', closes: '17:30' },
        { opens: '18:30', closes: '00:00' },
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
        { opens: '09:00', closes: '12:30' },
        { opens: '13:30', closes: '17:30' },
        { opens: '18:30', closes: '00:00' },
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
