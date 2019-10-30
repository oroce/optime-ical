const ical = require('ical-generator');
const toIcal = require('./to-ical');
const mockIcalGenerator = jest.fn();
mockIcalGenerator.prototype._generate = jest.fn()
jest.mock('ical-generator', () => {
    return (props) => {
        return new mockIcalGenerator(props);
    }
});

describe('toIcal', () => {
    it('should convert events to ical', () => {
        mockIcalGenerator.prototype._generate.mockReturnValue('icalcontent');

        const events = [{
            start: new Date(),
            end: new Date(),
            id: 'event1',
            summary: 'Event 1'
        }];
        expect(toIcal(events)).toBe('icalcontent');

        expect(mockIcalGenerator).toBeCalledWith({
            domain: 'optime.oroszi.net',
            name: 'Optime',
            prodId: '//oroszi.net//optime-ical-generator//EN',
            timezone: 'UTC',
            events
        });
    });
});