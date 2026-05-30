import { transformSync } from '@babel/core';
import productionOptimizer from '../../tools/babel-plugins/productionOptimizer';

function transform(code: string): string {
  const result = transformSync(code, {
    plugins: [productionOptimizer],
    babelrc: false,
    configFile: false,
    compact: true,
  });
  return result?.code || '';
}

describe('productionOptimizer Babel Plugin', () => {
  describe('Object Property Shorthand Collapse', () => {
    it('should collapse property to shorthand when key and value identifiers match', () => {
      const input = 'const obj = { theme: theme, user: user };';
      const output = transform(input);
      expect(output).toBe('const obj={theme,user};');
    });

    it('should not collapse when key and value do not match', () => {
      const input = 'const obj = { theme: other };';
      const output = transform(input);
      expect(output).toBe('const obj={theme:other};');
    });

    it('should not collapse computed properties', () => {
      const input = 'const obj = { [theme]: theme };';
      const output = transform(input);
      expect(output).toBe('const obj={[theme]:theme};');
    });
  });

  describe('Constant If-Statement Folding & Dead Branch Removal', () => {
    it('should inline consequent if test is true', () => {
      const input = 'if (true) { render(); }';
      const output = transform(input);
      expect(output).toBe('render();');
    });

    it('should inline single statement consequent if test is true', () => {
      const input = 'if (true) render();';
      const output = transform(input);
      expect(output).toBe('render();');
    });

    it('should remove entire if statement if test is false and no alternate exists', () => {
      const input = 'if (false) { expensive(); }';
      const output = transform(input);
      expect(output).toBe('');
    });

    it('should replace with alternate if test is false and alternate exists', () => {
      const input = 'if (false) { expensive(); } else { cheap(); }';
      const output = transform(input);
      expect(output).toBe('cheap();');
    });

    it('should replace with alternate single statement if test is false and alternate exists', () => {
      const input = 'if (false) expensive(); else cheap();';
      const output = transform(input);
      expect(output).toBe('cheap();');
    });
  });

  describe('Conditional Ternary Simplification', () => {
    it('should fold ternary to consequent when test is true', () => {
      const input = 'const x = true ? a : b;';
      const output = transform(input);
      expect(output).toBe('const x=a;');
    });

    it('should fold ternary to alternate when test is false', () => {
      const input = 'const x = false ? a : b;';
      const output = transform(input);
      expect(output).toBe('const x=b;');
    });
  });

  describe('Logical Expression Folding', () => {
    it('should simplify true && right to right', () => {
      const input = 'const val = true && doSomething();';
      const output = transform(input);
      expect(output).toBe('const val=doSomething();');
    });

    it('should simplify false && right to false', () => {
      const input = 'const val = false && doSomething();';
      const output = transform(input);
      expect(output).toBe('const val=false;');
    });

    it('should simplify true || right to true', () => {
      const input = 'const val = true || doSomething();';
      const output = transform(input);
      expect(output).toBe('const val=true;');
    });

    it('should simplify false || right to right', () => {
      const input = 'const val = false || doSomething();';
      const output = transform(input);
      expect(output).toBe('const val=doSomething();');
    });
  });
});
