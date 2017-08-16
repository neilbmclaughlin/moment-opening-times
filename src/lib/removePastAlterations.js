function removePastAlterations(alterations, moment) {
  if (alterations) {
    const todayInKeyFormat = moment.format('YYYY-MM-DD');
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

module.exports = removePastAlterations;
