/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

'use strict';

class Systemd {
	constructor(version, cmdline) {
		this.tty_dom = document.querySelector('#tty');
		const welcome = document.createElement('div');
		welcome.className = 'tty-line';
		welcome.innerText = `misskey-temp ${version} running in Web mode. cmdline: ${cmdline}`;
		this.tty_dom.appendChild(welcome);
	}
	async start(id, promise) {
		let state = { state: 'running' };
		let persistentDom = null;
		const started = Date.now();
		const formatRunning = () => {
			const shiftArray = (arr, n) => {
				return arr.slice(n).concat(arr.slice(0, n));
			};
			const elapsed_secs = Math.floor((Date.now() - started) / 1000);
			const stars = shiftArray([' ', '*', '*', '*', ' ', ' '], elapsed_secs % 6);
			const spanStatus = document.createElement('span');
			spanStatus.innerText = stars.join('');
			spanStatus.className = 'tty-status-running';
			const spanMessage = document.createElement('span');
			spanMessage.innerText = `A start job is running for ${id} (${elapsed_secs}s / no limit)`;
			const div = document.createElement('div');
			div.className = 'tty-line';
			div.innerHTML = '[';
			div.appendChild(spanStatus);
			div.innerHTML += '] ';
			div.appendChild(spanMessage);
			return div;
		};
		const formatDone = () => {
			const elapsed_secs = (Date.now() - started) / 1000;
			const spanStatus = document.createElement('span');
			spanStatus.innerText = '  OK  ';
			spanStatus.className = 'tty-status-ok';
			const spanMessage = document.createElement('span');
			spanMessage.innerText = `Finished ${id} in ${elapsed_secs.toFixed(3)}s`;
			const div = document.createElement('div');
			div.className = 'tty-line';
			div.innerHTML = '[';
			div.appendChild(spanStatus);
			div.innerHTML += '] ';
			div.appendChild(spanMessage);
			return div;
		};
		const formatFailed = (message) => {
			const elapsed_secs = (Date.now() - started) / 1000;
			const spanStatus = document.createElement('span');
			spanStatus.innerText = 'FAILED';
			spanStatus.className = 'tty-status-failed';
			const spanMessage = document.createElement('span');
			spanMessage.innerText = `Failed ${id} in ${elapsed_secs.toFixed(3)}s: ${message}`;
			const div = document.createElement('div');
			div.className = 'tty-line';
			div.innerHTML = '[';
			div.appendChild(spanStatus);
			div.innerHTML += '] ';
			div.appendChild(spanMessage);
			return div;
		};
		const render = () => {
			switch (state.state) {
				case 'running':
					if (persistentDom === null) {
						persistentDom = formatRunning();
						this.tty_dom.appendChild(persistentDom);
					} else {
						persistentDom.innerHTML = formatRunning().innerHTML;
					}
					break;
				case 'done':
					if (persistentDom === null) {
						persistentDom = formatDone();
						this.tty_dom.appendChild(persistentDom);
					} else {
						persistentDom.innerHTML = formatDone().innerHTML;
					}
					break;
				case 'failed':
					if (persistentDom === null) {
						persistentDom = formatFailed(state.message);
						this.tty_dom.appendChild(persistentDom);
					} else {
						persistentDom.innerHTML = formatFailed(state.message).innerHTML;
					}
					break;
			}
		};
		render();
		const interval = setInterval(render, 500);
		try {
			let res = await promise;
			state = { state: 'done' };
			return res;
		} catch (e) {
			if (e instanceof Error) {
				state = { state: 'failed', message: e.message };
			} else {
				state = { state: 'failed', message: 'Unknown error' };
			}
			throw e;
		} finally {
			clearInterval(interval);
			render();
		}
	}
	async startSync(id, func) {
		return this.start(id, (async () => {
			return func();
		})());
	}
	emergency_mode(code, details) {
		``;
		const divPrev = document.createElement('div');
		divPrev.className = 'tty-line';
		divPrev.innerText = 'Critical error occurred [' + code + '] : ' + details.message ? details.message : details;
		this.tty_dom.appendChild(divPrev);
		const div = document.createElement('div');
		div.className = 'tty-line';
		div.innerText = 'You are in emergency mode. Type Ctrl-Shift-I to view system logs. Clearing local storage by going to /flush and browser settings may help.';
		this.tty_dom.appendChild(div);
	}
}

