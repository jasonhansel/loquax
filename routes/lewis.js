/* jshint undef: true, loopfunc: true, maxlen: 160, camelcase: false, unused: strict, node: true */

var await = require('asyncawait/await'),
	sqlite3 = require('sqlite3'),
	Promise = require('bluebird'),
	xmldom = require('xmldom'),
	jquery = require('jquery'),
	escapeHTML = require('escape-html'),
	demacrize = require('diacritics').remove,
	Stopwatch = require("node-stopwatch").Stopwatch,
	R = require('ramda');
require('sugar');

String.prototype.wrap = function(fmt) {
	return fmt.replace('::', this);
};

var db = new sqlite3.Database('dictionary.sqlite', sqlite3.OPEN_READONLY);
db.parallelize();
var getAll = Promise.promisify(db.all, db);

var remove = R.lPartial(R.flip(R.replace), '');
var wrapStr = R.flip(R.replace('::'));

var map = {
	// Based on https://archive.org/stream/anelementarylat01lewigoog#page/n10/mode/2up
	// in the public domain
	'Cs': 'Caesar',
	'C': 'Cicero',
	'Cu': 'Q. Curtius Rufus',
	'H': 'Horace',
	'Iu': 'Juvenal',
	'L': 'Livy',
	'N': 'Cornelius Nepos',
	'O': 'Ovid',
	'S': 'Sallust',
	'Ta': 'Tacitus',
	'T': 'Terence',
	'V': 'Vergil'
};

var getAbbrTitle = R.pipe(
	R.trim,
	remove(/[. ]/g),
	R.ifElse(
		R.rPartial(R.has, map),
		R.compose(
			wrapStr('title="::"'),
			R.propOf(map)
		),
		R.always('')
	)
);

function processPart(enPart) {
	var text = escapeHTML(enPart.textContent);
	var prev = enPart.previousSibling;
	var next = enPart.nextSibling;
	var tag = enPart.nodeName;
	var prevPrev = prev ? prev.previousSibling : null;
	if (tag == '#text') {

		if (!prev) {
			text = text.remove(/^(I|II|A|B|C)\. /);
		}
		if (prev && prev.nodeName == 'etym') {
			text = text.remove(/^[,.][— ]/);
		}
		if (!next || next.nodeName == 'trans') {
			text = text.remove(/—$/);
		}
		text = text.replace(/—\s*((?:Fig\\.,?|In.*?,|With.*?,|Of .*?,|Ellipt.|Esp.,|of\s*[a-z]{3,10}?,)?)(\s*)(.*?):/g,
			function(match, m1, m2, m3) {
				return '<li>' + m1 + m2 + '<strong>' + m3.replace(/,\s/g, '</strong>, <strong>') + '</strong>:';
			});
		if (next && next.nodeName == 'trans') {
			text = text.replace(/^\.? ?—(.*, )$/, '<li>$1 ');
			if (text !== '—') {
				text = text.remove(/—\s*$/);
			}
		} else {

		}
		text = text.replace(/—\s*/g, '<li>');
		if (!prev || prev.nodeName !== 'emph') {
			text = text.replace(/:\s+$/, '<li>');
		}
		text = text.replace(/—\s+(With|After|In|With a)\s+$/, '<li>$1 ');
		text = text.replace(/( (Cs|C|Cu|H|Iu|L|N|O|S|Ta|T|V)\.)/g, function(match, m1) {
			return '<abbr ' + getAbbrTitle(m1) + '>' + m1 + '</abbr>';
		});
		if (!prev || (prev.nodeName == 'foreign' && prev.getAttribute('lang') == 'greek')) {
			text = text.remove(/^, $/);
		}
	} else if (tag == 'trans') {
		text = text
			.trim()
			.replace(/.—/g, '</strong><li><strong>')
			.replace(/,\s/g, '</strong>, <strong>')
			.remove(/—/g)
			.remove(/&lt;\\*&gt;/g)
			.wrap('<strong>::</strong>');
		if (!prev || prev.nodeName != '#text' || (!(/^\.? ?—(.*), $/.test(prev.textContent)) &&
			!(/( i\. e\.| in rhet\.,|Fig\.,| or| \(|—With|—After|—In| signifies|In [a-z]{3,7},| of [a-z]{3,7},)\s*$/.test(
				prev.textContent)) &&
			!((/^,\s+$/.test(prev.textContent)) && prevPrev && prevPrev.nodeName === 'foreign') &&
			(!(/^\) $/.test(prev.textContent)) || !prevPrev || prevPrev.nodeName !== 'trans')
		)) {
			if (!prev || prev.nodeName !== 'trans') {
				if (prevPrev && prevPrev.nodeName == 'emph') {
					text = text.wrap(' ::');
				} else if (prevPrev && prevPrev.nodeName == 'trans' && /^\s*\(.+\)\s*/.test(prev.textContent)) {
					text = text.wrap(' ::');
				} else {
					text = text.wrap('<li>::');
				}
			}
		}
	} else if (tag == 'foreign') {
		if (enPart.getAttribute('lang') == 'greek' &&
			(!prev || (prev.nodeName == 'text' && prev.textContent == ', ' && !prevPrev))) {
			text = '';

			// Greek text is in "beta code" anyway (not unicode), so we can't display it.
			// All of the JS converters for it are GPL'd (and thus unusable here), and I can't find a PHP one...
		} else {
			text = text.wrap('<i class="foreign">::</i>');
		}
	} else if (tag == 'etym') {
		text = '';
	} else if (tag == 'emph') {
		text = prev ? text.wrap('<em>::</em>') : '';
	} else if (tag == 'usg') {
		text = '<abbr ' + getAbbrTitle(text) + '>' + text + '</abbr>';
	}
	return text;
}

