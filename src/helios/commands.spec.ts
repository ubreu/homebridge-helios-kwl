import assert from 'assert';
import { encodeCommand, VentilationCommand } from './ventilation';

const words = (c: VentilationCommand) => Array.from(encodeCommand(c));
const sum = (a: number[]) => a.slice(0, -1).reduce((x, y) => x + y, 0) % 65536;

describe('Command encoding', () => {
  it('keeps existing payloads unchanged', () => {
    assert.deepEqual(words(VentilationCommand.GetStatus), [3, 246, 0, 249]);
    assert.deepEqual(words(VentilationCommand.SetHome), [8, 249, 4609, 0, 4612, 0, 4613, 0, 14091]);
    assert.deepEqual(words(VentilationCommand.SetAway), [8, 249, 4609, 1, 4612, 0, 4613, 0, 14092]);
    assert.deepEqual(words(VentilationCommand.SetBoost), [6, 249, 4612, 30, 4613, 0, 9510]);
  });

  it('encodes fireplace for 15 minutes with boost cleared', () => {
    assert.deepEqual(words(VentilationCommand.SetFireplace), [6, 249, 4612, 0, 4613, 15, 9495]);
  });

  it('ends every set command with the sum of the preceding words', () => {
    for (const c of [VentilationCommand.SetHome, VentilationCommand.SetAway,
      VentilationCommand.SetBoost, VentilationCommand.SetFireplace]) {
      const w = words(c);
      assert.equal(w[w.length - 1], sum(w));
    }
  });
});
