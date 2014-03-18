/*
Copyright 2011-14 Newcastle University

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/** @file Mathematical functions, providing stuff that the built-in `Math` object doesn't, as well as vector and matrix math operations. 
 *
 * Provides {@link Numbas.math}, {@link Numbas.vectormath} and {@link Numbas.matrixmath}
 */

Numbas.queueScript('math',['base'],function() {

/** Mathematical functions, providing stuff that the built-in `Math` object doesn't
 * @namespace Numbas.math */

/** @typedef complex
 * @property {number} re
 * @property {number} im
 */

/** @typedef range
 * @desc A range of numbers, separated by a constant intervaland between fixed lower and upper bounds.
 * @type {number[]}
 * @property {number} 0 Minimum value
 * @property {number} 1 Maximum value
 * @property {number} 2 Step size
 * @see Numbas.math.defineRange
 */

var math = Numbas.math = /** @lends Numbas.math */ {

	/** Regex to match numbers in scientific notation */
	re_scientificNumber: /(\-?(?:0|[1-9]\d*)(?:\.\d+)?)[eE]([\+\-]?\d+)/,
	
	/** Construct a complex number from real and imaginary parts.
	 *
	 * Elsewhere in this documentation, `{number}` will refer to either a JavaScript float or a {@link complex} object, interchangeably.
	 * @param {number} re
	 * @param {number} im
	 * @returns {complex}
	 */
	complex: function(re,im)
	{
		if(!im)
			return re;
		else
			return {re: re, im: im, complex: true, 
			toString: math.complexToString}
	},
	
	/** String version of a complex number
	 * @returns {string}
	 * @method
	 * @memberof! complex
	 */
	complexToString: function()
	{
		return math.niceNumber(this);
	},

	/** Negate a number.
	 * @param {number} n
	 * @returns {number}
	 */
	negate: function(n)
	{
		if(n.complex)
			return math.complex(-n.re,-n.im);
		else
			return -n;
	},

	/** Complex conjugate
	 * @param {number} n
	 * @returns {number}
	 */
	conjugate: function(n)
	{
		if(n.complex)
			return math.complex(n.re,-n.im);
		else
			return n;
	},

	/** Add two numbers
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	add: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return math.complex(a.re+b.re, a.im + b.im);
			else
				return math.complex(a.re+b, a.im);
		}
		else
		{
			if(b.complex)
				return math.complex(a + b.re, b.im);
			else
				return a+b;
		}
	},

	/** Subtract one number from another
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	sub: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return math.complex(a.re-b.re, a.im - b.im);
			else
				return math.complex(a.re-b, a.im);
		}
		else
		{
			if(b.complex)
				return math.complex(a - b.re, -b.im);
			else
				return a-b;
		}
	},

	/** Multiply two numbers
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	mul: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return math.complex(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
			else
				return math.complex(a.re*b, a.im*b);
		}
		else
		{
			if(b.complex)
				return math.complex(a*b.re, a*b.im);
			else
				return a*b;
		}
	},

	/** Divide one number by another
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	div: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
			{
				var q = b.re*b.re + b.im*b.im;
				return math.complex((a.re*b.re + a.im*b.im)/q, (a.im*b.re - a.re*b.im)/q);
			}
			else
				return math.complex(a.re/b, a.im/b);
		}
		else
		{
			if(b.complex)
			{
				var q = b.re*b.re + b.im*b.im;
				return math.complex(a*b.re/q, -a*b.im/q);
			}
			else
				return a/b;
		}
	},

	/** Exponentiate a number
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	pow: function(a,b)
	{
		if(a.complex && Numbas.util.isInt(b) && Math.abs(b)<100)
		{
			if(b<0)
				return math.div(1,math.pow(a,-b));
			if(b==0)
				return 1;
			var coeffs = math.binomialCoefficients(b);

			var re = 0;
			var im = 0;
			var sign = 1;
			for(var i=0;i<b;i+=2) {
				re += coeffs[i]*Math.pow(a.re,b-i)*Math.pow(a.im,i)*sign;
				im += coeffs[i+1]*Math.pow(a.re,b-i-1)*Math.pow(a.im,i+1)*sign;
				sign = -sign;
			}
			if(b%2==0)
				re += Math.pow(a.im,b)*sign;
			return math.complex(re,im);
		}
		if(a.complex || b.complex || (a<0 && math.fract(b)!=0))
		{
			if(!a.complex)
				a = {re: a, im: 0, complex: true};
			if(!b.complex)
				b = {re: b, im: 0, complex: true};
			var ss = a.re*a.re + a.im*a.im;
			var arg1 = math.arg(a);
			var mag = Math.pow(ss,b.re/2) * Math.exp(-b.im*arg1);
			var arg = b.re*arg1 + (b.im * Math.log(ss))/2;
			return math.complex(mag*Math.cos(arg), mag*Math.sin(arg));
		}
		else
		{
			return Math.pow(a,b);
		}
	},

	/** Calculate the Nth row of Pascal's triangle
	 * @param {number} n
	 * @returns {number[]}
	 */
	binomialCoefficients: function(n) {
		var b = [1];
		var f = 1;

		for(var i=1;i<=n;i++) { 
			b.push( f*=(n+1-i)/i );
		}
		return b;
	},

	/** Calculate the `b`-th root of `a`
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	root: function(a,b)
	{
		return math.pow(a,div(1,b));
	},

	/** Square root
	 * @param {number} n
	 * @returns {number}
	 */
	sqrt: function(n)
	{
		if(n.complex)
		{
			var r = math.abs(n);
			return math.complex( Math.sqrt((r+n.re)/2), (n.im<0 ? -1 : 1) * Math.sqrt((r-n.re)/2));
		}
		else if(n<0)
			return math.complex(0,Math.sqrt(-n));
		else
			return Math.sqrt(n)
	},

	/** Natural logarithm (base `e`)
	 * @param {number} n
	 * @returns {number}
	 */
	log: function(n)
	{
		if(n.complex)
		{
			var mag = math.abs(n);
			var arg = math.arg(n);
			return math.complex(Math.log(mag), arg);
		}
		else if(n<0)
			return math.complex(Math.log(-n),Math.PI);
		else
			return Math.log(n);
	},

	/** Calculate `e^n`
	 * @param {number} n
	 * @returns {number}
	 */
	exp: function(n)
	{
		if(n.complex)
		{
			return math.complex( Math.exp(n.re) * Math.cos(n.im), Math.exp(n.re) * Math.sin(n.im) );
		}
		else
			return Math.exp(n);
	},
	
	/** Magnitude of a number - absolute value of a real; modulus of a complex number.
	 * @param {number} n
	 * @returns {number}
	 */
	abs: function(n)
	{
		if(n.complex)
		{
			if(n.re==0)
				return Math.abs(n.im);
			else if(n.im==0)
				return Math.abs(n.re);
			else
				return Math.sqrt(n.re*n.re + n.im*n.im)
		}
		else
			return Math.abs(n);
	},

	/** Argument of a (complex) number
	 * @param {number} n
	 * @returns {number}
	 */
	arg: function(n)
	{
		if(n.complex)
			return Math.atan2(n.im,n.re);
		else
			return Math.atan2(0,n);
	},

	/** Real part of a number
	 * @param {number} n
	 * @returns {number}
	 */
	re: function(n)
	{
		if(n.complex)
			return n.re;
		else
			return n;
	},

	/** Imaginary part of a number
	 * @param {number} n
	 * @returns {number}
	 */
	im: function(n)
	{
		if(n.complex)
			return n.im;
		else
			return 0;
	},

	/** Is `a` less than `b`?
	 * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 */
	lt: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.order complex numbers'));
		return a<b;
	},

	/** Is `a` greater than `b`?
	 * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 */
	gt: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.order complex numbers'));
		return a>b;
	},

	/** Is `a` less than or equal to `b`?
	 * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 */
	leq: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.order complex numbers'));
		return a<=b;
	},
	
	/** Is `a` greater than or equal to `b`?
	 * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 */
	geq: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.order complex numbers'));
		return a>=b;
	},

	/** Is `a` equal to `b`?
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 */
	eq: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
				return (a.re==b.re && a.im==b.im);
			else
				return (a.re==b && a.im==0);
		}
		else
		{
			if(b.complex)
				return (a==b.re && b.im==0);
			else
				return a==b;
		}
	},

	/** Greatest of two numbers - wraps `Math.max`
	 * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	max: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.order complex numbers'));
		return Math.max(a,b);
	},


	/** Least of two numbers - wraps `Math.min`
	 * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	min: function(a,b)
	{
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.order complex numbers'));
		return Math.min(a,b);
	},
	
	/** Are `a` and `b` unequal?
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 * @see Numbas.math.eq
	 */
	neq: function(a,b)
	{
		return !math.eq(a,b);
	},

	/** If `n` can be written in the form `a*pi^n`, return the biggest possible `n`, otherwise return `0`.
	 * @param {number} n
	 * @returns {number}
	 */
	piDegree: function(n)
	{
		n=Math.abs(n);

		if(n>10000)	//so big numbers don't get rounded to a power of pi accidentally
			return 0;

		var degree,a;
		for(degree=1; (a=n/Math.pow(Math.PI,degree))>1 && Math.abs(a-math.round(a))>0.00000001; degree++) {}
		return( a>=1 ? degree : 0 );
	},

	/** Display a number nicely - rounds off to 10dp so floating point errors aren't displayed
	 * @param {number} n
	 * @param {object} options - `precisionType` is either "dp" or "sigfig"
	 * @returns {string}
	 */
	niceNumber: function(n,options)
	{
		options = options || {};
		if(n.complex)
		{
			var re = math.niceNumber(n.re,options);
			var im = math.niceNumber(n.im,options);
			if(math.precround(n.im,10)==0)
				return re+'';
			else if(math.precround(n.re,10)==0)
			{
				if(n.im==1)
					return 'i';
				else if(n.im==-1)
					return '-i';
				else
					return im+'*i';
			}
			else if(n.im<0)
			{
				if(n.im==-1)
					return re+' - i';
				else
					return re+im+'*i';
			}
			else
			{
				if(n.im==1)
					return re+' + '+'i';
				else
					return re+' + '+im+'*i';
			}
		}
		else	
		{
			if(n==Infinity)
				return 'infinity';

			var piD;
			if((piD = math.piDegree(n)) > 0)
				n /= Math.pow(Math.PI,piD);

			var out;
			switch(options.precisionType) {
			case 'sigfig':
				var precision = options.precision;
				out = math.siground(n,precision)+'';
				var sigFigs = math.countSigFigs(out);
				if(sigFigs<precision) {
					if(out.indexOf('.')==-1)
						out += '.';
					for(var i=0;i<precision-sigFigs;i++)
						out+='0';
				}
				break;
			case 'dp':
				var precision = options.precision;
				out = math.precround(n,precision)+'';
				var dp = math.countDP(out);
				if(dp<precision) {
					if(out.indexOf('.')==-1)
						out += '.';
					for(var i=0;i<precision-dp;i++)
						out+='0';
				}
				break;
			default:
				out = math.precround(n,10)+'';
			}
			switch(piD)
			{
			case 0:
				return out;
			case 1:
				if(n==1)
					return 'pi';
				else
					return out+'*pi';
			default:
				if(n==1)
					return 'pi^'+piD;
				else
					return out+'*pi'+piD;
			}
		}
	},

	/** Get a random number in range `[0..n-1]`
	 * @param {number} n
	 * @returns {number}
	 */
	randomint: function(n) {
		return Math.floor(n*(Math.random()%1)); 
	},

	/** Get a  random shuffling of the numbers `[0..n-1]`
	 * @param {number} n
	 * @returns {number[]}
	 */
	deal: function(N) 
	{ 
		var J, K, Q = new Array(N);
		for (J=0 ; J<N ; J++)
			{ K = math.randomint(J+1) ; Q[J] = Q[K] ; Q[K] = J; }
		return Q; 
	},

	/** Randomly shuffle a list. Returns a new list - the original is unmodified.
	 * @param {Array} list
	 * @returns {Array}
	 */
	shuffle: function(list) {
		var l = list.length;
		var permutation = math.deal(l);
		var list2 = new Array(l);
		for(var i=0;i<l;i++) {
			list2[i]=(list[permutation[i]]);
		}
		return list2;
	},

	/** Calculate the inverse of a shuffling
	 * @param {number[]} l
	 * @returns {number[]} l
	 * @see Numbas.math.deal
	 */
	inverse: function(l)
	{
		arr = new Array(l.length);
		for(var i=0;i<l.length;i++)
		{
			arr[l[i]]=i;
		}
		return arr;
	},

	/* Just the numbers from 1 to `n` (inclusive) in an array!
	 * @param {number} n
	 * @returns {number[]}
	 */
	range: function(n)
	{
		var arr=new Array(n);
		for(var i=0;i<n;i++)
		{
			arr[i]=i;
		}
		return arr;
	},

	/** Round `a` to `b` decimal places. Real and imaginary parts of complex numbers are rounded independently.
	 * @param {number} n
	 * @param {number} b
	 * @returns {number}
	 * @throws {Numbas.Error} "math.precround.complex" if b is complex
	 */
	precround: function(a,b) {
		if(b.complex)
			throw(new Numbas.Error('math.precround.complex'));
		if(a.complex)
			return math.complex(math.precround(a.re,b),math.precround(a.im,b));
		else
		{
			b = Math.pow(10,b);

			//test to allow a bit of leeway to account for floating point errors
			//if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
			var v = a*b*10 % 1;
			var d = (a>0 ? Math.floor : Math.ceil)(a*b*10 % 10);
			if(d==4 && 1-v<1e-9) {
				return Math.round(a*b+1)/b;
			}
			else if(d==-5 && v>-1e-9 && v<0) {
				return Math.round(a*b+1)/b;
			}

			return Math.round(a*b)/b;
		}
	},

	/** Round `a` to `b` significant figures. Real and imaginary parts of complex numbers are rounded independently.
	 * @param {number} n
	 * @param {number} b
	 * @returns {number}
	 * @throws {Numbas.Error} "math.precround.complex" if b is complex
	 */
	siground: function(a,b) {
		if(b.complex)
			throw(new Numbas.Error('math.siground.complex'));
		if(a.complex)
			return math.complex(math.siground(a.re,b),math.siground(a.im,b));
		else
		{
			var s = math.sign(a);
			if(a==0) { return 0; }
			if(a==Infinity || a==-Infinity) { return a; }
			b = Math.pow(10, b-Math.ceil(math.log10(s*a)));

			//test to allow a bit of leeway to account for floating point errors
			//if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
			var v = a*b*10 % 1;
			var d = (a>0 ? Math.floor : Math.ceil)(a*b*10 % 10);
			if(d==4 && 1-v<1e-9) {
				return Math.round(a*b+1)/b;
			}
			else if(d==-5 && v>-1e-9 && v<0) {
				return Math.round(a*b+1)/b;
			}

			return Math.round(a*b)/b;
		}
	},

	/** Count the number of decimal places used in the string representation of a number.
	 * @param {number|string} n
	 * @returns {number}
	 */
	countDP: function(n) {
		var m = n.match(/\.(\d*)$/);
		if(!m)
			return 0;
		else
			return m[1].length;
	},
	
	/** Calculate the significant figures precision of a number.
	 * @param {number|string} n
	 * @returns {number}
	 */
	countSigFigs: function(n) {
		var m = n.match(/^-?(?:(\d$)|(?:([1-9]\d*[1-9])0*$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))$)/);
		if(!m)
			return 0;
		var sigFigs = m[1] || m[2] || m[3] || m[4] || m[5];
		return sigFigs.replace('.','').length;
	},

	/** Factorial, or Gamma(n+1) if n is not a positive integer.
	 * @param {number} n
	 * @returns {number}
	 */
	factorial: function(n)
	{
		if( Numbas.util.isInt(n) && n>=0 )
		{
			if(n<=1) {
				return 1;
			}else{
				var j=1;
				for(var i=2;i<=n;i++)
				{
					j*=i;
				}
				return j;
			}
		}
		else	//gamma function extends factorial to non-ints and negative numbers
		{
			return math.gamma(math.add(n,1));
		}
	},

	/** Lanczos approximation to the gamma function 
	 *
	 * http://en.wikipedia.org/wiki/Lanczos_approximation#Simple_implementation
	 * @param {number} n
	 * @returns {number}
	 */
	gamma: function(n)
	{
		var g = 7;
		var p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
		
		var mul = math.mul, div = math.div, exp = math.exp, neg = math.negate, pow = math.pow, sqrt = math.sqrt, sin = math.sin, add = math.add, sub = math.sub, pi = Math.PI, im = math.complex(0,1);
		
		if((n.complex && n.re<0.5) || (!n.complex && n<0.5))
		{
			return div(pi,mul(sin(mul(pi,n)),math.gamma(sub(1,n))));
		}
		else
		{
			n = sub(n,1);			//n -= 1
			var x = p[0];
			for(var i=1;i<g+2;i++)
			{
				x = add(x, div(p[i],add(n,i)));	// x += p[i]/(n+i)
			}
			var t = add(n,add(g,0.5));		// t = n+g+0.5
			return mul(sqrt(2*pi),mul(pow(t,add(n,0.5)),mul(exp(neg(t)),x)));	// return sqrt(2*pi)*t^(z+0.5)*exp(-t)*x
		}
	},

	/** Base-10 logarithm
	 * @param {number} n
	 * @returns {number}
	 */
	log10: function(n)
	{
		return mul(math.log(n),Math.LOG10E);
	},

	/** Convert from degrees to radians
	 * @param {number} x
	 * @returns {number}
	 * @see Numbas.math.degrees
	 */
	radians: function(n) {
		return mul(x,Math.PI/180);
	},

	/** Convert from radians to degrees
	 * @param {number} x
	 * @returns {number}
	 * @see Numbas.math.radians
	 */
	degrees: function(x) {
		return mul(x,180/Math.PI);
	},

	/** Cosine
	 * @param {number} x
	 * @returns {number}
	 */
	cos: function(x) {
		if(x.complex)
		{
			return math.complex(Math.cos(x.re)*math.cosh(x.im), -Math.sin(x.re)*math.sinh(x.im));
		}
		else
			return Math.cos(x);
	},
	
	/** Sine
	 * @param {number} x
	 * @returns {number}
	 */
	sin: function(x) {
		if(x.complex)
		{
			return math.complex(Math.sin(x.re)*math.cosh(x.im), Math.cos(x.re)*math.sinh(x.im));
		}
		else
			return Math.sin(x);
	},

	/** Tangent
	 * @param {number} x
	 * @returns {number}
	 */
	tan: function(x) {
		if(x.complex)
			return div(math.sin(x),math.cos(x));
		else
			return Math.tan(x);
	},

	/** Cosecant 
	 * @param {number} x
	 * @returns {number}
	 */
	cosec: function(x) {
		return div(1,math.sin(x));
	},

	/** Secant
	 * @param {number} x
	 * @returns {number}
	 */
	sec: function(x) {
		return div(1,math.cos(x));
	},
		
	/** Cotangent
	 * @param {number} x
	 * @returns {number}
	 */
	cot: function(x) {
		return div(1,math.tan(x));
	},

	/** Inverse sine
	 * @param {number} x
	 * @returns {number}
	 */
	arcsin: function(x) {
		if(x.complex || math.abs(x)>1)
		{
			var i = math.complex(0,1), ni = math.complex(0,-1);
			var ex = add(mul(x,i),math.sqrt(sub(1,mul(x,x)))); //ix+sqrt(1-x^2)
			return mul(ni,math.log(ex));
		}
		else
			return Math.asin(x);
	},

	/** Inverse cosine
	 * @param {number} x
	 * @returns {number}
	 */
	arccos: function(x) {
		if(x.complex || math.abs(x)>1)
		{
			var i = math.complex(0,1), ni = math.complex(0,-1);
			var ex = add(x, math.sqrt( sub(mul(x,x),1) ) );	//x+sqrt(x^2-1)
			var result = mul(ni,math.log(ex));
			if(math.re(result)<0 || math.re(result)==0 && math.im(result)<0)
				result = math.negate(result);
			return result;
		}
		else
			return Math.acos(x);
	},

	/** Inverse tangent
	 * @param {number} x
	 * @returns {number}
	 */
	arctan: function(x) {
		if(x.complex)
		{
			var i = math.complex(0,1);
			var ex = div(add(i,x),sub(i,x));
			return mul(math.complex(0,0.5), math.log(ex));
		}
		else
			return Math.atan(x);
	},

	/** Hyperbolic sine
	 * @param {number} x
	 * @returns {number}
	 */
	sinh: function(x) {
		if(x.complex)
			return div(sub(math.exp(x), math.exp(math.negate(x))),2);
		else
			return (Math.exp(x)-Math.exp(-x))/2;
	},

	/** Hyperbolic cosine
	 * @param {number} x
	 * @returns {number}
	 */
	cosh: function(x) {
		if(x.complex)
			return div(add(math.exp(x), math.exp(math.negate(x))),2);
		else
			return (Math.exp(x)+Math.exp(-x))/2
	},

	/** Hyperbolic tangent
	 * @param {number} x
	 * @returns {number}
	 */
	tanh: function(x) {
		return div(math.sinh(x),math.cosh(x));
	},

	/** Hyperbolic cosecant
	 * @param {number} x
	 * @returns {number}
	 */
	cosech: function(x) {
		return div(1,math.sinh(x));
	},

	/** Hyperbolic secant
	 * @param {number} x
	 * @returns {number}
	 */
	sech: function(x) {
		return div(1,math.cosh(x));
	},

	/** Hyperbolic tangent
	 * @param {number} x
	 * @returns {number}
	 */
	coth: function(x) {
		return div(1,math.tanh(x));
	},

	/** Inverse hyperbolic sine
	 * @param {number} x
	 * @returns {number}
	 */
	arcsinh: function(x) {
		if(x.complex)
			return math.log(add(x, math.sqrt(add(mul(x,x),1))));
		else
			return Math.log(x + Math.sqrt(x*x+1));
	},

	/** Inverse hyperbolic cosine
	 * @param {number} x
	 * @returns {number}
	 */
	arccosh: function (x) {
		if(x.complex)
			return math.log(add(x, math.sqrt(sub(mul(x,x),1))));
		else
			return Math.log(x + Math.sqrt(x*x-1));
	},

	/** Inverse hyperbolic tangent
	 * @param {number} x
	 * @returns {number}
	 */
	arctanh: function (x) {
		if(x.complex)
			return div(math.log(div(add(1,x),sub(1,x))),2);
		else
			return 0.5 * Math.log((1+x)/(1-x));
	},

	/** Round up to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
	 * @param {number} x
	 * @returns {number}
	 * @see Numbas.math.round
	 * @see Numbas.math.floor
	 */
	ceil: function(x) {
		if(x.complex)
			return math.complex(math.ceil(x.re),math.ceil(x.im));
		else
			return Math.ceil(x);
	},

	/** Round down to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
	 * @param {number} x
	 * @returns {number}
	 * @see Numbas.math.ceil
	 * @see Numbas.math.round
	 */
	floor: function(x) {
		if(x.complex)
			return math.complex(math.floor(x.re),math.floor(x.im));
		else
			return Math.floor(x);
	},

	/** Round to the nearest integer; fractional part >= 0.5 rounds up. For complex numbers, real and imaginary parts are rounded independently.
	 * @param {number} x
	 * @returns {number}
	 * @see Numbas.math.ceil
	 * @see Numbas.math.floor
	 */
	round: function(x) {
		if(x.complex)
			return math.complex(Math.round(x.re),Math.round(x.im));
		else
			return Math.round(x);
	},

	/** Integer part of a number - chop off the fractional part. For complex numbers, real and imaginary parts are rounded independently.
	 * @param {number} x
	 * @returns {number}
	 * @see Numbas.math.fract
	 */
	trunc: function(x) {
		if(x.complex)
			return math.complex(math.trunc(x.re),math.trunc(x.im));

		if(x>0) {
			return Math.floor(x);
		}else{
			return Math.ceil(x);
		}
	},

	/** Fractional part of a number - Take away the whole number part. For complex numbers, real and imaginary parts are rounded independently.
	 * @param {number} x
	 * @returns {number}
	 * @see Numbas.math.trunc
	 */
	fract: function(x) {
		if(x.complex)
			return math.complex(math.fract(x.re),math.fract(x.im));

		return x-math.trunc(x);
	},

	/** Sign of a number - +1, 0, or -1. For complex numbers, gives the sign of the real and imaginary parts separately.
	 * @param {number} x
	 * @returns {number}
	 */
	sign: function(x) {
		if(x.complex)
			return math.complex(math.sign(x.re),math.sign(x.im));

		if(x==0) {
			return 0;
		}else if (x>0) {
			return 1;
		}else {
			return -1;
		}
	},

	/** Get a random real number between `min` and `max` (inclusive)
	 * @param {number} min
	 * @param {number] max
	 * @returns {number}
	 * @see Numbas.math.random
	 * @see Numbas.math.choose
	 */
	randomrange: function(min,max)
	{
		return Math.random()*(max-min)+min;
	},

	/** Get a random number in the specified range. 
	 *
	 * Returns a random choice from `min` to `max` at `step`-sized intervals
	 *
	 * If all the values in the range are appended to the list, eg `[min,max,step,v1,v2,v3,...]`, just pick randomly from the values.
	 * 
	 * @param {range} range - `[min,max,step]`
	 * @returns {number}
	 * @see Numbas.math.randomrange
	 */
	random: function(range)
	{
		if(range.length>3)	//if values in range are given after [min,max,step]
		{
			return math.choose(range.slice(3));
		}
		else
		{
			if(range[2]==0)
			{
				return math.randomrange(range[0],range[1]);
			}
			else
			{
				var diff = range[1]-range[0];
				var steps = diff/range[2];
				var n = Math.floor(math.randomrange(0,steps+1));
				return range[0]+n*range[2];
			}
		}
	},

	/** Remove all the values in the list `exclude` from the list `range`
	 * @param {number[]} range
	 * @param {number[]} exclude
	 * @returns {number[]}
	 */
	except: function(range,exclude) {
		range = range.filter(function(r) {
			for(var i=0;i<exclude.length;i++) {
				if(math.eq(r,exclude[i]))
					return false;
			}
			return true;
		});
		return range;
	},

	/** Choose one item from an array, at random
	 * @param {Array} selection
	 * @returns {object}
	 * @throws {Numbas.Error} "math.choose.empty selection" if `selection` has length 0.
	 * @see Numbas.math.randomrange
	 */
	choose: function(selection)
	{
		if(selection.length==0)
			throw(new Numbas.Error('math.choose.empty selection'));
		var n = Math.floor(math.randomrange(0,selection.length));
		return selection[n];
	},


	/* Product of the numbers in the range `[a..b]`, i.e. $frac{a!}{b!}$.
	 *
	 * from http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/ 
	 * 
	 * (public domain)
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	productRange: function(a,b) {
		if(a>b)
			return 1;
		var product=a,i=a;
		while (i++<b) {
			product*=i;
		}
		return product;
	},
	 
	/** `nCk` - number of ways of picking `k` unordered elements from `n`.
	 * @param {number} n
	 * @param {number} k
	 * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
	 */
	combinations: function(n,k) {
		if(n.complex || k.complex)
			throw(new Numbas.Error('math.combinations.complex'));

		k=Math.max(k,n-k);
		return math.productRange(k+1,n)/math.productRange(1,n-k);
	},

	/** `nPk` - number of ways of picking `k` ordered elements from `n`.
	 * @param {number} n
	 * @param {number} k
	 * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
	 */
	permutations: function(n,k) {
		if(n.complex || k.complex)
			throw(new Numbas.Error('math.permutations.complex'));

		return math.productRange(k+1,n);
	},

	/** Does `a` divide `b`? If either of `a` or `b` is not an integer, return `false`.
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 */
	divides: function(a,b) {
		if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b))
			return false;

		return (b % a) == 0;
	},

	/** Greatest common factor (GCF), or greatest common divisor (GCD), of `a` and `b`.
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
	 */
	gcf: function(a,b) {
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.gcf.complex'));

		if(Math.floor(a)!=a || Math.floor(b)!=b)
			return 1;
		a = Math.floor(Math.abs(a));
		b = Math.floor(Math.abs(b));
		
		var c=0;
		if(a<b) { c=a; a=b; b=c; }		

		if(b==0){return 1;}
		
		while(a % b != 0) {
			c=b;
			b=a % b;
			a=c;
		}
		return b;
	},

	/** Lowest common multiple (LCM) of `a` and `b`.
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
	 */
	lcm: function(a,b) {
		if(a.complex || b.complex)
			throw(new Numbas.Error('math.lcm.complex'));
		a = Math.floor(Math.abs(a));
		b = Math.floor(Math.abs(b));
		
		var c = math.gcf(a,b);
		return a*b/c;
	},


	/** Write the range of integers `[a..b]` as an array of the form `[min,max,step]`, for use with {@link Numbas.math.random}. If either number is complex, only the real part is used.
	 *
	 * @param {number} a
	 * @param {number} b
	 * @returns {range}
	 * @see Numbas.math.random
	 */
	defineRange: function(a,b)
	{
		if(a.complex)
			a=a.re;
		if(b.complex)
			b=b.re;
		return [a,b,1];
	},

	/** Change the step size of a range created with {@link Numbas.math.defineRange}
	 * @param {range} range
	 * @param {number} step
	 * @returns {range}
	 */
	rangeSteps: function(range,step)
	{
		if(step.complex)
			step = step.re;
		return [range[0],range[1],step];
	},

	/** Get a rational approximation to a real number by the continued fractions method.
	 *
	 * If `accuracy` is given, the returned answer will be within `Math.exp(-accuracy)` of the original number
	 * 
	 * @param {number} n
	 * @param {number} [accuracy]
	 * @returns {number[]} - [numerator,denominator]
	 */
	rationalApproximation: function(n,accuracy)
	{
		if(accuracy===undefined)
			accuracy = 15;
		accuracy = Math.exp(-accuracy);

		var on = n;
		var e = Math.floor(n);
		if(e==n)
			return [n,1];
		var l = 0;
		var frac = [];
		while(Math.abs(on-e)>accuracy)
		{
			l+=1;
			var i = Math.floor(n);
			frac.push(i);
			n = 1/(n-i);
			var e = Infinity;
			for(var j=l-1;j>=0;j--)
			{
				e = frac[j]+1/e;
			}
		}
		var f = [1,0];
		for(j=l-1;j>=0;j--)
		{
			f = [frac[j]*f[0]+f[1],f[0]];
		}
		return f;
	}
};