var childByTag = R.useWith(
	R.flip(R.find),
	R.prop('childNodes'),
	R.propEq('nodeName')
);

var childrenByTag = R.useWith(
	R.flip(R.filter),
	R.prop('childNodes'),
	R.propEq('nodeName')
);

var ifObject = R.useWith(
	R.ifElse(
		R.pipe(
			R.type,
			R.eq('Object')
		)
	),
	R.identity,
	R.always
);

function process(entry) {

	var def = (new xmldom.DOMParser()).parseFromString(entry.Def, 'text/xml').documentElement;

	var title = R.pipe(
		R.rPartial(childByTag, 'form'),
		ifObject(R.rPartial(childByTag, 'orth'), null),
		ifObject(R.prop('textContent'), ''),
		R.replace(/[ ]-[ ]/g, '-'),
		R.invokerN(0, 'hankaku')
	)(def);

	var grammar = R.pipe(
		R.converge(
			R.add,
			R.pipe(
				R.rPartial(childByTag, 'gramGrp'),
				ifObject(R.prop('childNodes'), []),
				R.map(function(gramPart) {
					var text = escapeHTML(gramPart.textContent);
					if (gramPart.nodeName == 'itype') {
						return text.split(', ').map(function(part) {
							if (part.trim() === '—') {
								return part.wrap(', ::');
							} else if (!(/^(see|as|old for)/).test(part.trim()) && part.length < 20 && part.trim().length > 0) {
								return part.trim().wrap(', <span class="can-choose">::</span>');
							} else {
								return part;
							}
						}).join(' ');
					} else if (gramPart.nodeName === 'pos') {
						return text.remove(/[,;]$/).wrap(' (::)');
					} else {
						return text;
					}
				}),
				R.join(''),
				R.trim,
				remove(/,$/),
				R.replace(/\s+/g, ' '),
				R.replace(/^(?!,|$)/, ' ')
			),
			R.pipe(
				R.rPartial(childByTag, 'sense'),
				ifObject(R.prop('childNodes'), null),
				ifObject(R.head, null),
				R.ifElse(
					ifObject(R.propEq('nodeName', 'emph'), false),
					R.pipe(
						R.prop('textContent'),
						R.trim,
						wrapStr(' (::)')
					),
					R.always('')
				)
			)
		),
		R.invokerN(0, 'hankaku')
	)(def);

	var defs = R.pipe(
		R.rPartial(childrenByTag, 'sense'),
		R.pluck('childNodes'),
		R.flatten,
		R.map(processPart),
		R.join(''),
		R.invokerN(0, 'hankaku'),
		R.trim,
		R.replace(/^(?!<li|$)/, '<li>'),
		R.invokerN(1, 'wrap')('<ul>::</ul>')
	)(def);

	// console.log('MS', Date.now() - now);

	return {
		whittakers: false,
		cardtitle: demacrize(title),
		text: {
			heading: title,
			grammar: grammar,
			// defs: JSON.parse(entry.DefParsed).text.defs
			defs: defs
		}
	};
}

module.exports = function lewis(search) {
	// Go through, e.g., 'd', 'de', and 'dea', to see how many letters at the start of the search are also at the start of the Key.

	return await(getAll(
		'WITH RECURSIVE prefixes(x, prefix) ' +
		'as ( values( length($search), upper($search) ) union all select x-1, substr(prefix, 1, x-1)  from prefixes where x > 1 ) ' +
		'select Def from Dictionary ' +
		'where FirstLetter = $fl ' + // For perf, don't use prefixes here...
		'order by ( select max(x) from prefixes where instr(upper(Key), prefix) == 1) desc, Length asc ' +
		'limit 10', {
			$search: search,
			$fl: search.slice(0, 1).toUpperCase()
		}
	)).map(process);
};