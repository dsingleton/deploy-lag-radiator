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
}

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

    var repos = loadReposFromJson();
    var refresh_rate = getQueryVariable('refresh') || 60 * 1000;
    var base_tag = getQueryVariable('base');
    var to_tag = getQueryVariable('to').replace(/\/$/, "") || 'master';
    var api_token = "9e0ce7d0b9d316907f8db733c6a804c1ab632201";
    var repo_owner = getQueryVariable('owner') || 'alphagov';


    var $base = $('#select-base');
        $to = $('#select-to');

    $base.find('option[value='+base_tag+']').prop('selected',true);
    $to.find('option[value='+to_tag+']').prop('selected',true);

    $base.on('change', function(){
        base_tag = $(this).val();
        update(repos, refresh_rate);
    });

    $to.on('change', function(){
        to_tag = $(this).val();
        update(repos, refresh_rate);
    });

    var repos_container = $('#repos');

    var build_api_url = function(repo, base_tag, to_tag) {
        return [
        'https://api.github.com/repos/',
        repo,
        '/compare/',
        base_tag,
        '...',
        to_tag].join('');
    };

    var build_http_compare_url = function(repo, base_tag, to_tag) {
        return [
        'https://github.com/',
        repo,
        '/compare/',
        base_tag,
        '...',
        to_tag
        ].join('');
    };

    function loadReposFromJson(){
        var docs = $.Deferred();

        $.ajax({
            url: 'repos/performance-platform.json',
            dataType: 'json',
        })
        .done(function(data) {
            docs.resolve(data);
        })
        .fail(function(e) {
            console.log("error", e);
        })
        .always(function() {
            // console.log("complete");
        });

        return docs;

    }

    function initialise(repos) {

        $(repos).each(function(i, repo) {
            // console.log(i,repo);
            var relative_path = repo.owner + '/' + repo.name;
            var $repo = $('<tr>').attr('class', 'repo-' + repo.name)
                .append('<td class="commits">')
                .append('<td class="merges">')
                .append($('<td class="name">').append($('<a>').attr('href',
                    build_http_compare_url(relative_path, base_tag, to_tag)).text(repo.name)))
                .append('<td class="time">');

            repos_container.append($repo);
            repo.$el = $repo;
      });
    }

    function update(repos, refresh_rate) {


        if (refresh_rate) {
            setTimeout(function() {
                update(repos, refresh_rate);
            }, refresh_rate);
        }

        $(repos).each(function(i, repo) {
            api_url = build_api_url([repo.owner,repo.name].join('/'), base_tag, to_tag);
            console.log(repo, api_url);
            $.ajax({
                url: api_url,
                dataType: 'json',
                success: function(repo_state) {
                    repo.$el.find('.commits').text(repo_state.ahead_by || '✔');
                    repo.$el.attr('class', repo_state.ahead_by ? 'stale' : 'good');
                    var mergeCommits = repo_state.commits.filter(function(commit) {
                        return commit.parents.length > 1;
                    });
                    repo.$el.find('.merges').text(mergeCommits.length || '✔');

                    if (repo_state.commits.length) {
                        repo.$el.find('.time').text(prettyDate(mergeCommits[0].commit.author.date));
                    } else {
                        repo.$el.find('.time').text("")
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
    }


repos.done(function(data){
    repos = data;
    initialise(data);
    update(data, refresh_rate);
});


});