var add = math.add, sub = math.sub, mul = math.mul, div = math.div, eq = math.eq, neq = math.neq, negate = math.negate;

/** A list of the vector's components. 
 * @typedef vector
 *  @type {number[]}
 */

/** Vector operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeroes in when pairs of vectors don't line up exactly
 * @namespace Numbas.vectormath
 */
var vectormath = Numbas.vectormath = {
	/** Negate a vector - negate each of its components
	 * @param {vector} v
	 * @returns {vector}
	 */
	negate: function(v) {
		return v.map(function(x) { return negate(x); });
	},

	/** Add two vectors
	 * @param {vector} a
	 * @param {vector} b
	 * @returns {vector}
	 */
	add: function(a,b) {
		if(b.length>a.length)
		{
			var c = b;
			b = a;
			a = c;
		}
		return a.map(function(x,i){ return add(x,b[i]||0) });
	},

	/** Subtract one vector from another
	 * @param {vector} a
	 * @param {vector} b
	 * @returns {vector}
	 */
	sub: function(a,b) {
		if(b.length>a.length)
		{
			return b.map(function(x,i){ return sub(a[i]||0,x) });
		}
		else
		{
			return a.map(function(x,i){ return sub(x,b[i]||0) });
		}
	},

	/** Scalar multiplication
	 * @param {number} k
	 * @param {vector} v
	 * @returns {vector}
	 */
	mul: function(k,v) {
		return v.map(function(x){ return mul(k,x) });
	},

	/** Vector dot product - each argument can be a vector, or a matrix with one row or one column, which is converted to a vector.
	 * @param {vector|matrix} a
	 * @param {vector|matrix} b
	 * @returns {number}
	 * @throws {NumbasError} "vectormaths.dot.matrix too big" if either of `a` or `b` is bigger than `1xN` or `Nx1`.
	 */
	dot: function(a,b) {

		//check if A is a matrix object. If it's the right shape, we can use it anyway
		if('rows' in a)
		{
			if(a.rows==1)
				a = a[0];
			else if(a.columns==1)
				a = a.map(function(x){return x[0]});
			else
				throw(new Numbas.Error('vectormath.dot.matrix too big'));
		}
		//Same check for B
		if('rows' in b)
		{
			if(b.rows==1)
				b = b[0];
			else if(b.columns==1)
				b = b.map(function(x){return x[0]});
			else
				throw(new Numbas.Error('vectormath.dot.matrix too big'));
		}
		if(b.length>a.length)
		{
			var c = b;
			b = a;
			a = c;
		}
		return a.reduce(function(s,x,i){ return add(s,mul(x,b[i]||0)) },0);
	},

	/** Vector cross product - each argument can be a vector, or a matrix with one row, which is converted to a vector.
	 *
	 * @param {vector|matrix} a
	 * @param {vector|matrix} b
	 * @returns {vector}
	 *
	 * @throws {NumbasError} "vectormaths.cross.matrix too big" if either of `a` or `b` is bigger than `1xN` or `Nx1`.
	 * @throws {NumbasError} "vectormath.cross.not 3d" if either of the vectors is not 3D.
	 */
	cross: function(a,b) {
		//check if A is a matrix object. If it's the right shape, we can use it anyway
		if('rows' in a)
		{
			if(a.rows==1)
				a = a[0];
			else if(a.columns==1)
				a = a.map(function(x){return x[0]});
			else
				throw(new Numbas.Error('vectormath.cross.matrix too big'));
		}
		//Same check for B
		if('rows' in b)
		{
			if(b.rows==1)
				b = b[0];
			else if(b.columns==1)
				b = b.map(function(x){return x[0]});
			else
				throw(new Numbas.Error('vectormath.cross.matrix too big'));
		}

		if(a.length!=3 || b.length!=3)
			throw(new Numbas.Error('vectormath.cross.not 3d'));

		return [
				sub( mul(a[1],b[2]), mul(a[2],b[1]) ),
				sub( mul(a[2],b[0]), mul(a[0],b[2]) ),
				sub( mul(a[0],b[1]), mul(a[1],b[0]) )
				];
	},

	/** Length of a vector
	 * @param {vector} a
	 * @returns {number}
	 */
	abs: function(a) {
		return Math.sqrt( a.reduce(function(s,x){ return s + mul(x,x); },0) );
	},

	/** Are two vectors equal? True if each pair of corresponding components is equal.
	 * @param {vector} a
	 * @param {vector} b
	 * @returns {boolean}
	 */
	eq: function(a,b) {
		if(b.length>a.length)
		{
			var c = b;
			b = a;
			a = c;
		}
		return a.reduce(function(s,x,i){return s && eq(x,b[i]||0)},true);
	},

	/** Are two vectors unequal?
	 * @param {vector} a
	 * @param {vector} b
	 * @returns {boolean}
	 * @see {Numbas.vectormath.eq}
	 */
	neq: function(a,b) {
		return !vectormath.eq(a,b);
	},

	/** Multiply a vector on the left by a matrix
	 * @param {matrix} m
	 * @param {vector} v
	 * @returns {vector}
	 */
	matrixmul: function(m,v) {
		return m.map(function(row){
			return row.reduce(function(s,x,i){ return add(s,mul(x,v[i]||0)); },0);
		});
	},

	/** Transpose of a vector
	 * @param {vector} v
	 * @returns {matrix}
	 */
	transpose: function(v) {
		var matrix = v.map(function(x){ return [x]; });
		matrix.rows = 1;
		matrix.columns = v.length;
		return matrix;
	}
}

