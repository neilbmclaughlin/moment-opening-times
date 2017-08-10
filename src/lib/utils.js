const moment = require('moment');

const todayInKeyFormat = moment().format('YYYY-MM-DD');

function removePastAlterations(alterations) {
  if (alterations) {
    const presentAndFutureAlterations = {};
    const alterationsKeys = Object.keys(alterations);

    alterationsKeys.forEach((key) => {
      if (key >= todayInKeyFormat) {
        presentAndFutureAlterations[key] = alterations[key];
      }
    });
    return presentAndFutureAlterations;
  }
  return alterations;
}

module.exports = {
  removePastAlterations,
};
