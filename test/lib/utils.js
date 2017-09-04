const alterationDateKeyFormat = 'YYYY-MM-DD';

// eslint-disable-next-line no-underscore-dangle
function _alterations(moment, daysToChange) {
  const dateString = moment.clone().add(daysToChange, 'day').format(alterationDateKeyFormat);

  const returnValue = {};
  returnValue[dateString] = [];
  return returnValue;
}

function alterationsPast(moment) {
  return _alterations(moment, -1);
}

function alterationsPresent(moment) {
  return _alterations(moment, 0);
}

function alterationsFuture(moment) {
  return _alterations(moment, 1);
}

function alterationsPresentAndFuture(moment) {
  return Object.assign({}, alterationsPresent(moment), alterationsFuture(moment));
}

function alterationsPastPresentAndFuture(moment) {
  return Object.assign(
    {},
    alterationsPast(moment),
    alterationsPresent(moment),
    alterationsFuture(moment)
  );
}

module.exports = {
  alterationsPast,
  alterationsPresent,
  alterationsFuture,
  alterationsPresentAndFuture,
  alterationsPastPresentAndFuture,
};
