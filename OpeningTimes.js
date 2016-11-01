const assert = require('assert');
const util = require('util');
const Moment = require('moment');
require('moment-timezone');

const weekdays = require('moment').weekdays().map(d => d.toLowerCase());

class OpeningTimes {
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
    assert(Moment.tz.zone(timeZone), 'parameter \'timeZone\' not a valid timezone');
    this._openingTimes = openingTimes;
    this._timeZone = timeZone;
    this._alterations = alterations;

  }

  /* Private methods - you could use them but they  are not part of the API
     and therefore any changes to them will not trigger a major version number */

  _getDayName(moment) {

    return moment.format('dddd').toLowerCase();

  }

  _getTime(moment, hour, minute) {

    const returnDate = moment.clone().tz(this._timeZone);
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

  _createDateTime(moment, timeString) {

    const time = this._getTimeFromString(timeString);
    return this._getTime(moment, time.hours, time.minutes).tz(this._timeZone);

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

  _formatTime(timeString, formatString = 'h:mm a') {

    if (timeString === '00:00' || timeString === '23:59') {

      return 'midnight';

    }
    const aDate = new Moment('2016-07-25T00:00:00+01:00');
    const time = this._getTimeFromString(timeString);
    return this._getTime(aDate, time.hours, time.minutes).format(formatString);

  }

  _getOpeningTimesForDate(moment) {

    if (this._alterations) {

      // TODO: decide what to do if there is only >1 match
      const alterationMatch =
        Object.keys(this._alterations)
          .filter((a) => new Moment(a).tz(this._timeZone).isSame(moment, 'day'))[0];
      return alterationMatch ?
        this._alterations[alterationMatch] :
        this._openingTimes[this._getDayName(moment)];

    }
    return this._openingTimes[this._getDayName(moment)];

  }

  _getOpenSessions(moment) {

    // Get sessions for week (including yesterday for the cases where opening hours span midnight)
    return [-1, 0, 1, 2, 3, 4, 5, 6].map((d) => {

      const aDate = moment.clone().add(d, 'day');
      const openingTimes = this._getOpeningTimesForDate(aDate);
      return openingTimes
        .map((t) => {

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

  _getDateInSessionFinder(moment) {

    return (session) => (moment.isBetween(session.from, session.to, null, '[]'));

  }

  _getDateBeforeSessionFinder(moment) {

    return (session) => (moment.isBefore(session.from));

  }

  _findMomentInSessions(moment, sessions) {

    return sessions.some((day) => (day.some(this._getDateInSessionFinder(moment))));

  }

  _findNextOpeningTime(moment, sessions) {

    const nextDay = sessions
      .filter((day) => (!this._isClosedAllDay(day)))
      .find((day) => (day.some(this._getDateBeforeSessionFinder(moment))));

    if (nextDay) {

      const nextSession = nextDay.find(this._getDateBeforeSessionFinder(moment));
      return new Moment(nextSession.from).tz(this._timeZone);

    }

    return undefined;

  }

  _findNextClosingTime(moment, sessions) {

    const currentDay = sessions
      .find((day) => (day.some(this._getDateInSessionFinder(moment))));

    if (currentDay) {

      const thisSession = currentDay.find(this._getDateInSessionFinder(moment));
      return new Moment(thisSession.to).tz(this._timeZone);

    }

    return undefined;

  }
  /* Public API */

  isOpen(moment) {

    const sessions = this._getOpenSessions(moment);
    return this._findMomentInSessions(moment, sessions);

  }

  nextOpen(moment) {

    const allSessions = this._getOpenSessions(moment);
    if (this._findMomentInSessions(moment, allSessions)) {

      return moment;

    }
    return this._findNextOpeningTime(moment, allSessions);

  }

  nextClosed(moment) {

    const allSessions = this._getOpenSessions(moment);
    if (!this._findMomentInSessions(moment, allSessions)) {

      return moment;

    }

    return this._findNextClosingTime(moment, allSessions);

  }

  getOpeningHoursMessage(moment) {

    if (this.isOpen(moment)) {

      const closedNext = this.nextClosed(moment);
      const closedTime = closedNext.format('h:mm a');
      const closedDay = closedNext.calendar(moment, {
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
    const openNext = this.nextOpen(moment);
    if (!openNext) {

      return 'Call for opening times.';

    }
    const timeUntilOpen = openNext.diff(moment, 'minutes');
    const openDay = openNext.calendar(moment, {
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

    Moment.weekdays().forEach((d) => {

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
