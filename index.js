'use strict';

/**
 * Usage:
 *   node ./index.js <repo path> <milestone number 1> <milestone number 2> ...
 *
 *   e.g.
 *   node ./index.js yaru22/github-issue-extractor 1 12 13
 */

var _       = require('lodash'),
    request = require('request'),
    util    = require('util');

var accessToken;
try {
  var githubConfig = require('./configs/github');
  accessToken = githubConfig.accessToken;
} catch (err) {
  accessToken = process.env.GITHUB_ACCESS_TOKEN;
  if (!accessToken) {
    console.log('GitHub access token is not available. Please set it via GITHUB_ACCESS_TOKEN environment variable.');
    process.exit(1);
  }
}

var ISSUES_API_URL = 'https://api.github.com/repos/%s/issues?state=open&per_page=100&access_token=%s';

var repoPath         = process.argv[2],
    milestoneNumbers = process.argv.slice(3);

function collectIssues(outputFunction) {
  var issuesUrl = util.format(ISSUES_API_URL, repoPath, accessToken);
  request({
    url: issuesUrl,
    json: true,
    headers: {
      'User-Agent': 'Node.js Request',
      'Accept': 'application/json'
    }
  }, function (err, resp, body) {
    if (err || resp.statusCode !== 200) {
      console.log(err, resp);
      return;
    }

    var issues = [];

    body.map(function (issue) {

      var body = util.format(
        "Imported from %s - %s",
        issue.html_url,
        issue.body
      );

      var labels = [];
      _.each(issue.labels, function(label){
        labels.push(label.name);
      });

      issues.push({
        number: issue.number,
        title: issue.title.replace(/"/g, '\''),
        body: body.replace(/"/g, '\'').replace(/(?:\r\n|\r|\n)/g, ' '),
        labels: labels.join(),
        created_at: issue.created_at,
        updated_at: issue.updated_at
      });
    });
    outputFunction(issues);
  });
}

var outputFunctions = {};

outputFunctions.all = function (data) {
  console.log('===== JSON format =====');
  outputFunctions.json(data);
  console.log('\n===== CSV format =====');
  outputFunctions.csv(data);
};

outputFunctions.json = function (data) {
  console.log(JSON.stringify(data, null, 2));
};

outputFunctions.csv = function (data) {

  // Print the header.
  console.log('Issue #\tTitle\tBody\tLabels\tCreated\tUpdated');

  _.each(data, function (issue) {
    console.log(
      util.format('%s\t"%s"\t"%s"\t"%s"\t"%s"\t"%s"',
          issue.number,
          issue.title,
          issue.body,
          issue.labels,
          issue.created_at,
          issue.updated_at
          )
    );
  });
};

collectIssues(outputFunctions.csv);
