# GHA-Compare-PyPi

GitHub Action to compare a given Artifact (from the latest release) against a list of PyPi packages.

Outputs data to determine if an update (for frozen artifacts) is prudent.

## Example use with inputs:
```yml
  - name: Check package release dates against the latest given asset release date.
    uses: shadowmoose/GHA-Compare-PyPi@1.0.0
    id: test
    with:
      token: ${{ secrets.GITHUB_TOKEN }}
      repo: RedditDownloader  # Optional. Defaults to current repo.
      owner: ShadowMoose  # Optional. Defaults to current user.
      asset: test.exe
      files: ./requirements.txt, ./requirements-dev.txt
      packages: pyderman, requests, praw  # Optional, either use this list OR "files" above.
```


Then, later, you may use the [outputs](./action.yml) like this:

```yml
  - name: Print the output
    run: |
      echo "Latest tag: ${{ steps.test.outputs.release_tag }}";
      echo "Update Available: ${{ steps.test.outputs.update_available }}";
      echo "Updated packages: ${{ steps.test.outputs.updated_packages }}";
```
