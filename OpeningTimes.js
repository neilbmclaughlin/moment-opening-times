const assert = require('assert');
const util = require('util');
const moment = require('moment');
require('moment-timezone');

const weekdays = require('moment').weekdays().map(d => d.toLowerCase());

class OpeningTimes {
// TODO: Change order of parameters or use named parameter collection
  constructor(openingTimes, timeZone, alterations) {
    assert(openingTimes, 'parameter \'openingTimes\' undefined/empty');
    const parameterWeek = Object.keys(openingTimes).sort();
    assert.deepEqual(
      parameterWeek, weekdays.sort(),
      `parameter 'openingTimes' should have all days of the week (${parameterWeek})`);
    assert(
      weekdays.every((d) => Array.isArray(openingTimes[d])),
      'parameter \'openingTimes\' should define opening times for each day.' +
      ` (${util.inspect(openingTimes)})`);

    assert(timeZone, 'parameter \'timeZone\' undefined/empty');
    assert(moment.tz.zone(timeZone), 'parameter \'timeZone\' not a valid timezone');
    this._openingTimes = openingTimes;
    this._timeZone = timeZone;
    this._alterations = alterations;
  }

  /* Private methods - you could use them but they  are not part of the API
     and therefore any changes to them will not trigger a major version number */

  _getDayName(date) {
    return date.format('dddd').toLowerCase();
  }

  _getTime(date, hour, minute) {
    const returnDate = date.clone().tz(this._timeZone);
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
    return this._getTime(dateTime, time.hours, time.minutes).tz(this._timeZone);
  }

  _timeInRange(referenceDate, openingHoursDate, open, close) {
    const openTime = this._getTimeFromString(open);
    const closeTime = this._getTimeFromString(close);

    const start = this._getTime(openingHoursDate, openTime.hours, openTime.minutes);
    let end = this._getTime(openingHoursDate, closeTime.hours, closeTime.minutes);

    if (end < start) {
      // time spans midnight
      end = end.add(1, 'day');
    }

    return referenceDate.isBetween(start, end, null, '[]');
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
    const nextOpeningTime = this._getOpeningTimesForDate(dateTime)
      .map((t) => this._createDateTime(dateTime, t.opens))
      .filter((t) => dateTime < t)[0];

    return nextOpeningTime;
  }

  _getNextClosingTimeForDay(dateTime) {
    const nextClosingTime = this._getOpeningTimesForDate(dateTime)
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

  _getOpeningTimesForDate(date) {
    if (this._alterations) {
      // TODO: decide what to do if there is only >1 match
      const alterationMatch =
        Object.keys(this._alterations)
          .filter((a) => moment(a).isSame(date, 'day'))[0];
      return alterationMatch ?
        this._alterations[alterationMatch] :
        this._openingTimes[this._getDayName(date)];
    }
    return this._openingTimes[this._getDayName(date)];
  }

  _getOpenSessions(date) {
    // Get sessions for today and yesterday for the cases where opening hours span midnight
    return [-1, 0].map((d) => {
      const aDate = date.clone().add(d, 'day');
      const openingTimes = this._getOpeningTimesForDate(aDate);
      return openingTimes.map((t) => {
        const from = this._createDateTime(aDate, t.opens);
        const to = this._createDateTime(aDate, t.closes);

        if (to < from) {
          to.add(1, 'day');
        }

        return {
          from: from.format(),
          to: to.format(),
        };
      });
    });
  }

  _findMomentInSessions(date, sessions) {
    return sessions
      .some((day) =>
       (day.some((session) => (date.isBetween(session.from, session.to, null, '[]'))))
      );
  }

  /* Public API */

  isOpen(date) {
    const sessions = this._getOpenSessions(date);
    return this._findMomentInSessions(date, sessions);
  }

  nextOpen(dateTime) {
    if (this.isOpen(dateTime)) {
      return dateTime;
    }

    const day = this._getDayName(dateTime);

    if (this._isClosedAllDay(this._openingTimes[day])) {
      return this._getNextOpeningTimeForWeek(dateTime, this._openingTimes);
    }

    return (
      this._getNextOpeningTimeForDay(dateTime) ||
      this._getNextOpeningTimeForWeek(dateTime, this._openingTimes)
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
    if (!openNext) {
      return 'Call for opening times.';
    }
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

  getFormattedOpeningTimes(formatString) {
    const openingTimes = {};

    moment.weekdays().forEach((d) => {
      const day = d.toLowerCase();
      openingTimes[day] = this._openingTimes[day].map((t) =>
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
