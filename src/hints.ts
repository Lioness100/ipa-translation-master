/* eslint-disable unicorn/string-content */
const singleCharacterHints: Record<string, string> = {
	æ: 'c(a)t',
	ə: 'sof(a)',
	a: 'f(a)ther',
	ʌ: 'b(u)t',
	ɪ: 'b(i)t',
	ʊ: 'b(oo)k',
	ɔ: 'l(aw)',
	ɛ: 'b(e)d',
	ɑ: 'c(o)t',
	i: 's(ee)',
	u: 'b(oo)t',
	e: 'b(a)te',
	ɝ: 'b(ir)d',
	θ: '(th)ink',
	ð: '(th)is',
	ʃ: '(sh)e',
	ʒ: 'mea(s)ure',
	ŋ: 'si(ng)',
	ɹ: '(r)ed',
	l: '(l)ove',
	w: '(w)e',
	j: '(y)es',
	h: '(h)ouse',
	p: '(p)et',
	b: '(b)et',
	t: '(t)op',
	d: '(d)og',
	k: '(c)at',
	g: '(g)o',
	f: '(f)un',
	v: '(v)ery',
	s: '(s)it',
	z: '(z)oo',
	m: '(m)y',
	n: '(n)o'
};

const multiCharacterHints: Record<string, string> = {
	tʃ: '(ch)eck',
	dʒ: '(j)ump',
	aj: '(i)ce',
	aw: '(ou)t',
	ej: '(a)te',
	ow: 'b(o)ne',
	ɔj: '(oy)',
	ɪə: '(ear)',
	ɛə: '(air)',
	ʊə: '(our)'
};

const hints = {
	...singleCharacterHints,
	...multiCharacterHints
};

export function getHints(ipa: string) {
	const foundSymbols: string[] = [];
	const symbols = [...Object.keys(multiCharacterHints), ...Object.keys(singleCharacterHints)];

	let i = 0;
	outer: while (i < ipa.length) {
		for (const symbol of symbols) {
			if (ipa.startsWith(symbol, i)) {
				foundSymbols.push(symbol);
				i += symbol.length;
				continue outer;
			}
		}

		i++;
	}

	return foundSymbols.map((symbol) => ({ symbol, example: hints[symbol] }));
}
