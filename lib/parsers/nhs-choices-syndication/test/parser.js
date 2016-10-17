const Verror = require('verror');
const AssertionError = require('assert').AssertionError;
const openingTimesParser = require('../parser');
const OpeningTimes = require('../../../../OpeningTimes');
const moment = require('moment');
require('moment-timezone');
const getSampleResponse = require('./resources/getSampleResponse');
const weekdays = require('moment').weekdays().map(d => d.toLowerCase());
const chai = require('chai');

const expect = chai.expect;

function getOpeningTimes(openingTimes) {
  return openingTimes.map((ot) => ({ opens: ot[0], closes: ot[1] }));
}

function assertClosed(openingTimes, day) {
  expect(openingTimes[day]).to.eql([]);
}

function assertOpeningTimes(openingTimes, day, expectedOpeningTimes) {
  expect(openingTimes[day])
      .to.eql(getOpeningTimes(expectedOpeningTimes));
}
describe('Syndication Opening Times Parser', () => {
  describe('happy path', () => {
    it('should get opening times from syndication response', () => {
      const syndicationXml = getSampleResponse('pharmacy_opening_times');
      const openingTimes = openingTimesParser('general', syndicationXml);
      expect(openingTimes).to.have.keys(weekdays);
      assertOpeningTimes(openingTimes, 'monday',
        [['08:00', '13:00'], ['13:00', '19:30']]);
      assertOpeningTimes(openingTimes, 'friday',
        [['08:00', '13:00'], ['13:00', '18:00']]);
      assertClosed(openingTimes, 'sunday');
    });
    it('opening times should be in a format handled by OpeningTimes module', () => {
      const syndicationXml = getSampleResponse('pharmacy_opening_times');
      const openingTimesJson = openingTimesParser('general', syndicationXml);
      const openingTimes = new OpeningTimes(openingTimesJson, 'Europe/London');
      const aMonday = moment('2016-07-25T10:00:0000');
      expect(openingTimes.isOpen(moment(aMonday))).to.equal(true);
    });
    it('should handle missing opening times', () => {
      const syndicationXml = getSampleResponse('pharmacy_no_opening_times');
      const openingTimes = openingTimesParser('general', syndicationXml);
      expect(openingTimes).to.eql({});
    });
  });
  describe('error handling', () => {
    it('should throw exception when arguments are missing', () => {
      expect(() => { openingTimesParser(); })
        .to.throw(
          AssertionError,
          'parameter \'openingTimesType\' undefined/empty');
      expect(() => { openingTimesParser('reception'); })
        .to.throw(
          AssertionError,
          'parameter \'xml\' undefined/empty');
    });
    it('should throw exception when arguments are of the wrong type', () => {
      expect(() => { openingTimesParser(1, 2); })
        .to.throw(
          AssertionError,
          'parameter \'openingTimesType\' must be a string');
      expect(() => { openingTimesParser('reception', 2); })
        .to.throw(
          AssertionError,
          'parameter \'xml\' must be a string');
    });
    it('should throw exception when passed invalid XML', () => {
      const syndicationXml = '<invalidxmldocument>';
      expect(() => { openingTimesParser('reception', syndicationXml); })
        .to.throw(Verror,
          'Unable to parse opening times XML: Unclosed root tag');
    });
    it('should throw exception when passed an unknown opening times type', () => {
      const syndicationXml = getSampleResponse('pharmacy_opening_times');
      expect(() => { openingTimesParser('unknown', syndicationXml); })
        .to.throw(
          Verror,
          'Unable to get \'unknown\' opening times from xml: ' +
          'Cannot read property \'daysOfWeek\' of undefined');
    });
    it('should throw exception when passed an empty opening times type', () => {
      const syndicationXml = 'not empty';
      expect(() => { openingTimesParser('', syndicationXml); })
        .to.throw(
          AssertionError,
          'parameter \'openingTimesType\' undefined/empty');
    });
    it('should throw exception when passed an empty xml string', () => {
      const syndicationXml = '';
      expect(() => { openingTimesParser('reception', syndicationXml); })
        .to.throw(
          AssertionError,
          'parameter \'xml\' undefined/empty');
    });
    it('should throw exception when xml does not contain organisation opening times.', () => {
      const syndicationXml = '<xml></xml>';
      expect(() => { openingTimesParser('reception', syndicationXml); })
        .to.throw(
          Verror,
          'Unable to get \'reception\' opening times from xml: ' +
          'Cannot read property \'entry\' of undefined');
    });
  });
});
