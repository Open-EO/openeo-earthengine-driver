module.exports = {

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Make calling deprecated APIs throw helpful error messages
  errorOnDeprecated: true,

  // Use this configuration option to add custom reporters to Jest
  "reporters": [
    "default",
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "Test Report for openeo-js-commons"
    }]
  ]

};
