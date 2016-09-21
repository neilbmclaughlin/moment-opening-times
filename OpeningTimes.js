const moment = require('moment');
require('moment-timezone');
const assert = require('assert');

class OpeningTimes {
  constructor(openingTimes, timeZone) {
    assert(openingTimes, 'parameter \'openingTimes\' undefined/empty');
    assert(timeZone, 'parameter \'timeZone\' undefined/empty');
    assert(timeZone, 'Missing TimeZone');
    assert(moment.tz.zone(timeZone),
      `parameter \'timeZone\' is not a valid TimeZone (${timeZone})`);

    this.openingTimes = openingTimes;
    this.timeZone = timeZone;
  }

  getDayName(date) {
    return date.format('dddd').toLowerCase();
  }

  getTime(date, hour, minute) {
    const returnDate = date.clone().tz(this.timeZone);
    returnDate.set({
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });

    return returnDate;
  }

  getTimeFromString(timeString) {
    return {
      hours: parseInt(timeString.split(':')[0], 10),
      minutes: parseInt(timeString.split(':')[1], 10),
    };
  }

  createDateTime(dateTime, timeString) {
    const time = this.getTimeFromString(timeString);
    return this.getTime(dateTime, time.hours, time.minutes).tz(this.timeZone);
  }

  timeInRange(date, open, close) {
    const openTime = this.getTimeFromString(open);
    const closeTime = this.getTimeFromString(close);

    const start = this.getTime(date, openTime.hours, openTime.minutes);
    let end = this.getTime(date, closeTime.hours, closeTime.minutes);

    if (end < start) {
      // time spans midnight
      end = end.add(1, 'day');
    }

    return date.isBetween(start, end, null, '[]');
  }

  isClosedAllDay(daysOpeningTimes) {
    return (daysOpeningTimes.times.some((t) => t === 'Closed'));
  }

  isOpen(date) {
    const daysOpeningTimes = this.openingTimes[this.getDayName(date)];
    if (this.isClosedAllDay(daysOpeningTimes)) {
      return false;
    }
    return (daysOpeningTimes.times.some(
      (t) => this.timeInRange(date, t.fromTime, t.toTime)
    ));
  }

  getNextOpeningTimeForWeek(startDateTime, openingTimesForWeek) {
    const dateTime = moment(startDateTime)
      .set({ hour: 0, minute: 0, second: 0 });

    const nextOpeningTime =
      [1, 2, 3, 4, 5, 6, 7]
        .filter((d) => {
          // Remove unknown and closed days
          const date = moment(dateTime).add(d, 'day');
          const day = date.format('dddd').toLowerCase();
          const daysOpeningTimes = openingTimesForWeek[day];
          return daysOpeningTimes && !this.isClosedAllDay(daysOpeningTimes);
        })
        .map((d) => {
          const date = moment(dateTime).add(d, 'day');
          return this.getNextOpeningTimeForDay(date);
        })[0];

    return nextOpeningTime;
  }

  nextOpen(dateTime) {
    if (this.isOpen(dateTime)) {
      return dateTime;
    }

    const day = this.getDayName(dateTime);

    if (this.isClosedAllDay(this.openingTimes[day])) {
      return this.getNextOpeningTimeForWeek(dateTime, this.openingTimes);
    }

    return (
      this.getNextOpeningTimeForDay(dateTime) ||
      this.getNextOpeningTimeForWeek(dateTime, this.openingTimes)
    );
  }

  getNextOpeningTimeForDay(dateTime) {
    const day = this.getDayName(dateTime);

    const nextOpeningTime = this.openingTimes[day].times
      .map((t) => this.createDateTime(dateTime, t.fromTime))
      .filter((t) => dateTime < t)[0];

    return nextOpeningTime;
  }

  getNextClosingTimeForDay(dateTime) {
    const day = this.getDayName(dateTime);

    const nextClosingTime = this.openingTimes[day].times
      .map((t) => {
        const fromTime = this.createDateTime(dateTime, t.fromTime);
        const toTime = this.createDateTime(dateTime, t.toTime);
        // Check if closing time is in the following day
        if (toTime.isBefore(fromTime)) {
          toTime.add(1, 'day');
        }
        return toTime;
      })
      .filter((t) => dateTime < t)[0];

    return nextClosingTime;
  }

  nextClosed(dateTime) {
    if (!this.isOpen(dateTime)) {
      return dateTime;
    }

    return this.getNextClosingTimeForDay(dateTime);
  }

  getOpeningHoursMessage(datetime) {
    if (this.isOpen(datetime)) {
      const closedNext = this.nextClosed(datetime);
      const closedTime = closedNext.format('h:mm a');
      const closedDay = closedNext.calendar(datetime, {
        sameDay: '[today]',
        nextDay: '[tomorrow]',
        nextWeek: 'dddd',
        lastDay: '[yesterday]',
        lastWeek: '[last] dddd',
        sameElse: 'DD/MM/YYYY',
      });
      return (
        ((closedDay === 'tomorrow' && closedTime === '12:00 am')
          || (closedDay === 'today' && closedTime === '11:59 pm')) ?
        'Open until midnight' :
        `Open until ${closedTime} ${closedDay}`);
    }
    const openNext = this.nextOpen(datetime);

    if (openNext) {
      const timeUntilOpen = openNext.diff(datetime, 'minutes');
      const openDay = openNext.calendar(datetime, {
        sameDay: '[today]',
        nextDay: '[tomorrow]',
        nextWeek: 'dddd',
        lastDay: '[yesterday]',
        lastWeek: '[last] dddd',
        sameElse: 'DD/MM/YYYY',
      });
      return (
	(timeUntilOpen <= 60) ?
        `Opening in ${timeUntilOpen} minutes` :
        `Closed until ${openNext.format('h:mm a')} ${openDay}`);
    }
    return 'The next opening time is unknown.';
  }

  formatTime(timeString) {
    const aDate = moment('2016-07-25T00:00:00+01:00');
    const time = this.getTimeFromString(timeString);
    const formattedTime = this.getTime(aDate, time.hours, time.minutes).format('h:mm a');
    if (formattedTime === '12:00 am' || formattedTime === '11:59 pm') {
      return 'midnight';
    }
    return formattedTime;
  }

  getFormattedOpeningTimes() {
    const openingTimes = {};

    moment.weekdays().forEach((d) => {
      const day = d.toLowerCase();
      openingTimes[day] = {
        times: this.openingTimes[day].times.map((t) => {
          if (t === 'Closed') {
            return 'Closed';
          }
          return {
            fromTime: this.formatTime(t.fromTime),
            toTime: this.formatTime(t.toTime),
          };
        }),
      };
    });

    return openingTimes;
  }
}

module.exports = OpeningTimes;
