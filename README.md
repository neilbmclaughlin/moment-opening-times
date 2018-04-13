# moment-opening-times

[![GitHub Release](https://img.shields.io/github/release/nhsuk/moment-opening-times.svg)](https://github.com/nhsuk/moment-opening-times/releases/latest/)
[![npm version](https://badge.fury.io/js/moment-opening-times.svg)](https://badge.fury.io/js/moment-opening-times)
[![Greenkeeper badge](https://badges.greenkeeper.io/nhsuk/moment-opening-times.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/nhsuk/moment-opening-times.svg?branch=master)](https://travis-ci.org/nhsuk/moment-opening-times)
[![Coverage Status](https://coveralls.io/repos/github/nhsuk/moment-opening-times/badge.svg?branch=master)](https://coveralls.io/github/nhsuk/moment-opening-times?branch=master)

> Given a set of opening times (with optional alternative opening times) return a status indicating openness.

## Installation

To install the package run:

* npm - `npm install moment-opening-times --save`
* yarn - `yarn add moment-opening-times`

This package relies upon several other packages. These are the
[Peer Dependencies](https://nodejs.org/en/blog/npm/peer-dependencies/).
To get a list of the peerDependencies run the following command:

```
npm info moment-opening-times peerDependencies
```

All peerDependencies need to be installed.

## Usage

The class is instantiated with 3 arguments. The third argument is optional and
represents a set of opening times classified as alterations. Once instantiated
the function `getStatus` is passed the current time and an optional options object.
Currently the only valid option is a boolean field - `next`. When
`next` set to a truthy value the returned object will contain 2 additional
fields, `nextClosed` and `nextOpen`. Both fields are a
[moment with a time zone](https://momentjs.com/timezone/docs/#/using-timezones/parsing-in-zone/)
indicating the next time the place is closed and open, respectively.

### Example usage

Given the open hours of a place is represented by the following set of opening times:
```js
const openingTimes =
{
  sunday:    [ { opens: '09:00', closes: '17:30' } ],
  monday:    [ { opens: '08:00', closes: '11:00' }, { opens: '13:00', closes: '15:00' }, { opens: '17:00', closes: '19:00' } ],
  tuesday:   [ { opens: '09:00', closes: '17:30' } ],
  wednesday: [ { opens: '09:00', closes: '12:00' }, { opens: '14:00', closes: '18:00' } ],
  thursday:  [ { opens: '09:00', closes: '17:00' }, { opens: '18:00', closes: '21:00' } ],
  friday:    [ { opens: '09:00', closes: '17:30' } ],
  saturday:  [ { opens: '09:00', closes: '17:30' } ],
}
```

In order to find out if the place is open now in the `Europe/London` time zone
the following code can be used:
```js
const moment = require('moment');
const OpeningTimes = require('moment-opening-times');

const now = moment();
const openingTimesMoment = new OpeningTimes(openingTimes, 'Europe/London');

const status = openingTimesMoment.getStatus(now);
```

If we wanted to know whether the place was open at 23:59:59 on 31/12/2020 in
`Indian/Christmas` the code would be:
```js
const moment = require('moment');
const OpeningTimes = require('moment-opening-times');

const dateToCheck = moment('2020-12-31 23:59:59');
const openingTimesMoment = new OpeningTimes(openingTimes, 'Indian/Christmas');

const status = openingTimesMoment.getStatus(dateToCheck);
```

For more detailed use cases, check out the [test suite](test/).
