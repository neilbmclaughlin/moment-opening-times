const chai = require('chai');
const OpeningTimes = require('../OpeningTimes');
const moment = require('moment');
require('moment-timezone');

const expect = chai.expect;
const aSunday = moment('2016-07-24T00:00:00+00:00');

function getMoment(day, hours, minutes, timeZone) {
  const dayNumber = moment.weekdays().map((d) => d.toLowerCase()).indexOf(day);
  const date = moment(aSunday).tz(timeZone);
  date.add(dayNumber, 'days').hours(hours).minutes(minutes);
  return date;
}

describe('OpeningTimes', () => {
  describe('constructor', () => {
    it('should not throw for valid parameters', () => {
      const openingTimesJson = {};
      expect(() => new OpeningTimes(openingTimesJson, 'Europe/London')).to.not.throw();
    });
    it('should assert opening times parameter is not missing', () => {
      expect(() => new OpeningTimes())
        .to.throw('AssertionError: parameter \'openingTimes\' undefined/empty');
    });
    it('should assert time zone parameter is not missing', () => {
      const openingTimesJson = {};
      expect(() => new OpeningTimes(openingTimesJson))
        .to.throw('AssertionError: parameter \'timeZone\' undefined/empty');
    });
    it('should assert time zone is parameter valid', () => {
      const openingTimesJson = {};
      expect(() => new OpeningTimes(openingTimesJson, 'Blah/Blah'))
        .to.throw('AssertionError: parameter \'timeZone\' is not a ' +
                  'valid TimeZone (Blah/Blah)');
    });
  });
  describe('isOpen()', () => {
    describe('single session (9:00 - 17:30)', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '17:30' },
          ],
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
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      it('should return false if time is during lunchtime', () => {
        const date = getMoment('monday', 13, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
      it('should return true if time is during the morning session', () => {
        const date = getMoment('monday', 10, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(true);
      });
      it('should return true if time is during the afternoon session', () => {
        const date = getMoment('monday', 14, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(true);
      });
      it('should return false if time is after the afternoon session', () => {
        const date = getMoment('monday', 18, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
      it('should return false if time is before the morning session', () => {
        const date = getMoment('monday', 8, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
    });
    describe('closed', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            'Closed',
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      it('should override all other session times', () => {
        const date = getMoment('monday', 10, 0, 'Europe/London');
        expect(openingTimes.isOpen(date)).to.equal(false);
      });
    });
    describe('with opening times in different time zones', () => {
      describe('Opening times - London 9:00 - 17:30', () => {
        const openingTimesJson = {
          monday: {
            times: [
              { fromTime: '09:00', toTime: '12:30' },
              { fromTime: '13:30', toTime: '17:30' },
            ],
          },
        };
        const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
        it('should return true for 8 am UTC time', () => {
          const date = getMoment('monday', 8, 0, 'UTC');
          expect(openingTimes.isOpen(date)).to.equal(true);
        });
      });
      describe('Opening times - Tokyo 9:00 - 17:30', () => {
        const openingTimesJson = {
          monday: {
            times: [
              { fromTime: '09:00', toTime: '12:30' },
              { fromTime: '13:30', toTime: '17:30' },
            ],
          },
        };
        const openingTimes = new OpeningTimes(openingTimesJson, 'Asia/Tokyo');
        it('should return true for 8 am London time', () => {
          const date = getMoment('monday', 8, 0, 'Europe/London');
          expect(openingTimes.isOpen(date)).to.equal(true);
        });
        it('should return false for 4 pm London time ', () => {
          const date = getMoment('monday', 11, 0, 'Europe/London');
          expect(openingTimes.isOpen(date)).to.equal(false);
        });
      });
    });
  });
  describe('nextOpen()', () => {
    it('when closed all week should return undefined', () => {
      const openingTimesJson = {
        monday: { times: ['Closed'] },
        tuesday: { times: ['Closed'] },
        wednesday: { times: ['Closed'] },
        thursday: { times: ['Closed'] },
        friday: { times: ['Closed'] },
        saturday: { times: ['Closed'] },
        sunday: { times: ['Closed'] },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 12, 40, 'Europe/London');
      expect(openingTimes.nextOpen(date)).to.equal(undefined);
    });
    it('when closed today should return start of tomorrows morning session', () => {
      const openingTimesJson = {
        monday: { times: ['Closed'] },
        tuesday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 12, 40, 'Europe/London');
      const expectedOpeningDateTime = getMoment('tuesday', 9, 0, 'Europe/London');
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when during lunchtime should return start of afternoon session', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 12, 40, 'Europe/London');
      const expectedOpeningDateTime = getMoment('monday', 13, 30, 'Europe/London');
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when during dinnertime should return start of evening session', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
            { fromTime: '18:30', toTime: '22:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 17, 40, 'Europe/London');
      const expectedOpeningDateTime = getMoment('monday', 18, 30, 'Europe/London');
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when before days opening time should return following opening time', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 8, 30, 'Europe/London');
      const expectedOpeningDateTime = getMoment('monday', 9, 0, 'Europe/London');
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when after days closing time should return following days opening time', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
        tuesday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 18, 30, 'Europe/London');
      const expectedOpeningDateTime = getMoment('tuesday', 9, 0, 'Europe/London');
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when after fridays closing time should return mondays opening time', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
        friday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
        saturday: { times: ['Closed'] },
        sunday: { times: ['Closed'] },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('friday', 18, 30, 'Europe/London');
      const expectedOpeningDateTime =
        moment(date)
          .add(3, 'days')
          .hours(9)
          .minutes(0);
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
    it('when currently open should return the passed datetime', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 11, 30, 'Europe/London');
      const expectedOpeningDateTime = moment(date);
      expect(openingTimes.nextOpen(date).format()).to.equal(expectedOpeningDateTime.format());
    });
  });
  describe('nextClosed()', () => {
    it('when during morning opening should return lunchtime closing', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 11, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('monday', 12, 30, 'Europe/London');
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('when during afternoon opening should return evening closing', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 15, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('monday', 17, 30, 'Europe/London');
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('when currently closed should return the passed date', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = moment(date);
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('should handle closing time of midnight', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '17:30' },
            { fromTime: '18:30', toTime: '00:00' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('tuesday', 0, 0, 'Europe/London');
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
    it('should handle closing time of after midnight', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '17:30' },
            { fromTime: '18:30', toTime: '01:00' },
          ],
        },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const date = getMoment('monday', 21, 30, 'Europe/London');
      const expectedClosingDateTime = getMoment('tuesday', 1, 0, 'Europe/London');
      expect(openingTimes.nextClosed(date).format()).to.equal(expectedClosingDateTime.format());
    });
  });
  describe('getOpeningHoursMessage()', () => {
    const openingTimesJson = {
      monday: {
        times: [
          { fromTime: '09:00', toTime: '12:30' },
          { fromTime: '13:30', toTime: '17:30' },
          { fromTime: '18:30', toTime: '00:00' },
        ],
      },
      tuesday: {
        times: [
          { fromTime: '09:00', toTime: '12:30' },
          { fromTime: '13:30', toTime: '17:30' },
        ],
      },
      wednesday: {
        times: [
          { fromTime: '09:00', toTime: '12:30' },
          { fromTime: '13:30', toTime: '17:30' },
        ],
      },
    };
    const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
    it('when currently open should return open message', () => {
      const date = getMoment('monday', 13, 30, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Open until 5:30 pm today');
    });
    it('when currently open and closing at 00:00 should return midnight message', () => {
      const date = getMoment('monday', 19, 30, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Open until midnight');
    });
    it('when currently closed and opening tomorrow should return closed message', () => {
      const date = getMoment('tuesday', 18, 0, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Closed until 9:00 am tomorrow');
    });
    it('when currently closed and opening in 2 hours should return closed message', () => {
      const date = getMoment('monday', 7, 0, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Closed until 9:00 am today');
    });
    it('when currently closed and opening in 30 minutes should return closed message', () => {
      const date = getMoment('monday', 8, 30, 'Europe/London');
      expect(openingTimes.getOpeningHoursMessage(date)).to.equal('Opening in 30 minutes');
    });
    it('when closed all week the should return unknown opening time message', () => {
      const closedTimesJson = {
        monday: { times: ['Closed'] },
        tuesday: { times: ['Closed'] },
        wednesday: { times: ['Closed'] },
        thursday: { times: ['Closed'] },
        friday: { times: ['Closed'] },
        saturday: { times: ['Closed'] },
        sunday: { times: ['Closed'] },
      };
      const date = getMoment('monday', 8, 30, 'Europe/London');
      const closedTimes = new OpeningTimes(closedTimesJson, 'Europe/London');
      expect(closedTimes.getOpeningHoursMessage(date))
        .to.equal('The next opening time is unknown.');
    });
  });
  describe('formatOpeningTimes()', () => {
    it('times should be returned as am/pm', () => {
      const openingTimesJson = {
        monday: {
          times: [
            { fromTime: '09:00', toTime: '12:30' },
            { fromTime: '13:30', toTime: '17:30' },
            { fromTime: '18:30', toTime: '00:00' },
          ],
        },
        tuesday: { times: ['Closed'] },
        wednesday: { times: ['Closed'] },
        thursday: { times: ['Closed'] },
        friday: { times: ['Closed'] },
        saturday: { times: ['Closed'] },
        sunday: { times: ['Closed'] },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const formattedOpeningTimes = openingTimes.getFormattedOpeningTimes();
      expect(formattedOpeningTimes.monday.times[0].fromTime).to.equal('9:00 am');
      expect(formattedOpeningTimes.monday.times[0].toTime).to.equal('12:30 pm');
      expect(formattedOpeningTimes.monday.times[1].fromTime).to.equal('1:30 pm');
      expect(formattedOpeningTimes.monday.times[1].toTime).to.equal('5:30 pm');
      expect(formattedOpeningTimes.monday.times[2].fromTime).to.equal('6:30 pm');
      expect(formattedOpeningTimes.monday.times[2].toTime).to.equal('midnight');
    });
    it('should handle closed all week', () => {
      const openingTimesJson = {
        monday: { times: ['Closed'] },
        tuesday: { times: ['Closed'] },
        wednesday: { times: ['Closed'] },
        thursday: { times: ['Closed'] },
        friday: { times: ['Closed'] },
        saturday: { times: ['Closed'] },
        sunday: { times: ['Closed'] },
      };
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const formattedOpeningTimes = openingTimes.getFormattedOpeningTimes();
      expect(formattedOpeningTimes.monday.times[0]).to.equal('Closed');
    });
  });
});
