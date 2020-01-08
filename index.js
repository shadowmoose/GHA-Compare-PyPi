const github = require('@actions/github');
const core = require('@actions/core');
const https = require('https');
const fs = require('fs');


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

	const lines = (packages ? packages.split(',') : readReqs(reqFiles)).filter(l => l.trim().length);

	if (!lines || !lines.length) {
		return core.setFailed(`You must either specify a list of packages, or a list of valid requirements files!`);
	}

	const updates = new Set();
	await Promise.all(
		lines.map(async package => {
			core.info(`Checking package: ${package}`);
			const data = JSON.parse(await read(`https://pypi.org/pypi/${package.trim()}/json`));
			const d = new Date(data.releases[data.info.version][0].upload_time_iso_8601);
			if (d > latestBuildDate) {
				updates.add(package);
			}
		})
	);

	core.setOutput("updated_packages", `${[...updates].join(',')}`);
	core.setOutput('update_available', updates.size > 0)
}


const read = (url) => {
	return new Promise((resolve, reject) => {
		https.get(url, (resp) => {
			let data = '';
			resp.on('data', (chunk) => {data += chunk;});
			resp.on('end', () => {resolve(data);});
		}).on("error", (err) => {
			reject(err);
		});
	});
};


const readReqs = files => {
	const ret = new Set();

	if (files) {
		files.split(',').filter(f => f.trim().length).map(f => {
			core.info(`Reading: ${f}`);
			const lns = fs.readFileSync(f, 'utf-8').split('\n').filter(Boolean);
			for (const l of lns) {
				if (['<', '=='].all(ig => !l.includes(ig))) {
					ret.add(l.trim());
				}
			}
		});
	}

	return ret;
};

run().catch(err => {
	core.setFailed(`${err}`);
});
