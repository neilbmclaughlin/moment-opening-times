const moment = require('moment');
require('moment-timezone');

class OpeningTimes {
  constructor(openingTimes, timeZone) {
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
    return (daysOpeningTimes.length === 0);
  }

  isOpen(date) {
    const daysOpeningTimes = this.openingTimes[this.getDayName(date)];
    if (this.isClosedAllDay(daysOpeningTimes)) {
      return false;
    }
    return (daysOpeningTimes.some(
      (t) => this.timeInRange(date, t.opens, t.closes)
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

    const nextOpeningTime = this.openingTimes[day]
      .map((t) => this.createDateTime(dateTime, t.opens))
      .filter((t) => dateTime < t)[0];

    return nextOpeningTime;
  }

  getNextClosingTimeForDay(dateTime) {
    const day = this.getDayName(dateTime);

    const nextClosingTime = this.openingTimes[day]
      .map((t) => {
        const opens = this.createDateTime(dateTime, t.opens);
        const closes = this.createDateTime(dateTime, t.closes);
        // Check if closing time is in the following day
        if (closes.isBefore(opens)) {
          closes.add(1, 'day');
        }
        return closes;
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
      openingTimes[day] = this.openingTimes[day].map((t) =>
        ({
          opens: this.formatTime(t.opens),
          closes: this.formatTime(t.closes),
        })
      );
    });

    return openingTimes;
  }
}

module.exports = OpeningTimes;
