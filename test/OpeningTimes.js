const chai = require('chai');
const OpeningTimes = require('../OpeningTimes');
const moment = require('moment');
require('moment-timezone');
// TODO: The DaysOfTheWeek list is duplicated in OpeningTimes.
// We could probably use the moment day of week functionality to remove the need for this.
const DaysOfTheWeek =
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const expect = chai.expect;
const aMonday = moment('2016-07-25T00:00:00+00:00');

function getMoment(day, hours, minutes, timeZone) {
  const dayNumber = DaysOfTheWeek.indexOf(day);
  const date = moment(aMonday).tz(timeZone);
  date.add(dayNumber, 'days').hours(hours).minutes(minutes);
  return date;
}

describe('OpeningTimes', () => {
  const syndicationOpeningTimes = {
    monday: { times: [{ fromTime: '09:00', toTime: '17:30' }] },
    tuesday: { times: [{ fromTime: '09:00', toTime: '17:30' }] },
    wednesday: { 
      times: [
        { fromTime: '09:00', toTime: '12:00' },
        { fromTime: '13:00', toTime: '17:30' }
      ] 
    },
    thursday: { times: [{ fromTime: '09:00', toTime: '01:30' }] },
    friday: { times: [{ fromTime: '09:00', toTime: '17:30' }] },
    saturday: { times: ['Closed'] },
    sunday: { times: ['Closed'] },
  };
  const openingTimes = new OpeningTimes(syndicationOpeningTimes, 'Europe/London');
  describe('isOpen()', () => {
    describe('single session (9:00 - 17:30)', () => {
      const openingTimesJson = {
        monday: { 
          times: [
            { fromTime: '09:00', toTime: '17:30' }
          ] 
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      it('should return true if time is inside opening times', () => {
        const date = getMoment('monday', 11, 30, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(true);
      });
      it('should return false if time is outside opening times', () => {
        const date = getMoment('monday', 18, 30, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
    });
    describe('split sessions (9:00 - 12:30, 13:30 - 17:30)', () => {
      const openingTimesJson = {
        monday: { 
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' }
          ] 
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      it('should return false is time is during lunchtime', () => {
        const date = getMoment('monday', 13, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
      it('should return true is time is during the morning session', () => {
        const date = getMoment('monday', 10, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(true);
      });
      it('should return true is time is during the afternoon session', () => {
        const date = getMoment('monday', 14, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(true);
      });
      it('should return false is time is after the afternoon session', () => {
        const date = getMoment('monday', 18, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
      it('should return false is time is before the morning session', () => {
        const date = getMoment('monday', 8, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
    });
    describe('Closed', () => {
      const openingTimesJson = {
        monday: { 
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            'Closed'
          ] 
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      it('Closed overrides all other session times', () => {
        const date = getMoment('monday', 10, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
    });
    describe('with opening times in different time zones', () => {
      describe('Opening times - London 9:00 - 17:30', () => {
        it('should return true for 8 am UTC time', () => {
          const date = getMoment('monday', 8, 0, 'UTC');
          expect(openingTimes.isOpen(date)).to.equal(true);
        });
      });
      describe('Opening times - Tokyo 9:00 - 17:30', () => {
        const tokyoOpeningTimes = new OpeningTimes(syndicationOpeningTimes, 'Asia/Tokyo');
        it('should return true for 8 am London time', () => {
          const date = getMoment('monday', 8, 0, 'Europe/London');
          expect(tokyoOpeningTimes.isOpen(date)).to.equal(true);
        });
        it('should return false for 4 pm London time ', () => {
          const date = getMoment('monday', 11, 0, 'Europe/London');
          expect(tokyoOpeningTimes.isOpen(date)).to.equal(false);
        });
      });
    });
  });
  describe('nextOpen()', () => {
    it('when after days closing time should return following opening time', () => {
      const date = getMoment('monday', 18, 30, 'Europe/London');
      const expectedOpeningDateTime = getMoment('tuesday', 9, 0, 'Europe/London');
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when after fridays closing time should return mondays opening time', () => {
      const date = getMoment('friday', 18, 30, 'Europe/London');
      const expectedOpeningDateTime =
        moment(date)
          .add(3, 'days')
          .hours(9)
          .minutes(0);
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when currently open should return the passed date', () => {
      const date = getMoment('monday', 11, 30, 'Europe/London');
      const expectedOpeningDateTime = moment(date);
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
  });
  describe('nextClosed()', () => {
    it('when currently open should return todays closing time', () => {
      const date = getMoment('monday', 11, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('monday', 17, 30, 'Europe/London');
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('when currently closed should return the passed date', () => {
      const date = getMoment('monday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = moment(date);
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('when closing time is after midnight should return tomorrows closing time', () => {
      const date = getMoment('thursday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('friday', 1, 30, 'Europe/London');
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
  });
  describe('getOpeningHoursMessage()', () => {
    it('when currently open should return open message', () => {
      const date = getMoment('monday', 11, 30, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Open until 5:30 pm today');
    });
    it('when currently closed and opening tomorrow should return closed message', () => {
      const date = getMoment('monday', 7, 0, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Closed until 9:00 am today');
    });
    it('when currently closed and opening in 2 hours should return closed message', () => {
      const date = getMoment('monday', 7, 0, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Closed until 9:00 am today');
    });
    it('when currently closed and opening in 30 minutes should return closed message', () => {
      const date = getMoment('monday', 8, 30, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Opening in 30 minutes');
    });
  });
  describe('formatOpeningTimes()', () => {
    const formattedOpeningTimes = openingTimes.getFormattedOpeningTimes();
    expect(formattedOpeningTimes.monday.times[0].fromTime).to.equal('9:00 am');
    expect(formattedOpeningTimes.monday.times[0].toTime).to.equal('5:30 pm');
  });
});
