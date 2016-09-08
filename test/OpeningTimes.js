const chai = require('chai');
const OpeningTimes = require('../OpeningTimes');
const moment = require('moment');
require('moment-timezone');
// TODO: The DaysOfTheWeek list is duplicated in OpeningTimes.
// We could probably use the moment day of week functionality to remove the need for this.
const DaysOfTheWeek =
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const expect = chai.expect;
const aMonday = moment('2016-07-25T00:00:00+01:00');

function getMoment(day, hours, minutes) {
  const dayNumber = DaysOfTheWeek.indexOf(day);
  const date = moment(aMonday).tz('Europe/London');
  date.add(dayNumber, 'days').hours(hours).minutes(minutes);
  return date;
}

describe('OpeningTimes', () => {
  const syndicationOpeningTimes = {
    monday: { times: [{ fromTime: '09:00', toTime: '17:30' }] },
    tuesday: { times: [{ fromTime: '09:00', toTime: '17:30' }] },
    wednesday: { times: [{ fromTime: '09:00', toTime: '17:30' }] },
    thursday: { times: [{ fromTime: '09:00', toTime: '01:30' }] },
    friday: { times: [{ fromTime: '09:00', toTime: '17:30' }] },
    saturday: { times: ['Closed'] },
    sunday: { times: ['Closed'] },
  };
  const openingTimes = new OpeningTimes(syndicationOpeningTimes);
  describe('isOpen()', () => {
    it('should return true if time is inside opening times', () => {
      const date = getMoment('monday', 11, 30);
      expect(openingTimes.isOpen(date)).to.equal(true);
    });
    it('should return false if time is outside opening times', () => {
      const date = getMoment('monday', 18, 30);
      expect(openingTimes.isOpen(date)).to.equal(false);
    });
    describe('when passed a datetime in time zone other than Europe/London', () => {
      it('should return true if UTC time is inside opening times', () => {
        const date = moment('2016-07-25T08:00:00+00:00');
        expect(openingTimes.isOpen(date)).to.equal(true);
      });
    });
  });
  describe('nextOpen()', () => {
    it('when after days closing time should return following opening time', () => {
      const date = getMoment('monday', 18, 30);
      const expectedOpeningDateTime = getMoment('tuesday', 9, 0);
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when after fridays closing time should return mondays opening time', () => {
      const date = getMoment('friday', 18, 30);
      const expectedOpeningDateTime =
        moment(date)
          .add(3, 'days')
          .hours(9)
          .minutes(0);
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when currently open should return the passed date', () => {
      const date = getMoment('monday', 11, 30);
      const expectedOpeningDateTime = moment(date);
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
  });
  describe('nextClosed()', () => {
    it('when currently open should return todays closing time', () => {
      const date = getMoment('monday', 11, 30);
      const expectedClosingDateTime = getMoment('monday', 17, 30);
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('when currently closed should return the passed date', () => {
      const date = getMoment('monday', 21, 30);
      const expectedClosingDateTime = moment(date);
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('when closing time is after midnight should return tomorrows closing time', () => {
      const date = getMoment('thursday', 21, 30);
      const expectedClosingDateTime = getMoment('friday', 1, 30);
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
  });
  describe('getOpeningHoursMessage()', () => {
    it('when currently open should return open message', () => {
      const date = getMoment('monday', 11, 30);
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Open until 5:30 pm today');
    });
    it('when currently closed and opening tomorrow should return closed message', () => {
      const date = getMoment('monday', 7, 0);
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Closed until 9:00 am today');
    });
    it('when currently closed and opening in 2 hours should return closed message', () => {
      const date = getMoment('monday', 7, 0);
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Closed until 9:00 am today');
    });
    it('when currently closed and opening in 30 minutes should return closed message', () => {
      const date = getMoment('monday', 8, 30);
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Opening in 30 minutes');
    });
  });
  describe('formatOpeningTimes()', () => {
    const formattedOpeningTimes = openingTimes.getFormattedOpeningTimes();
    expect(formattedOpeningTimes.monday.times[0].fromTime).to.equal('9:00 am');
    expect(formattedOpeningTimes.monday.times[0].toTime).to.equal('5:30 pm');
  });
});
