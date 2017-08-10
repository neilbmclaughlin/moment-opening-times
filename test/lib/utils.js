const moment = require('moment');

const alterationDateKeyFormat = 'YYYY-MM-DD';

function alterations(daysToChange) {
  const dateString = moment().add(daysToChange, 'day').format(alterationDateKeyFormat);

  const returnValue = {};
  returnValue[dateString] = [];
  return returnValue;
}

function alterationsPast() {
  return alterations(-1);
}

function alterationsPresent() {
  return alterations(0);
}

function alterationsFuture() {
  return alterations(1);
}

function alterationsPresentAndFuture() {
  return Object.assign({}, alterationsPresent(), alterationsFuture());
}

function alterationsPastPresentAndFuture() {
  return Object.assign({}, alterationsPast(), alterationsPresent(), alterationsFuture());
}

module.exports = {
  alterationsPast,
  alterationsPresent,
  alterationsFuture,
  alterationsPresentAndFuture,
  alterationsPastPresentAndFuture,
};
