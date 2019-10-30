/* eslint-env jest */
const toEvents = require('./to-events');
const mockSha1 = jest.fn();
mockSha1.update = jest.fn();
mockSha1.digest = jest.fn();
jest.mock('crypto', () => {
  return {
    createHash: () => mockSha1
  };
});
jest.mock('./config', () => {
  return {
    eventFields: { location: 'test place', 'x:test': true }
  };
});
describe('toEvents', () => {
  it('converting html to events array', () => {
    const body = `
            <table class="admTartTblRek">
                <tr>dummy</tr>
                <tr>
                    <td>
                        2019.10.10. hétfő 
                    </td>
                    <td>
                        18:10 - 19:10
                    </td>
                    <td>
                        CrossFit
                    </td>
                    <td>
                        Kisterem
                    </td>
                </tr>
            </table>
        `;
    mockSha1.digest.mockReturnValue('custom-id');
    const events = toEvents(body);

    expect(events).toEqual([{
      location: 'test place',
      'x:test': true,
      id: 'custom-id',
      start: new Date('2019-10-10T16:10:00.000Z'),
      end: new Date('2019-10-10T17:10:00.000Z'),
      summary: 'CrossFit (Kisterem)'
    }]);
  });
});
