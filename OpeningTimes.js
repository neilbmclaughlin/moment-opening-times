const assert = require('assert');
const util = require('util');
const Moment = require('moment');
const removePastAlterations = require('./src/lib/removePastAlterations');
require('moment-timezone');

const weekdays = require('moment').weekdays().map(d => d.toLowerCase());

class OpeningTimes {
  constructor(openingTimes, timeZone, alterations) {
    assert(openingTimes, 'parameter \'openingTimes\' undefined/empty');
    const parameterWeek = Object.keys(openingTimes).sort();
    assert.deepEqual(
      parameterWeek, weekdays.sort(),
      `parameter 'openingTimes' should have all days of the week (${parameterWeek})`
    );
    assert(
      weekdays.every(d => Array.isArray(openingTimes[d])),
      'parameter \'openingTimes\' should define opening times for each day.' +
      ` (${util.inspect(openingTimes)})`
    );

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
    returnDate.startOf('hour').hour(hour).minute(minute);

    return returnDate;
  }

  _getTimeFromString(timeString) {
    const timeSplit = timeString.split(':');
    return {
      hours: parseInt(timeSplit[0], 10),
      minutes: parseInt(timeSplit[1], 10),
    };
  }

  _createDateTime(moment, timeString) {
    const time = this._getTimeFromString(timeString);
    return this._getTime(moment, time.hours, time.minutes);
  }

  _isClosedAllDay(daysOpeningTimes) {
    return (daysOpeningTimes.length === 0);
  }

  _formatTime(timeString, formatString = 'h:mm a') {
    if (timeString === '00:00' || timeString === '23:59') {
      return 'midnight';
    }
    const aDate = Moment();
    const time = this._getTimeFromString(timeString);
    return this._getTime(aDate, time.hours, time.minutes).format(formatString);
  }

  _getOpeningTimesForDate(moment) {
    const alterations = removePastAlterations(this._alterations, moment);
    if (alterations) {
      // TODO: decide what to do if there is only >1 match
      const momentDate = moment.format('YYYY-MM-DD');
      const todaysAlteration = Object.keys(alterations).find(a => a === momentDate);

      return todaysAlteration ?
        alterations[todaysAlteration] :
        this._openingTimes[this._getDayName(moment)];
    }
    return this._openingTimes[this._getDayName(moment)];
  }

  _getOpeningTimesSessionForMoment(moment, daysLookAhead) {
    for (let day = daysLookAhead - 1; day >= -1; day -= 1) {
      const aMoment = moment.clone().add(day, 'day');
      const openingTimes = this._getOpeningTimesForDate(aMoment);

      for (let j = 0; j < openingTimes.length; j += 1) {
        const t = openingTimes[j];
        const from = this._createDateTime(aMoment, t.opens);
        const to = this._createDateTime(aMoment, t.closes);

        if (to < from) {
          to.add(1, 'day');
        }

        if (moment.isBetween(from, to, null, '[)')) {
          return { from, to };
        }
      }
    }
    return undefined;
  }

  _getOpenSessions(moment, days) {
    // Get sessions for week (including yesterday for the cases where opening hours span midnight)
    return days.map((d) => {
      const aDate = moment.clone().add(d, 'day');
      const openingTimes = this._getOpeningTimesForDate(aDate);
      return openingTimes
        .map((t) => {
          const from = this._createDateTime(aDate, t.opens);
          const to = this._createDateTime(aDate, t.closes);

          if (to < from) {
            to.add(1, 'day');
          }

          return { from, to };
        });
    });
  }

  _getDateInSessionFinder(moment) {
    return session => (moment.isBetween(session.from, session.to, null, '[)'));
  }

  _getDateBeforeSessionFinder(moment) {
    return session => (moment.isBefore(session.from));
  }

  _findMomentInSessions(moment, sessions) {
    return sessions.some(day => (day.some(this._getDateInSessionFinder(moment))));
  }

  _findNextOpeningTime(moment, sessions) {
    const nextDay = sessions
      .filter(day => (!this._isClosedAllDay(day)))
      .find(day => (day.some(this._getDateBeforeSessionFinder(moment))));

    if (nextDay) {
      return nextDay.find(this._getDateBeforeSessionFinder(moment)).from;
    }

    return undefined;
  }

  _nextOpen(moment) {
    const allSessions = this._getOpenSessions(moment, [0, 1, 2, 3, 4, 5, 6]);
    if (this._findMomentInSessions(moment, allSessions)) {
      return moment;
    }
    return this._findNextOpeningTime(moment, allSessions);
  }

  /* Public API */

  getStatus(moment, options = {}) {
    const returnValue = { moment };

    const session = this._getOpeningTimesSessionForMoment(moment, 1);
    returnValue.isOpen = (session !== undefined);
    if (options.next) {
      if (returnValue.isOpen) {
        returnValue.nextClosed = session.to;
        returnValue.nextOpen = moment;
      } else {
        returnValue.nextClosed = moment;
        returnValue.nextOpen = this._nextOpen(moment);
      }
    }

    return returnValue;
  }

  getFormattedOpeningTimes(formatString) {
    const openingTimes = {};

    Moment.weekdays().forEach((d) => {
      const day = d.toLowerCase();
      openingTimes[day] = this._openingTimes[day].map(t => (
        {
          opens: this._formatTime(t.opens, formatString),
          closes: this._formatTime(t.closes, formatString),
        }));
    });

    return openingTimes;
  }
}

module.exports = OpeningTimes;
