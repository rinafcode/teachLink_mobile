module.exports = function productionOptimizer(api, options = {}) {
  const { types: t } = api;
  const isProduction = Boolean(options.production);

  const isDevIdentifier = node => t.isIdentifier(node, { name: '__DEV__' });

  const isDevOnlyExpression = node =>
    isDevIdentifier(node) ||
    (t.isLogicalExpression(node, { operator: '&&' }) && isDevIdentifier(node.left));

  const isConsoleMember = node =>
    t.isMemberExpression(node) &&
    t.isIdentifier(node.object, { name: 'console' }) &&
    t.isIdentifier(node.property) &&
    ['log', 'info', 'warn', 'debug', 'trace'].includes(node.property.name);

  const replaceStatementWithBranch = (path, replacement) => {
    if (!replacement) {
      path.remove();
    } else if (t.isBlockStatement(replacement)) {
      path.replaceWithMultiple(replacement.body);
    } else {
      path.replaceWith(replacement);
    }
  };

  return {
    name: 'teachlink-production-optimizer',
    visitor: {
      ObjectProperty(path) {
        const { node } = path;
        if (
          !node.computed &&
          node.shorthand === false &&
          t.isIdentifier(node.key) &&
          t.isIdentifier(node.value) &&
          node.key.name === node.value.name
        ) {
          node.shorthand = true;
        }
      },

      IfStatement(path) {
        const { node } = path;
        const test = node.test;

        if (isProduction && isDevOnlyExpression(test)) {
          replaceStatementWithBranch(path, node.alternate);
          return;
        }

        if (
          isProduction &&
          t.isUnaryExpression(test, { operator: '!' }) &&
          isDevIdentifier(test.argument)
        ) {
          replaceStatementWithBranch(path, node.consequent);
          return;
        }

        if (t.isBooleanLiteral(test)) {
          if (test.value === true) {
            if (t.isBlockStatement(node.consequent)) {
              path.replaceWithMultiple(node.consequent.body);
            } else {
              path.replaceWith(node.consequent);
            }
          } else if (test.value === false) {
            if (node.alternate) {
              if (t.isBlockStatement(node.alternate)) {
                path.replaceWithMultiple(node.alternate.body);
              } else {
                path.replaceWith(node.alternate);
              }
            } else {
              path.remove();
            }
          }
        }
      },

      ConditionalExpression(path) {
        const { node } = path;
        const test = node.test;

        if (isProduction && isDevOnlyExpression(test)) {
          path.replaceWith(node.alternate);
          return;
        }

        if (
          isProduction &&
          t.isUnaryExpression(test, { operator: '!' }) &&
          isDevIdentifier(test.argument)
        ) {
          path.replaceWith(node.consequent);
          return;
        }

        if (t.isBooleanLiteral(test)) {
          if (test.value === true) {
            path.replaceWith(node.consequent);
          } else if (test.value === false) {
            path.replaceWith(node.alternate);
          }
        }
      },

      LogicalExpression(path) {
        const { node } = path;
        const left = node.left;

        if (isProduction && isDevIdentifier(left)) {
          if (node.operator === '&&') {
            path.replaceWith(t.booleanLiteral(false));
            return;
          }

          if (node.operator === '||') {
            path.replaceWith(node.right);
            return;
          }
        }

        if (t.isBooleanLiteral(left)) {
          if (node.operator === '&&') {
            if (left.value === true) {
              path.replaceWith(node.right);
            } else if (left.value === false) {
              path.replaceWith(t.booleanLiteral(false));
            }
          } else if (node.operator === '||') {
            if (left.value === true) {
              path.replaceWith(t.booleanLiteral(true));
            } else if (left.value === false) {
              path.replaceWith(node.right);
            }
          }
        }
      },

      CallExpression(path) {
        if (!isProduction || !isConsoleMember(path.node.callee)) {
          return;
        }

        if (path.parentPath.isExpressionStatement()) {
          path.parentPath.remove();
        } else {
          path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)));
        }
      }
    }
  };
};
