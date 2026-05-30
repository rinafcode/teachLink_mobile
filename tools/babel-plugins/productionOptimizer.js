module.exports = function productionOptimizer(api) {
  const { types: t } = api;

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
      }
    }
  };
};