// ブロックの中に入れないと、定義した変数がブラウザのグローバルスコープに登録されてしまい邪魔なので
(async () => {
	window.onerror = (e) => {
		console.error(e);
		renderError('SOMETHING_HAPPENED', e);
	};
	window.onunhandledrejection = (e) => {
		console.error(e);
		renderError('SOMETHING_HAPPENED_IN_PROMISE', e);
	};

	const cmdline = new URLSearchParams(location.search).get('cmdline') || '';
	const cmdlineArray = cmdline.split(',').map(x => x.trim());
	if (cmdlineArray.includes('nosplash')) {
		document.querySelector('#splashIcon').classList.add('hidden');
		document.querySelector('#splashSpinner').classList.add('hidden');
	}

	const systemd = new Systemd(VERSION, cmdline);

	if (cmdlineArray.includes('leak')) {
		await systemd.start('Promise Leak Service', new Promise(() => { }));
	}

	let forceError = localStorage.getItem('forceError');
	if (forceError != null) {
		await systemd.startSync('Force Error Service', () => {
			throw new Error('This error is forced by having forceError in local storage.');
		});
	}

	//#region Detect language & fetch translations
	if (!localStorage.hasOwnProperty('locale')) {
		const supportedLangs = LANGS;
		let lang = localStorage.getItem('lang');
		if (lang == null || !supportedLangs.includes(lang)) {
			if (supportedLangs.includes(navigator.language)) {
				lang = navigator.language;
			} else {
				lang = supportedLangs.find(x => x.split('-')[0] === navigator.language);

				// Fallback
				if (lang == null) lang = 'en-US';
			}
		}

		const metaRes = await systemd.start('Fetch /api/meta', window.fetch('/api/meta', {
			method: 'POST',
			body: JSON.stringify({}),
			credentials: 'omit',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json',
			},
		}));
		if (metaRes.status !== 200) {
			renderError('META_FETCH');
			return;
		}
		const meta = await systemd.start('Parse /api/meta', metaRes.json());
		const v = meta.version;
		if (v == null) {
			renderError('META_FETCH_V');
			return;
		}

		// for https://github.com/misskey-dev/misskey/issues/10202
		if (lang == null || lang.toString == null || lang.toString() === 'null') {
			console.error('invalid lang value detected!!!', typeof lang, lang);
			lang = 'en-US';
		}

		const localRes = await systemd.start('Fetch Locale files', window.fetch(`/assets/locales/${lang}.${v}.json`));
		if (localRes.status === 200) {
			localStorage.setItem('lang', lang);
			localStorage.setItem('locale', await localRes.text());
			localStorage.setItem('localeVersion', v);
		} else {
			renderError('LOCALE_FETCH');
			return;
		}
	}
	//#endregion

	//#region Script
	async function importAppScript() {
		await systemd.start('Load App Script', import(`/vite/${CLIENT_ENTRY}`))
			.catch(async e => {
				console.error(e);
				renderError('APP_IMPORT', e);
			});
	}

	if (cmdlineArray.includes('fail')) {
		await systemd.startSync('Force Error Service', () => {
			throw new Error('This error is forced by having fail in command line.');
		});
	}

	// タイミングによっては、この時点でDOMの構築が済んでいる場合とそうでない場合とがある
	if (document.readyState !== 'loading') {
	 	systemd.start('import App Script', importAppScript());
	} else {
		window.addEventListener('DOMContentLoaded', () => {
			 systemd.start('import App Script', importAppScript());
		});
	}
	//#endregion

	//#region Theme
	const theme = localStorage.getItem('theme');
	if (theme) {
		await systemd.startSync('Apply theme', () => {
			for (const [k, v] of Object.entries(JSON.parse(theme))) {
				document.documentElement.style.setProperty(`--MI_THEME-${k}`, v.toString());

				// HTMLの theme-color 適用
				if (k === 'htmlThemeColor') {
					for (const tag of document.head.children) {
						if (tag.tagName === 'META' && tag.getAttribute('name') === 'theme-color') {
							tag.setAttribute('content', v);
							break;
						}
					}
				}
			}
		});
	}
	const colorScheme = localStorage.getItem('colorScheme');
	if (colorScheme) {
		document.documentElement.style.setProperty('color-scheme', colorScheme);
	}
	//#endregion

	const fontSize = localStorage.getItem('fontSize');
	if (fontSize) {
		document.documentElement.classList.add('f-' + fontSize);
	}

	const useSystemFont = localStorage.getItem('useSystemFont');
	if (useSystemFont) {
		document.documentElement.classList.add('useSystemFont');
	}

	const customCss = localStorage.getItem('customCss');
	if (customCss && customCss.length > 0) {
		await systemd.startSync('Apply custom CSS', () => {
			const style = document.createElement('style');
			style.innerHTML = customCss;
			document.head.appendChild(style);
		});
	}

	async function addStyle(styleText) {
		await systemd.startSync('Apply custom Style', () => {
			let css = document.createElement('style');
			css.appendChild(document.createTextNode(styleText));
			document.head.appendChild(css);
		});
	}

	async function renderError(code, details) {
		systemd.emergency_mode(code, details);
		if (document.readyState === 'loading') {
			await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve));
		}
		document.body.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 9v4" /><path d="M12 16v.01" /></svg>
		<div class="message">読み込みに失敗しました</div>
		<div class="submessage">Failed to initialize Misskey</div>
		<div class="submessage">Error Code: ${code}</div>
		<button onclick="location.reload(!0)">
			<div>リロード</div>
			<div><small>Reload</small></div>
		</button>`;
		addStyle(`
		#misskey_app,
		#splash {
			display: none !important;
		}

		html,
		body {
			margin: 0;
		}

		body {
			position: relative;
			color: #dee7e4;
			font-family: Hiragino Maru Gothic Pro, BIZ UDGothic, Roboto, HelveticaNeue, Arial, sans-serif;
			line-height: 1.35;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			margin: 0;
			padding: 24px;
			box-sizing: border-box;
			overflow: hidden;

			border-radius: var(--radius, 12px);
			border: 1px solid rgba(231, 255, 251, 0.14);
		}

		body::before {
			content: '';
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: #192320;
			border-radius: var(--radius, 12px);
			z-index: -1;
		}

		html.embed.norounded body,
		html.embed.norounded body::before {
			border-radius: 0;
		}

		html.embed.noborder body {
			border: none;
		}

		.icon {
			max-width: 60px;
			width: 100%;
			height: auto;
			margin-bottom: 20px;
			color: #dec340;
		}

		.message {
			text-align: center;
			font-size: 20px;
			font-weight: 700;
			margin-bottom: 20px;
		}

		.submessage {
			text-align: center;
			font-size: 90%;
			margin-bottom: 7.5px;
		}

		.submessage:last-of-type {
			margin-bottom: 20px;
		}

		button {
			padding: 7px 14px;
			min-width: 100px;
			font-weight: 700;
			font-family: Hiragino Maru Gothic Pro, BIZ UDGothic, Roboto, HelveticaNeue, Arial, sans-serif;
			line-height: 1.35;
			border-radius: 99rem;
			background-color: #b4e900;
			color: #192320;
			border: none;
			cursor: pointer;
			-webkit-tap-highlight-color: transparent;
		}

		button:hover {
			background-color: #c6ff03;
		}`);
	}
})();
