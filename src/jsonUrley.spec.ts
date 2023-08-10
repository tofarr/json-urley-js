import {
  jsonObjToQueryParams,
  jsonObjToQueryStr,
  queryParamsToJsonObj,
  queryStrToJsonObj
} from '../src';

import * as mocha from 'mocha';
import * as chai from 'chai';

const expect = chai.expect;
describe('JsonUrley', () => {

  it('should fail' , () => {
    expect(4).to.equal(7);
  });

});
