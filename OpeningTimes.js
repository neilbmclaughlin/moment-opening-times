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

  /* Private methods - you could use them but they  are not part of the API
     and therefore any changes to them will not trigger a major version number */

  _getDayName(date) {
    return date.format('dddd').toLowerCase();
  }

  _getTime(date, hour, minute) {
    const returnDate = date.clone().tz(this.timeZone);
    returnDate.set({
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });

    return returnDate;
  }

  _getTimeFromString(timeString) {
    return {
      hours: parseInt(timeString.split(':')[0], 10),
      minutes: parseInt(timeString.split(':')[1], 10),
    };
  }

  _createDateTime(dateTime, timeString) {
    const time = this._getTimeFromString(timeString);
    return this._getTime(dateTime, time.hours, time.minutes).tz(this.timeZone);
  }

  _timeInRange(date, open, close) {
    const openTime = this._getTimeFromString(open);
    const closeTime = this._getTimeFromString(close);

    const start = this._getTime(date, openTime.hours, openTime.minutes);
    let end = this._getTime(date, closeTime.hours, closeTime.minutes);

    if (end < start) {
      // time spans midnight
      end = end.add(1, 'day');
    }

    return date.isBetween(start, end, null, '[]');
  }

  _isClosedAllDay(daysOpeningTimes) {
    return (daysOpeningTimes.length === 0);
  }


  _getNextOpeningTimeForWeek(startDateTime, openingTimesForWeek) {
    const dateTime = moment(startDateTime)
      .set({ hour: 0, minute: 0, second: 0 });

    const nextOpeningTime =
      [1, 2, 3, 4, 5, 6, 7]
        .filter((d) => {
          // Remove unknown and closed days
          const date = moment(dateTime).add(d, 'day');
          const day = date.format('dddd').toLowerCase();
          const daysOpeningTimes = openingTimesForWeek[day];
          return daysOpeningTimes && !this._isClosedAllDay(daysOpeningTimes);
        })
        .map((d) => {
          const date = moment(dateTime).add(d, 'day');
          return this._getNextOpeningTimeForDay(date);
        })[0];

    return nextOpeningTime;
  }

  _getNextOpeningTimeForDay(dateTime) {
    const day = this._getDayName(dateTime);

    const nextOpeningTime = this.openingTimes[day]
      .map((t) => this._createDateTime(dateTime, t.opens))
      .filter((t) => dateTime < t)[0];

    return nextOpeningTime;
  }

  _getNextClosingTimeForDay(dateTime) {
    const day = this._getDayName(dateTime);

    const nextClosingTime = this.openingTimes[day]
      .map((t) => {
        const opens = this._createDateTime(dateTime, t.opens);
        const closes = this._createDateTime(dateTime, t.closes);
        // Check if closing time is in the following day
        if (closes.isBefore(opens)) {
          closes.add(1, 'day');
        }
        return closes;
      })
      .filter((t) => dateTime < t)[0];

    return nextClosingTime;
  }

  _formatTime(timeString, formatString = 'h:mm a') {
    if (timeString === '00:00' || timeString === '23:59') {
      return 'midnight';
    }
    const aDate = moment('2016-07-25T00:00:00+01:00');
    const time = this._getTimeFromString(timeString);
    return this._getTime(aDate, time.hours, time.minutes).format(formatString);
  }

  /* Public API */

  isOpen(date) {
    const daysOpeningTimes = this.openingTimes[this._getDayName(date)];
    if (this._isClosedAllDay(daysOpeningTimes)) {
      return false;
    }
    return (daysOpeningTimes.some(
      (t) => this._timeInRange(date, t.opens, t.closes)
    ));
  }

  nextOpen(dateTime) {
    if (this.isOpen(dateTime)) {
      return dateTime;
    }

    const day = this._getDayName(dateTime);

    if (this._isClosedAllDay(this.openingTimes[day])) {
      return this._getNextOpeningTimeForWeek(dateTime, this.openingTimes);
    }

    return (
      this._getNextOpeningTimeForDay(dateTime) ||
      this._getNextOpeningTimeForWeek(dateTime, this.openingTimes)
    );
  }

  nextClosed(dateTime) {
    if (!this.isOpen(dateTime)) {
      return dateTime;
    }

    return this._getNextClosingTimeForDay(dateTime);
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

  getFormattedOpeningTimes(formatString) {
    const openingTimes = {};

    moment.weekdays().forEach((d) => {
      const day = d.toLowerCase();
      openingTimes[day] = this.openingTimes[day].map((t) =>
        ({
          opens: this._formatTime(t.opens, formatString),
          closes: this._formatTime(t.closes, formatString),
        })
      );
    });

    return openingTimes;
  }
}

module.exports = OpeningTimes;
