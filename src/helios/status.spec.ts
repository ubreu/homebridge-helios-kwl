import assert from 'assert';
import { VentilationStatus as S } from './ventilation';
import { isActive, rotationSpeed } from './status';

describe('Status mapping', () => {
  it('active for home, boost, fireplace; inactive for away', () => {
    assert.equal(isActive(S.Home), true);
    assert.equal(isActive(S.Boost), true);
    assert.equal(isActive(S.Fireplace), true);
    assert.equal(isActive(S.Away), false);
  });

  it('rotation speed per profile', () => {
    assert.equal(rotationSpeed(S.Away), 0);
    assert.equal(rotationSpeed(S.Home), 50);
    assert.equal(rotationSpeed(S.Fireplace), 50);
    assert.equal(rotationSpeed(S.Boost), 100);
  });

});
