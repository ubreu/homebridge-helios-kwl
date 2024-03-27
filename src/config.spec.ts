import assert from 'assert';
import { isPositiveInteger, isNonEmptyString} from './config';

describe('Config Tests', () => {

  it('detect invalid string', async () => {
    assert.equal(false, isNonEmptyString(undefined));
    assert.equal(false, isNonEmptyString(''));
  });

  it('detect valid string', async () => {
    assert.equal(true, isNonEmptyString('foo'));
    assert.equal(true, isNonEmptyString('127.0.0.1'));
  });

  it('detect invalid number', async () => {
    assert.equal(false, isPositiveInteger(undefined));
    assert.equal(false, isPositiveInteger(''));
    assert.equal(false, isPositiveInteger('0'));
    assert.equal(false, isPositiveInteger(0));
    assert.equal(false, isPositiveInteger(-1));
  });

  it('detect valid number', async () => {
    assert.equal(true, isPositiveInteger(1));
    assert.equal(true, isPositiveInteger(9999));
  });
});
