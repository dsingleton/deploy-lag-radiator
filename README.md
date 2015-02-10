# Deploy Lag Radiator

Visualises unreleased commits for repositories. Discourages the build up of many commits needing to be released at the same time. Release early and often.

![Screenshot of the deploy lag radiator](docs/screenshot.png)

## How it works

For each repository it checks the diff between two point, usually the latest commit (on master) and a branch/tag. It relies on a consistent tag/branch which tracks the latest deployed version and compares that to master (though you can choose a different point).

This was designed with released/deployed web applications in mind, but can equally be applied to versioned software.

## Using it

Pass configuration as query params, supported params are;

index.html?from=deployed-to-production&repos=alphagov/bouncer

### Required Paramters

| Paramter | What it does |
|-----|-------------|
| `token` | A [Github API token](https://github.com/blog/1509-personal-api-tokens). Technically optional but without it API calls are rated limited and may fail. |
| `repos` |  A comma-seperated list of repository names, with owner, eg, `alphagov/frontend` |
| `from` | A treeish (tag, branch, etc) to start comparing from. Equivilent to the latest release for the repository. |

### Optional Parameters

| Paramter | What it does | Default |
|-----|-------------|---------|
| `refresh` | How often to update the state of each repository, in seconds | `60` |
| `to` | A treeish (tag, branch, etc) to compare until | `master` |
| `resolve_tags` | Set this to anything truthy (ie not an empty string) to look up tags for the `from` and `to` commits to use in the title compare link | Not set |


## Todo

* Give useful feedback on API rate limit errors
