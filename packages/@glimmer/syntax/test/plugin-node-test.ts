import { preprocess, Syntax, Walker, AST, ASTPluginEnvironment, ASTPluginBuilder } from '..';
import { expect } from '@glimmer/util';

const { test } = QUnit;

QUnit.module('[glimmer-syntax] Plugins - AST Transforms');

test('function based AST plugins can be provided to the compiler', (assert) => {
  assert.expect(1);

  preprocess('<div></div>', {
    plugins: {
      ast: [
        () => ({
          name: 'plugin-a',
          visitor: {
            Program() {
              assert.ok(true, 'transform was called!');
            },
          },
        }),
      ],
    },
  });
});

test('plugins are provided the syntax package', (assert) => {
  assert.expect(1);

  preprocess('<div></div>', {
    plugins: {
      ast: [
        ({ syntax }) => {
          assert.strictEqual(syntax.Walker, Walker);

          return { name: 'plugin-a', visitor: {} };
        },
      ],
    },
  });
});

// eslint-disable-next-line qunit/require-expect
test('can support the legacy AST transform API via ASTPlugin', (assert) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  function ensurePlugin(FunctionOrPlugin: any): ASTPluginBuilder {
    if (FunctionOrPlugin.prototype && FunctionOrPlugin.prototype.transform) {
      return (env: ASTPluginEnvironment) => {
        return {
          name: 'plugin-a',

          visitor: {
            Program(node: AST.Program) {
              let plugin = new FunctionOrPlugin(env);

              plugin.syntax = env.syntax;

              return plugin.transform(node);
            },
          },
        };
      };
    } else {
      return FunctionOrPlugin;
    }
  }

  class Plugin {
    declare syntax: Syntax;

    transform(program: AST.Program): AST.Program {
      assert.ok(true, 'transform was called!');
      return program;
    }
  }

  preprocess('<div></div>', {
    plugins: {
      ast: [ensurePlugin(Plugin)],
    },
  });
});

const FIRST_PLUGIN = new WeakMap<AST.Program | AST.Block | AST.Template, boolean>();
const SECOND_PLUGIN = new WeakMap<AST.Program | AST.Block | AST.Template, boolean>();
const THIRD_PLUGIN = new WeakMap<AST.Program | AST.Block | AST.Template, boolean>();

test('AST plugins can be chained', (assert) => {
  assert.expect(3);

  let first = () => {
    return {
      name: 'first',
      visitor: {
        Program(program: AST.Program | AST.Template | AST.Block) {
          FIRST_PLUGIN.set(program, true);
        },
      },
    };
  };

  let second = () => {
    return {
      name: 'second',
      visitor: {
        Program(node: AST.Program | AST.Block | AST.Template) {
          assert.true(FIRST_PLUGIN.get(node), 'AST from first plugin is passed to second');

          SECOND_PLUGIN.set(node, true);
        },
      },
    };
  };

  let third = () => {
    return {
      name: 'third',
      visitor: {
        Program(node: AST.Program | AST.Block | AST.Template) {
          assert.true(SECOND_PLUGIN.get(node), 'AST from second plugin is passed to third');

          THIRD_PLUGIN.set(node, true);
        },
      },
    };
  };

  let ast = preprocess('<div></div>', {
    plugins: {
      ast: [first, second, third],
    },
  });

  assert.true(THIRD_PLUGIN.get(ast), 'return value from last AST transform is used');
});

test('AST plugins can access meta from environment', (assert) => {
  assert.expect(1);

  let hasExposedEnvMeta = (env: ASTPluginEnvironment) => {
    return {
      name: 'exposedMetaTemplateData',
      visitor: {
        Program() {
          const { meta } = env;
          const { moduleName } = expect(
            meta as { moduleName: 'string' },
            'expected meta to not be null'
          );
          assert.strictEqual(
            moduleName,
            'template/module/name',
            'module was passed in the meta enviornment property'
          );
        },
      },
    };
  };

  preprocess('<div></div>', {
    meta: {
      moduleName: 'template/module/name',
    },
    plugins: {
      ast: [hasExposedEnvMeta],
    },
  });
});
