/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // The presentation layer must not reach upward into the app router tree,
    // and re-usable src/ code must never import the app/ entry-point layer.
    {
      name: 'no-src-to-app',
      comment:
        'Re-usable code under src/ must not depend on the app/ router layer, so ' +
        'it can be extracted and tested independently of a single router tree.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^app/' },
    },
    // Services (domain/infrastructure) must not depend on the presentation layer.
    // Type-only imports are allowed so a service can reuse a public type without
    // dragging components into its runtime dependency graph.
    {
      name: 'no-services-to-components-at-runtime',
      comment:
        'src/services must not import src/components at runtime (presentation ' +
        'must be a leaf consumer). Type-only imports are allowed.',
      severity: 'error',
      from: { path: '^src/services/' },
      to: { path: '^src/components/', dependencyTypesNot: ['type-only'] },
    },
    // The strict, leaf utils layer must not pull in any sibling layer.
    {
      name: 'no-utils-to-higher-layers',
      comment:
        'src/utils is the foundational leaf; it must not import services, store, ' +
        'hooks, or components.',
      severity: 'error',
      from: { path: '^src/utils/' },
      to: { path: '^(src/(services|store|hooks|components))/' },
    },
    // No top-level cycles between the main layers.
    {
      name: 'no-circular-between-layers',
      comment:
        'The main layers (components, hooks, services, store, utils) must remain ' +
        'acyclic so the dependency direction stays readable.',
      severity: 'error',
      from: { path: '^(src/(components|hooks|services|store|utils))/', pathNot: '.*/__tests__/.*' },
      to: { path: '^(src/(components|hooks|services|store|utils))/', pathNot: '.*/__tests__/.*' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    includeOnly: '^(src|app|components)/',
    exclude: {
      path: '(node_modules|__tests__|/tests/|\.test\.|\.spec\.)',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      conditionNames: ['import', 'require', 'default', 'react-native'],
      mainFields: ['main', 'module'],
      tsConfig: {
        fileName: 'tsconfig.json',
      },
      alias: {
        '@': './src',
        '@components': './src/components',
        '@hooks': './src/hooks',
        '@services': './src/services',
        '@store': './src/store',
        '@utils': './src/utils',
        '@types': './src/types',
        '@constants': './src/constants',
      },
    },
  },
};
