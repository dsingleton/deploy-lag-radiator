function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] === variable) {
      return pair[1];
    }
  }
  return false;
};

/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time){
  var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

  if ( isNaN(day_diff) || day_diff < 0)
    return;

  return day_diff == 0 && (
      diff < 60 && "just now" ||
      diff < 120 && "1 minute ago" ||
      diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
      diff < 7200 && "1 hour ago" ||
      diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
    day_diff < 365 && Math.ceil( day_diff / 31 ) + " months ago" ||
    '1 Year+';

}

$(document).ready(function() {

  var repos = getQueryVariable('repos').split(',');
  var refresh_rate = (getQueryVariable('refresh') || 60) * 1000;
  var from_tag = getQueryVariable('from');
  var to_tag = getQueryVariable('to') || 'master';
  var api_token = getQueryVariable('token');
  var repo_owner = getQueryVariable('owner') || 'alphagov';

  var repos_container = $('#repos');

  var build_api_url = function(repo, from_tag, to_tag) {
    return 'https://api.github.com/repos/' + repo + '/compare/' + from_tag + '...' + to_tag
  }

  var build_http_compare_url = function(repo, from_tag, to_tag) {
    return 'https://github.com/' + repo + '/compare/' + from_tag + '...' + to_tag
  }

  repos = $.map(repos, function(repo) {
    var path = repo,
        name = repo;

    if (repo.match(/\//)) {
      name = path.split('/')[1];
    }
    else {
      path = repo_owner + '/' + name;
    }

    return {
      path: path,
      name: name
    }
  });

  initialise(repos);
  update(repos, refresh_rate);

  function initialise(repos) {
    $(repos).each(function(i, repo) {

      var $repo = $('<tr>').attr('class', 'repo-' + repo)
        .append('<td class="commits">')
        .append('<td class="merges">')
        .append($('<td class="name">').append($('<a>').attr('href', build_http_compare_url(repo.path, from_tag, to_tag)).text(repo.name)))
        .append('<td class="time">');

      repos_container.append($repo);
      repo.$el = $repo;
    });
  }

  function update(repos, refresh_rate) {
    $(repos).each(function(i, repo) {
      api_url = build_api_url(repo.path, from_tag, to_tag);
      $.ajax({
        url: api_url,
        dataType: 'json',
        success: function(repo_state) {
          repo.$el.find('.commits').text(repo_state.ahead_by || '✔');
          repo.$el.attr('class', repo_state.ahead_by ? 'stale' : 'good');
          var mergeCommits = repo_state.commits.filter(function(commit) {
            return commit.parents.length > 1}
          );
          repo.$el.find('.merges').text(mergeCommits.length || '✔');

          if (repo_state.commits.length) {
            repo.$el.find('.time').text(prettyDate(mergeCommits[0].commit.author.date));
          }
        },
        error: function(e) {
          // Most likely invalid comparison, one (or both) of the tags don't exist
          // Or the repo name is bad
          repo.$el.attr('class', 'unknown');

          if (e.status == 404) {
            repo.$el.find('.commits', '.merges').text('?');
          }
        },
        headers: {
          'Authorization': 'token ' + api_token
        }
      });
    });

    if (refresh_rate) {
      setTimeout(function() {
        update(repos, refresh_rate);
      }, refresh_rate);
    }
  }
});
