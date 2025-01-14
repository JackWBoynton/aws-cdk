const baseConfig = require('@aws-cdk/cdk-build-tools/config/jest.config');
module.exports = {
    ...baseConfig,
  moduleFileExtensions: [
    'js',
    'ts',
  ],
  preset: 'ts-jest',
  testMatch: [
    '<rootDir>/**/test/**/?(*.)+(test).ts',
  ],
  coverageThreshold: {
    global: {
      ...baseConfig.coverageThreshold.global,
      branches: 70,
    },
  },
};
