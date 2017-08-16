const chai = require('chai');
const moment = require('moment');
const removePastAlterations = require('../../../src/lib/removePastAlterations');
const testUtils = require('../../lib/utils');

const expect = chai.expect;
const now = moment();

describe('Utils', () => {
  describe('removePastAlterations', () => {
    it('should not break when alterations is undefined', () => {
      removePastAlterations();
    });

    it('should remove alterations in the past', () => {
      const alterationsPast = testUtils.alterationsPast(now);

      const strippedAlterations = removePastAlterations(alterationsPast, now);

      // eslint-disable-next-line no-unused-expressions
      expect(strippedAlterations).to.be.empty;
    });

    it('should not remove alterations in the future', () => {
      const alterationsFuture = testUtils.alterationsFuture(now);

      const strippedAlterations = removePastAlterations(alterationsFuture, now);

      expect(strippedAlterations).to.be.eql(alterationsFuture);
    });

    it('should not remove alterations for present', () => {
      const alterationsPresent = testUtils.alterationsPresent(now);

      const strippedAlterations = removePastAlterations(alterationsPresent, now);

      expect(strippedAlterations).to.be.eql(alterationsPresent);
    });

    it('should remove alterations in the past and leave them for the present and the future', () => {
      const alterationsPastPresentAndFuture = testUtils.alterationsPastPresentAndFuture(now);
      const alterationsPresentAndFuture = testUtils.alterationsPresentAndFuture(now);

      const strippedAlterations =
        removePastAlterations(alterationsPastPresentAndFuture, now);

      expect(strippedAlterations).to.be.eql(alterationsPresentAndFuture);
    });
  });
});
