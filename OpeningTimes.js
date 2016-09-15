const daysOfTheWeek =
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

    let start = this.getTime(date, openTime.hours, openTime.minutes);
    let end = this.getTime(date, closeTime.hours, closeTime.minutes);

    if (end < start) {
      if (date.isSameOrBefore(end)) {
        start = start.subtract(1, 'day');
      } else {
        end = end.add(1, 'day');
      }
    }

    // console.log([date.format(), start.format(), end.format()]);
    return date.isBetween(start, end, null, '[]');
  }

  isOpen(date) {
    // TODO: handle multiple opening times during a day (e.g. when closed for lunch
    const daysOpeningTimes = this.openingTimes[this.getDayName(date)];
    return daysOpeningTimes.times[0] !== 'Closed' &&
      this.timeInRange(
      date,
      daysOpeningTimes.times[0].fromTime,
      daysOpeningTimes.times[0].toTime
    );
  }

  capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getNextOpeningTime(startDateTime, openingTimesForWeek) {
    const dateTime = moment(startDateTime);
    let dayCount = 0;
    do {
      dateTime.add(1, 'day');
      const day = dateTime.format('dddd').toLowerCase();
      if (openingTimesForWeek[day].times[0] !== 'Closed') {
        return this
          .createDateTime(dateTime, openingTimesForWeek[day].times[0].fromTime);
      }
      dayCount++;
    } while (dayCount < 7);
    return undefined;
  }

  getNextClosingTime(startDateTime, openingTimesForWeek) {
    const dateTime = moment(startDateTime);
    let dayCount = 0;
    do {
      const day = dateTime.format('dddd').toLowerCase();
      dateTime.add(1, 'day');
      if (openingTimesForWeek[day].times[0] !== 'Closed') {
        return this.createDateTime(dateTime, openingTimesForWeek[day].times[0].toTime);
      }
      dayCount++;
    } while (dayCount < 7);
    return undefined;
  }

  nextOpen(dateTime) {
    if (this.isOpen(dateTime)) {
      return dateTime;
    }

    const day = this.getDayName(dateTime);

    if (this.openingTimes[day].times[0] === 'Closed') {
      return this.getNextOpeningTime(dateTime, this.openingTimes);
    }

    const openingTime = this.createDateTime(dateTime, this.openingTimes[day].times[0].fromTime);

    return ((dateTime < openingTime) ?
      openingTime :
      this.getNextOpeningTime(dateTime, this.openingTimes));
  }

  nextClosed(dateTime) {
    if (!this.isOpen(dateTime)) {
      return dateTime;
    }
    const day = this.getDayName(dateTime);
    const closingTime = this.createDateTime(dateTime, this.openingTimes[day].times[0].toTime);
    return (dateTime < closingTime) ?
      closingTime :
      this.getNextClosingTime(dateTime, this.openingTimes);
  }

  getOpeningHoursMessage(datetime) {
    if (this.openingTimes === undefined) {
      return 'Opening times not known';
    }

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
    return 'Opening times not known';
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
    const openingTimes = JSON.parse(JSON.stringify(this.openingTimes));
    daysOfTheWeek.forEach((day) => {
      if (this.openingTimes && this.openingTimes[day].times[0] !== 'Closed') {
        openingTimes[day].times[0].fromTime = this.formatTime(openingTimes[day].times[0].fromTime);
        openingTimes[day].times[0].toTime = this.formatTime(openingTimes[day].times[0].toTime);
      }
    });
    return openingTimes;
  }
}

module.exports = OpeningTimes;
