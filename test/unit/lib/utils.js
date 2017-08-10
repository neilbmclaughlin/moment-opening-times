const chai = require('chai');
const utils = require('../../../src/lib/utils');
const testUtils = require('../../lib/utils');

const expect = chai.expect;

describe('Utils', () => {
  describe('removePastAlterations', () => {
    it('should not break when alterations is undefined', () => {
      utils.removePastAlterations();
    });

    it('should remove alterations in the past', () => {
      const alterationsPast = testUtils.alterationsPast();

      const strippedAlterations = utils.removePastAlterations(alterationsPast);

      // eslint-disable-next-line no-unused-expressions
      expect(strippedAlterations).to.be.empty;
    });

    it('should not remove alterations in the future', () => {
      const alterationsFuture = testUtils.alterationsFuture();

      const strippedAlterations = utils.removePastAlterations(alterationsFuture);

      expect(strippedAlterations).to.be.eql(alterationsFuture);
    });

    it('should not remove alterations for present', () => {
      const alterationsPresent = testUtils.alterationsPresent();

      const strippedAlterations = utils.removePastAlterations(alterationsPresent);

      expect(strippedAlterations).to.be.eql(alterationsPresent);
    });

    it('should remove alterations in the past and leave them for the present and the future', () => {
      const alterationsPastPresentAndFuture = testUtils.alterationsPastPresentAndFuture();
      const alterationsPresentAndFuture = testUtils.alterationsPresentAndFuture();

      const strippedAlterations = utils.removePastAlterations(alterationsPastPresentAndFuture);

      expect(strippedAlterations).to.be.eql(alterationsPresentAndFuture);
    });
  });
});
