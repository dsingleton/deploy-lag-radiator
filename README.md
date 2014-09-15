# Deploy Lag Radiator

A _information radiator_ / _glancable_ / _stats screen_ to show how far a repo is behind it's latest deployed version.

It relies on a consistent tag/branch which tracks the latest deployed version and compares that to HEAD on master (though you can choose a different point).

It's intended to highlight changes that may sit undeployed for a long time, causing a build up of deployment risk.

## Config

Pass configuration as query params, supported params are;

* `token` - A Github API token
* `repos` - A comma-seperated list of repository names on [@alphagov](https://github.com/alphagov)
* `refresh` - How often to update, in seconds [_optional_, defaults to `60`]
* `from` - A treeish (tag, branch, etc) to start comparing from
* `to` - A treeish (tag, branch, etc) to compare until [_optional_, defaults to `master`]
* `resolve_tags` - Set this to anything truthy (ie not an empty string) to look up tags for the `from` and `to` commits to use in the title compare link [_optional_, defaults to off]

## To do

* Support non-@alphagov repos
* Sort by most-out-of-date (eg, oldest, or most commits)
* Auto refresh on timer
* Try and deal with merges, rather than commits (an old commit may only just have been merged)
