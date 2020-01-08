# GHA-Compare-PyPi

GitHub Action to compare a given Artifact (from the latest release) against a list of PyPi packages.

Outputs data to determine if an update (for frozen artifacts) is prudent.

## To use:
```yml
- name: Check for PyPi updates
  uses: shadowmoose/GHA-Compare-PyPi@1.0.0
  id: check
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    owner: ShadowMoose  # Optional. Defaults to current.
    repo: Test  # Optional. Defaults to current.
    outFile: './output/release.json'  # -- Optional. Defaults to no file output.
```


Then, later, you may use the [outputs](./action.yml) like this:

```yml
- name: Get the output time
  run: |
    echo "Latest tag: ${{ steps.check.outputs.latest_release }}";
    echo "Released: ${{ steps.check.outputs.is_released }}";
```