/** An array of rows (each of which is an array of numbers) 
 * @typedef matrix
 * @type {Array.Array.<number>}
 * @property {number} rows
 * @property {number} columns
 */

/** Matrix operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeroes in when pairs of matrices don't line up exactly
 * @namespace Numbas.matrixmath
 */
var matrixmath = Numbas.matrixmath = {
	/** Negate a matrix - negate each of its elements */
	negate: function(m) {
		var matrix = [];
		for(var i=0;i<m.rows;i++) {
			matrix.push(m[i].map(function(x){ return negate(x) }));
		}
		matrix.rows = m.rows;
		matrix.columns = m.columns;
		return matrix;
	},

	/** Add two matrices.
	 *
	 * @param {matrix} a
	 * @param {matrix} b
	 * @returns {matrix}
	 */
	add: function(a,b) {
		var rows = Math.max(a.rows,b.rows);
		var columns = Math.max(a.columns,b.columns);
		var matrix = [];
		for(var i=0;i<rows;i++)
		{
			var row = [];
			matrix.push(row);
			for(var j=0;j<columns;j++)
			{
				row[j] = add(a[i][j]||0,b[i][j]||0);
			}
		}
		matrix.rows = rows;
		matrix.columns = columns;
		return matrix;
	},

	/** Subtract one matrix from another
	 *
	 * @param {matrix} a
	 * @param {matrix} b
	 * @returns {matrix}
	 */
	sub: function(a,b) {
		var rows = Math.max(a.rows,b.rows);
		var columns = Math.max(a.columns,b.columns);
		var matrix = [];
		for(var i=0;i<rows;i++)
		{
			var row = [];
			matrix.push(row);
			for(var j=0;j<columns;j++)
			{
				row[j] = sub(a[i][j]||0,b[i][j]||0);
			}
		}
		matrix.rows = rows;
		matrix.columns = columns;
		return matrix;
	},
	
	/** Matrix determinant. Only works up to 3x3 matrices.
	 * @param {matrix} m
	 * @returns {number}
	 * @throws {NumbasError} "matrixmath.abs.too big" if the matrix has more than 3 rows.
	 */
	abs: function(m) {
		if(m.rows!=m.columns)
			throw(new Numbas.Error('matrixmath.abs.non-square'));

		//abstraction failure!
		switch(m.rows)
		{
		case 1:
			return m[0][0];
		case 2:
			return sub( mul(m[0][0],m[1][1]), mul(m[0][1],m[1][0]) );
		case 3:
			return add( sub(
							mul(m[0][0],sub(mul(m[1][1],m[2][2]),mul(m[1][2],m[2][1]))),
							mul(m[0][1],sub(mul(m[1][0],m[2][2]),mul(m[1][2],m[2][0])))
						),
						mul(m[0][2],sub(mul(m[1][0],m[2][1]),mul(m[1][1],m[2][0])))
					);
		default:
			throw(new Numbas.Error('matrixmath.abs.too big'));
		}
	},

	/** Multiply a matrix by a scalar
	 * @param {number} k
	 * @param {number} m
	 * @returns {matrix}
	 */
	scalarmul: function(k,m) {
		var out = m.map(function(row){ return row.map(function(x){ return mul(k,x); }); });
		out.rows = m.rows;
		out.columns = m.columns;
		return out;
	},

	/** Multiply two matrices
	 * @param {matrix} a
	 * @param {matrix} b
	 * @returns {matrix}
	 * @throws {NumbasError} "matrixmath.mul.different sizes" if `a` doesn't have as many columns as `b` has rows.
	 */
	mul: function(a,b) {
		if(a.columns!=b.rows)
			throw(new Numbas.Error('matrixmath.mul.different sizes'));

		var out = [];
		out.rows = a.rows;
		out.columns = b.columns;
		for(var i=0;i<a.rows;i++)
		{
			var row = [];
			out.push(row);
			for(var j=0;j<b.columns;j++)
			{
				var s = 0;
				for(var k=0;k<a.columns;k++)
				{
					s = add(s,mul(a[i][k],b[k][j]));
				}
				row.push(s);
			}
		}
		return out;
	},

	/** Are two matrices equal? True if each pair of corresponding elements is equal.
	 * @param {matrix} a
	 * @param {matrix} b
	 * @returns {boolean}
	 */
	eq: function(a,b) {
		var rows = Math.max(a.rows,b.rows);
		var columns = Math.max(a.columns,b.columns);
		for(var i=0;i<rows;i++)
		{
			var rowA = a[i] || [];
			var rowB = b[i] || [];
			for(var j=0;j<rows;j++)
			{
				if(!eq(rowA[j]||0,rowB[j]||0))
					return false;
			}
		}
		return true;
	},

	/** Are two matrices unequal?
	 * @param {matrix} a
	 * @param {matrix} b
	 * @returns {boolean}
	 * @see {Numbas.matrixmath.eq}
	 */
	neq: function(a,b) {
		return !matrixmath.eq(a,b);
	},

	/** Make an `NxN` identity matrix.
	 * @param {number} n
	 * @returns {matrix}
	 */
	id: function(n) {
		var out = [];
		out.rows = out.columns = n;
		for(var i=0;i<n;i++)
		{
			var row = [];
			out.push(row);
			for(var j=0;j<n;j++)
				row.push(j==i ? 1 : 0);
		}
		return out;
	},

	/** Matrix transpose
	 * @param {matrix}
	 * @returns {matrix}
	 */
	transpose: function(m) {
		var out = [];
		out.rows = m.columns;
		out.columns = m.rows;

		for(var i=0;i<m.columns;i++)
		{
			var row = [];
			out.push(row);
			for(var j=0;j<m.rows;j++)
			{
				row.push(m[j][i]||0);
			}
		}
		return out;
	}
}

});
