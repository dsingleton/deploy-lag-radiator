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
  var diff = secondsAgo(time),
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

// Takes an ISO time and returns how long ago in seconds the time was as an
// integer.
function secondsAgo(time) {
  var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," "));

  return ((new Date()).getTime() - date.getTime()) / 1000;
}

$(document).ready(function() {

  var repos = getQueryVariable('repos').split(',');
  var refresh_rate = (getQueryVariable('refresh') || 60) * 1000;
  var from_tag = getQueryVariable('from');
  var to_tag = getQueryVariable('to') || 'master';
  var api_token = getQueryVariable('token');
  var repo_owner = getQueryVariable('owner') || 'alphagov';
  var resolve_tags = !!getQueryVariable('resolve_tags');

  var repos_container = $('#repos');

  var build_api_compare_url = function(repo, from_tag, to_tag) {
    return 'https://api.github.com/repos/' + repo + '/compare/' + from_tag + '...' + to_tag
  }

  var build_api_tags_url = function(repo) {
    return 'https://api.github.com/repos/' + repo + '/tags'
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
      name: name,
      api_compare_url: build_api_compare_url(path, from_tag, to_tag),
      http_compare_url: build_http_compare_url(path, from_tag, to_tag),
      api_tags_url: build_api_tags_url(path),
      commits_ahead: 0,
      merges_ahead: 0,
      oldest_merge: null
    }
  });

  initialise(repos);
  update(repos, refresh_rate);

  function initialise(repos) {
    $(repos).each(function(i, repo) {

      var $repo = $('<tr>').attr('class', 'repo-' + repo)
        .append('<td class="commits">')
        .append('<td class="merges">')
        .append($('<td class="name">').append($('<a>').attr('href', repo.http_compare_url).text(repo.name)))
        .append('<td class="time">');

      repos_container.append($repo);
      repo.$el = $repo;
    });
  }

  function update(repos, refresh_rate) {
    $(repos).each(function(i, repo) {
      $.ajax({
        url: repo.api_compare_url,
        dataType: 'json',
        success: function(repo_state) {
          update_repo(repo, repo_state);
          redraw_repo(repo);
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
    updateAprilFools();
    if (refresh_rate) {
      setTimeout(function() {
        update(repos, refresh_rate);
        updateAprilFools();
      }, refresh_rate);
    }
  }

  function update_repo(repo, repo_state) {
    repo.commits_ahead = repo_state.ahead_by;

    var mergeCommits = repo_state.commits.filter(function(commit) {
      return commit.parents.length > 1;
    });

    repo.merges_ahead = mergeCommits.length;
    repo.oldest_merge = mergeCommits.length ? mergeCommits[0].commit.author.date : null;

    // Reset the compare URL to use original references
    repo.http_compare_url = build_http_compare_url(repo.path, from_tag, to_tag);

    if (resolve_tags && repo.commits_ahead) {
      repo.oldest_sha = repo_state.base_commit.sha;
      repo.newest_sha = repo_state.commits[repo_state.commits.length - 1].sha;

      $.ajax({
        url: repo.api_tags_url,
        dataType: 'json',
        success: function(repo_tags) {
          update_repo_compare_url(repo, repo_tags);
          redraw_repo(repo);
        },
        error: function(e) {
          console.log('Failed to fetch tags for ' + repo.name, e);
        },
        headers: {
          'Authorization': 'token ' + api_token
        }
      });
    }
  }

  function update_repo_compare_url(repo, repo_tags) {
    var oldest_tag = repo_tags.filter(function(tag) {
      return repo.oldest_sha == tag.commit.sha;
    })[0];

    var newest_tag = repo_tags.filter(function(tag) {
      return repo.newest_sha == tag.commit.sha;
    })[0];

    repo.http_compare_url = build_http_compare_url(
      repo.path,
      oldest_tag ? oldest_tag.name : from_tag,
      newest_tag ? newest_tag.name : to_tag
    );
  }

  function redraw_repo(repo) {
    repo.$el.find('.commits').text(repo.commits_ahead || '✔');
    repo.$el.attr('class', repo_state(repo));
    repo.$el.find('.merges').text(repo.merges_ahead || '✔');
    repo.$el.find('.name a').attr('href', repo.http_compare_url);
    repo.$el.find('.time').text(repo.oldest_merge ? prettyDate(repo.oldest_merge) : 'all deployed');

    // TODO: Don't resort the entire list when a single repo updates.
    sort_repos();
  }

  function sort_repos() {
    var compare = function(a,b) {
      // If both repos are up-to-date or equally stale, sort by name.
      if (a.oldest_merge === b.oldest_merge) {
        return a.name < b.name ? -1 : 1;
      }
      // If repo A is up-to-date, B goes first.
      else if (!a.oldest_merge) {
        return 1;
      }
      // If repo B is up-to-date, A goes first.
      else if (!b.oldest_merge) {
        return -1;
      }
      // If repo B is older, B goes first.
      else if (a.oldest_merge > b.oldest_merge) {
        return 1;
      }
      // If repo A is older, A goes first.
      else if (a.oldest_merge < b.oldest_merge) {
        return -1;
      }
    }
    $.each(repos.sort(compare),function(i,repo) {
      repo.$el.detach().appendTo(repos_container);
    });
  }

  function repo_state(repo) {
    if (repo.commits_ahead) {
      var age = secondsAgo(repo.oldest_merge);

      if (age > 86400 * 4) {
        return 'very-stale';
      }
      else {
        return 'stale';
      }
    }
    else {
      return 'good';
    }
  }

  function updateAprilFools() {
    var start = new Date(2015, 3, 1, 9, 30),
        end = new Date(2015, 3, 1, 10, 30),
        now = new Date(),
        isAprilFools = (now > start && now < end);
    $('body').toggleClass('april-fools', isAprilFools)
  }
});
