# moment-opening-times


[![Build Status](https://travis-ci.org/nhsuk/moment-opening-times.svg?branch=master)](https://travis-ci.org/nhsuk/moment-opening-times)
[![bitHound Dependencies](https://www.bithound.io/github/nhsuk/moment-opening-times/badges/dependencies.svg)](https://www.bithound.io/github/nhsuk/moment-opening-times/master/dependencies/npm)
[![bitHound Dev Dependencies](https://www.bithound.io/github/nhsuk/moment-opening-times/badges/devDependencies.svg)](https://www.bithound.io/github/nhsuk/moment-opening-times/master/dependencies/npm)
[![Coverage Status](https://coveralls.io/repos/github/nhsuk/moment-opening-times/badge.svg?branch=master)](https://coveralls.io/github/nhsuk/moment-opening-times?branch=master)

A small class to determine the status of a given [moment](http://momentjs.com/) in relation to a set of opening times

## Usage

```
    const OpeningTimes = require('moment-opening-times');
    const moment = require('moment');
    const util = require('util');

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
      wednesday: {
        times: [
          { fromTime: '09:00', toTime: '12:30' },
          { fromTime: '13:30', toTime: '17:30' },
        ],
      },
      thursday: {
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
      saturday: {
        times: [
          { fromTime: '09:00', toTime: '12:30' },
          { fromTime: '13:30', toTime: '17:30' },
        ],
      },
      sunday: { times: ['Closed'] },
    };
  const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');

  const date = moment('2016-07-25T10:00:00+01:00');
  console.log(openingTimes.isOpen(moment('2016-07-25T10:00:00+01:00'))); //true
  console.log(openingTimes.nextOpen(moment('2016-07-25T07:00:00+01:00')).format()); //2016-07-25T09:00:00+01:00
  console.log(openingTimes.nextClosed(moment('2016-07-25T10:00:00+01:00')).format()); //2016-07-25T12:30:00+01:00
  console.log(openingTimes.getOpeningHoursMessage(moment('2016-07-25T10:00:00+01:00'))); //Open until 12:30 pm today
  console.log(util.inspect(openingTimes.getFormattedOpeningTimes(),{showHidden: false, depth: null}));
/*
{ monday:
   { times:
      [ { fromTime: '9:00 am', toTime: '12:30 pm' },
        { fromTime: '1:30 pm', toTime: '5:30 pm' } ] },
  tuesday:
   { times:
      [ { fromTime: '9:00 am', toTime: '12:30 pm' },
        { fromTime: '1:30 pm', toTime: '5:30 pm' } ] },
  wednesday:
   { times:
      [ { fromTime: '9:00 am', toTime: '12:30 pm' },
        { fromTime: '1:30 pm', toTime: '5:30 pm' } ] },
  thursday:
   { times:
      [ { fromTime: '9:00 am', toTime: '12:30 pm' },
        { fromTime: '1:30 pm', toTime: '5:30 pm' } ] },
  friday:
   { times:
      [ { fromTime: '9:00 am', toTime: '12:30 pm' },
        { fromTime: '1:30 pm', toTime: '5:30 pm' } ] },
  saturday:
   { times:
      [ { fromTime: '9:00 am', toTime: '12:30 pm' },
        { fromTime: '1:30 pm', toTime: '5:30 pm' } ] },
  sunday: { times: [ 'Closed' ] } }
*/
```

See also the [tests](test/OpeningTimes.js)


