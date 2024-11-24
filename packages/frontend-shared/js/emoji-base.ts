/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const twemojiSvgBase = '/twemoji';
const fluentEmojiPngBase = '/fluent-emoji';
const blobmojiSvgBase = '/blobmoji';
const notoEmojiSvgBase = '/notoemoji';

export function chat2pathSelector(emojiStyle: string): (char: string) => string {
	switch (emojiStyle) {
		case 'twemoji':
			return char2twemojiFilePath;
		case 'fluentEmoji':
			return char2fluentEmojiFilePath;
		case 'notoEmoji':
			return char2NotoEmojiFilePath;
		case 'blobmoji':
		default:
			return char2BlobmojiFilePath;
	}
}

function char2twemojiFilePath(char: string): string {
	let codes = Array.from(char, x => x.codePointAt(0)?.toString(16));
	if (!codes.includes('200d')) codes = codes.filter(x => x !== 'fe0f');
	codes = codes.filter(x => x && x.length);
	const fileName = codes.join('-');
	return `${twemojiSvgBase}/${fileName}.svg`;
}

function char2fluentEmojiFilePath(char: string): string {
	let codes = Array.from(char, x => x.codePointAt(0)?.toString(16));
	// Fluent Emojiは国旗非対応 https://github.com/microsoft/fluentui-emoji/issues/25
	if (codes[0]?.startsWith('1f1')) return char2twemojiFilePath(char);
	if (!codes.includes('200d')) codes = codes.filter(x => x !== 'fe0f');
	codes = codes.filter(x => x != null && x.length > 0);
	const fileName = (codes as string[]).map(x => x.padStart(4, '0')).join('-');
	return `${fluentEmojiPngBase}/${fileName}.png`;
}

const blobize = ['😮‍💨', '😵‍💫', '🫠', '🫣', '🫢', '🫡', '🫥', '🫤', '🥹', '🥲', '😶‍🌫️', '🥸', '🐱', '👿', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '😀', '😁', '😂', '😃', '😄', '😅', '😆', '😇', '😈', '😉', '😊', '😋', '😌', '😍', '😎', '😏', '😐', '😑', '😒', '😓', '😔', '😕', '😖', '😗', '😘', '😙', '😚', '😛', '😜', '😝', '😞', '😟', '😠', '😡', '😢', '😣', '😤', '😥', '😦', '😧', '😨', '😩', '😪', '😫', '😬', '😭', '😮', '😯', '😰', '😱', '😲', '😳', '😴', '😵', '😶', '😷', '😸', '😹', '😺', '😻', '😼', '😽', '😾', '😿', '🙀', '🙁', '🙂', '🙃', '🙄', '🤐', '🤑', '🤒', '🤓', '🤔', '🤕', '🤗', '🤠', '🤡', '🤢', '🤣', '🤤', '🤥', '🤧', '🤨', '🤩', '🤪', '🤫', '🤬', '🤭', '🤮', '🤯', '🥰', '🥱', '🥳', '🥴', '🥵', '🥶', '🥺', '🧐', '🧳', '🧴', '🧾', '☹'];

function char2BlobmojiFilePath(char: string): string {
	if (!blobize.includes(char)) return char2NotoEmojiFilePath(char);
	let codes = Array.from(char, x => x.codePointAt(0)?.toString(16).padStart(4, '0'));
	if (!codes.includes('200d')) codes = codes.filter(x => x !== 'fe0f');
	codes = codes.filter(x => x && x.length);
	const fileName = codes.join('_');
	return `${blobmojiSvgBase}/emoji_u${fileName}.svg`;
}

function char2NotoEmojiFilePath(char: string): string {
	let codes = Array.from(char, x => x.codePointAt(0)?.toString(16).padStart(4, '0'));
	// NotoEmojiも国旗非対応
	if (codes[0]?.startsWith('1f1')) return char2twemojiFilePath(char);
	if (!codes.includes('200d')) codes = codes.filter(x => x !== 'fe0f');
	codes = codes.filter(x => x && x.length);
	const fileName = codes.join('_');
	return `${notoEmojiSvgBase}/emoji_u${fileName}.svg`;
}
