/* jshint undef:true, node: true, loopfunc: true, maxlen: 160, camelcase: false */
var Promise = require('bluebird'),
	exec = require('child_process').exec,
	cproc = require('child_process'),
	await = require('asyncawait/await'),
	config = require('config'),
	escapeHTML = require('escape-html'),
	_ = require('lodash'),
	join = require('join-component'),
	logger = require('tracer').console({
		format: '{{file}}:{{line}} {{message}}'
	});
require('sugar');

function whittaker(word, whDir, whExec) {
	if (!/^[a-zA-Z ]+$/.test(word)) {
		return []; // Extra extra security, since we are executing shell commands
	} else {
		var stdout = await(Promise.promisify(cproc.execFile)(whExec, [word], {
			cwd: whDir
		}))[0];
		return whProcess(word, (stdout + '').split(config.unix ? '\n' : '\r\n'));
	}
}

function whProcess(word, result) {
	// logger.log(result);

	var pointless = [ // pointless messages
		'PERF PASSIVE PPL + verb TO_BE => PASSIVE perfect system',
		//	'FUT ACTIVE PPL + verb TO_BE => ACTIVE Periphrastic - about to, going to',    <-- These two actually ARE necessary
		//	'FUT PASSIVE PPL + verb TO_BE => PASSIVE Periphrastic - should/ought/had to',
		'PERF PASSIVE PPL + esse => PERF PASSIVE INF',
		'FUT ACTIVE PPL + esse => PRES Periphastic/FUT ACTIVE INF - be about/going to',
		'FUT ACT PPL+fuisse => PERF ACT INF Periphrastic - to have been about/going to',
		'FUT PASSIVE PPL + esse => PRES PASSIVE INF',
		'FUT PASSIVE PPL + fuisse => PERF PASSIVE INF Periphrastic - about to, going to',
		'SUPINE + iri => FUT PASSIVE INF - to be about/going/ready to be ~'
	].map(escapeHTML);
	var repl = {
		'PRON': 'pron.',
		'PACK': 'suffix',
		'ADJ': 'adj.',
		'NUM': 'numeral',
		'ADV': 'adv.',
		'V': 'verb',
		'VPAR': 'part.',
		'SUPINE': 'supine',
		'PREP': 'prep.',
		'CONJ': 'conj.',
		'INTERJ': 'interj.',
		'TACKON': 'suffix',
		'PREFIX': 'prefix',
		'SUFFIX': 'suffix',
		'M': 'masc.',
		'F': 'fem.',
		'N': 'neut.',
		'C': 'masc./fem.',
		'NOM': 'nom.',
		'VOC': 'voc.',
		'GEN': 'gen.',
		'LOC': 'loc.',
		'DAT': 'dat.',
		'ABL': 'abl.',
		'ACC': 'acc.',
		'S': 'sing.',
		'P': 'pl.',
		'1': '1st-person',
		'2': '2nd-person',
		'3': '3rd-person',
		'POS': '',
		'COMP': 'comparative',
		'SUPER': 'superlative',
		'CARD': '',
		'ORD': '',
		'DIST': '',
		'ADVERB': '',
		'PRES': 'pres.',
		'IMPF': 'impf.',
		'FUT': 'fut.',
		'PERF': 'perf.',
		'PLUP': 'plupf.',
		'FUTP': 'futpf.',
		'ACTIVE': 'act.',
		'PASSIVE': 'pass.',
		'IND': '',
		'SUB': 'subjunc.',
		'IMP': 'imperative',
		'INF': 'infin.',
		'PPL': 'part.'
	};
	// First, group the lines together based on Pearse code

	var prevCode = -1;
	var list = [];

	result.filter(function(x) {
		return x.trim();
	}).forEach(function(line) {
		var code = parseInt(line.slice(0, 3)) || 0; // Pearse code, or 0 if none

		line = (line.remove(/^0[0-9] /g)).replace(/=>/g, '→');

		var was5 = false;
		if (code == 5) {
			code = 1;
			was5 = true;
		}
		if (code == 6) {
			code = (prevCode == 1) ? 3 : 0;
		}
		if (code == 1 && prevCode != 1) {
			list.push([]);
		} else if (list.length === 0) {
			list.push([]);
		}
		if (code != 3) {
			line = escapeHTML(line);
		}
		(list[list.length - 1][code] || (list[list.length - 1][code] = [])).push(line);
		if (was5) {
			(list[list.length - 1][2] || (list[list.length - 1][2] = [])).push(line);
		}
		prevCode = code;
	});

	return list.filter(function(group) {
		return !group[4];
	}).map(function(group) {
		var res = {};
		var cTitle = word;
		if (group[1] && group[3] &&
			group[1][0] == 'e                    SUFFIX' &&
			group[3][0] == '-ly; -ily;  Converting ADJ to ADV') {
			group[2] = group[1];
		}
		if (group[1] && group[3] &&
			group[1][0] == 'e                    SUFFIX' &&
			group[3][0] == '-estly; -estily; most -ly, very -ly  Converting ADJ to ADV') {
			group[1][0] = 'm' + group[1][0];
			group[2] = group[1];
		}
		if (group[0]) {
			res.note = group[0].filter(function(x) {
				return pointless.indexOf(x) == -1;
			}).map(function(x) {
				return x.trim();
			}).join('; ');
		}
		if (group[1]) {
			var allstarts = _.uniq(group[1].map(function(x) {
				x = x.trim().replace(/ +/g, ' ').split(' ');
				return x[0] || '';
			}));
			var bits = group[1].map(function(possForm, possNum) {
				possForm = possForm.trim().replace(/ +/g, ' ').replace(' + ', '+').split(' ');

				var pos = possForm[1];
				possForm = possForm.map(function(part, index) {
					// logger.log(part, index,(index === 2 || index === 3) && part.has(/^[0-9]$/));
					if ( // Get rid of a bunch of irrelevant bits of grammar
						pos === 'VPAR' && part === 'PPL' ||
						pos === 'PREP' && part.has(/^(ACC|ABL)$/) ||
						pos === 'N' && part.has(/^(M|F|N|C)$/) ||
						part === 'X' ||
						(index === 2 || index === 3) && part.has(/^[0-9]$/) ||
						index === 1 && group[2] && (group[2][0].endsWith(part) || group[2][0].has(' ' + part + ' ')) ||
						index === 1 && part == 'SUFFIX' ||
						pos === 'V' && part === '0'
					) {
						return '';
					} else if (index === 1 && part === 'N') {
						return 'noun';
					} else if (part in repl) {
						return repl[part];
					}
					return part;
				});

				var txt = (possForm[0] + '').remove('.');
				if (txt !== word && txt && (allstarts.length > 1 || possNum === 0)) {
					if (word.startsWith(txt)) {
						txt = txt + '-';
					} else if (word.endsWith(txt)) {
						txt = '-' + txt;
					} else if (word.has(txt)) {
						txt = '-' + txt + '-';
					}
					cTitle = txt;
					possForm[0] = '<em>' + txt + '</em> = ';
				} else {
					possForm[0] = '';
				}

				if (possForm[1]) {
					possForm.push(possForm[1]);
					delete possForm[1];
				}
				return possForm.filter(function(x) {
					return x;
				}).join(' ').remove(/ = $/);

			}).filter(function(x) {
				return x;
			});

			if (bits.length > 0) {
				if (allstarts.length > 1) {
					res.possforms = bits.join('; ');
				} else {
					res.possforms = join(bits, ', or') + ' from:';
				}
			}
		}
		if (group[2]) {
			var grammar = group[2][0]
				.remove(/\[[A-Z]{5}\]/g)
				.trim()
				.replace(/ - /g, ' — ')
				.replace(/ -, /g, ' —, ')
				.replace(/ TACKON$/, ' SUFFIX');
			var matches = /^(.*?)([, ].*)?$/.exec(grammar);
			res.heading = matches[1];
			res.grammar = matches[2];
		} else if (group[1]) {
			res.heading = cTitle;
		}
		if (group[3]) {
			res.defs = '<ul><li>' + group[3]
				.join(';')
				.split(';')
				.map(function(def) {
					return escapeHTML(
						def.remove(/^(-(que|ne|ve|est) = )|^- |\(L\+S\)|>/g).trim()
					).replace(/^(.+?)(?=\()|^[^(]+$/, function(match) {
						return '<strong>' + match.replace(/(, |\/)/g, '</strong>$1<strong>') + '</strong>';
					});
				})
				.filter(function(x) {
					return x;
				})
				.join('</li><li>') + '</li></ul>';
		}
		return {
			'cardtitle': cTitle,
			'text': res,
			'whittakers': true
		};

	}).filter(function(card) {
		return card.text.defs || card.text.heading || card.text.note || card.text.possForms;
	});
}

module.exports = whittaker;