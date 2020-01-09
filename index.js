const github = require('@actions/github');
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const rp = require('request-promise-native');
const AdmZip = require('adm-zip');


async function run() {
	const token = core.getInput('token');
	const assetName = core.getInput('asset');
	const owner = core.getInput('owner') || github.context.payload.repository.owner.name;
	const repo = core.getInput('repo') || github.context.payload.repository.name;
	const packages = core.getInput('packages') || null;
	const reqFiles = core.getInput('files') || null;

	const octokit = new github.GitHub(token);
	const release = (await octokit.repos.getLatestRelease({owner, repo})).data;
	const releaseTag = release.tag_name;

	core.info(`Latest Release tag: ${releaseTag}`);
	core.setOutput("release_tag", releaseTag);

	let latestBuild = release.assets.filter(a => a.name === assetName);
	if (!latestBuild.length) {
		core.info(`Unable to locate latest asset: "${assetName}". Assuming new build for release.`);
		latestBuild = 0;
	} else {
		latestBuild = latestBuild[0].created_at;
	}
	const latestBuildDate = new Date(latestBuild);

	let zipURL = '';
	if (reqFiles) {
		core.info(`Downloading latest release tag's zip...`);
		zipURL = await downloadRepo(octokit, owner, repo, releaseTag);

		core.info(zipURL)
	}

	const lines = (packages ? packages.split(',') : await readReqs(reqFiles, zipURL)).filter(l => l.trim().length);

	if (!lines || !lines.length) {
		return core.setFailed(`You must either specify a list of packages, or a list of valid requirements files!`);
	}

	const updates = new Set();
	await Promise.all(
		lines.map(async pkg => {
			pkg = pkg.trim();
			core.info(`Checking package: ${pkg}`);
			const data = await rp({
				uri: `https://pypi.org/pypi/${pkg}/json`,
				json: true
			});
			const d = new Date(data.releases[data.info.version][0].upload_time_iso_8601);
			if (d > latestBuildDate) {
				updates.add(pkg);
			}
		})
	);

	core.setOutput("updated_packages", `${[...updates].join(',')}`);
	core.setOutput('update_available', updates.size > 0)
}


const readReqs = async (files, baseDir) => {
	const ret = new Set();

	if (files) {
		files.split(',').filter(f => f.trim().length).map(f => {
			f = path.join(baseDir, f.trim());
			core.info(`Reading: ${f}`);
			const lns = fs.readFileSync(f, 'utf-8').split('\n').filter(Boolean);
			for (let l of lns) {
				if (['<', '=='].every(ig => !l.includes(ig))) {
					if (l.includes('>')) {
						l = l.split('>')[0];
					}
					ret.add(l.trim());
				}
			}
		});
	}

	return [...ret];
};


const downloadRepo = async(octokit, owner, repo, tag) => {
	const url = await octokit.repos.getArchiveLink({
		owner,
		repo,
		archive_format: 'zipball',
		ref: tag
	});

	const buff = await rp({
		uri: url.url,
		method: "GET",
		encoding: null,
		headers: {
			"Content-type": "application/zip"
		}
	});

	const zip = new AdmZip(buff);

	return zip.getEntries();
};


run().catch(err => {
	core.setFailed(`${err}`);
});
