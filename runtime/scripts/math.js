/*
Copyright 2011 Newcastle University

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

Numbas.queueScript('scripts/math.js',[],function() {

var math = Numbas.math = {
	
	//Operations to cope with complex numbers
	complex: function(re,im)
	{
		if(!im)
			return re;
		else
			return {re: re, im: im, complex: true, 
			toString: math.complexToString}
	},
	
	complexToString: function()
	{
		return math.niceNumber(this);
	},

	negate: function(n)
	{
		if(n.complex)
			return math.complex(-n.re,-n.im);
		else
			return -n;
	},

	conjugate: function(n)
	{
		if(n.complex)
			return math.complex(n.re,-n.im);
		else
			return n;
	},

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
				return math.complex(b.re/q, -b.im/q);
			}
			else
				return a/b;
		}
	},

	pow: function(a,b)
	{
		if(a.complex)
		{
			if(b.complex)
			{
				var ss = a.re*a.re + a.im*a.im;
				var arg1 = math.arg(a);
				var mag = Math.pow(ss,b.re/2) * Math.exp(-b.im*arg1);
				var arg = b.re*arg1 + (b.im * Math.log(ss))/2;
				return math.complex(mag*Math.cos(arg), mag*Math.sin(arg));
			}
			else
			{
				var mag = Math.pow( math.abs(a), b);
				var arg = math.arg(a) * b;
				return math.complex( mag*Math.cos(arg), mag*Math.sin(arg) );
			}
		}
		else
		{
			if(b.complex)
			{
				var mag = Math.pow(a,b.re);
				var arg = b.im * Math.log(a);
				return math.complex( mag*Math.cos(arg), mag*Math.sin(arg) );
			}
			else
				return Math.pow(a,b);
		}
	},

	root: function(a,b)
	{
		if(a.complex || b.complex)
			return math.pow(b,div(1,a));
		else
			return Math.pow(b,1/a);
	},

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

	log: function(n)
	{
		if(n.complex)
		{
			var mag = math.abs(n);
			var arg = math.arg(n);
			return math.complex(Math.log(mag), arg);
		}
		else
			return Math.log(n);
	},

	exp: function(n)
	{
		if(n.complex)
		{
			return math.complex( Math.exp(n.re) * Math.cos(n.im), Math.exp(n.re) * Math.sin(n.im) );
		}
		else
			return Math.exp(n);
	},
	
	//magnitude of a number
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

	//argument of a (complex) numbers
	arg: function(n)
	{
		if(n.complex)
			return Math.atan2(n.im,n.re);
		else
			return Math.atan2(0,n);
	},

	//real part of a number
	re: function(n)
	{
		if(n.complex)
			return n.re;
		else
			return n;
	},

	//imaginary part of a number
	im: function(n)
	{
		if(n.complex)
			return n.im;
		else
			return 0;
	},

	//Ordering relations
	//could go with lexicographic order on complex numbers, but that isn't that useful anyway, so just compare real parts
	lt: function(a,b)
	{
		if(a.complex)
			a=a.re;
		if(b.complex)
			b=b.re;
		return a<b;
	},

	gt: function(a,b)
	{
		if(a.complex)
			a=a.re;
		if(b.complex)
			b=b.re;
		return a>b;
	},

	leq: function(a,b)
	{
		if(a.complex)
			a=a.re;
		if(b.complex)
			b=b.re;
		return a<=b;
	},
	
	geq: function(a,b)
	{
		if(a.complex)
			a=a.re;
		if(b.complex)
			b=b.re;
		return a>=b;
	},

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

	max: function(a,b)
	{
		if(a.complex)
			a = a.re;
		if(b.complex)
			b = b.re;
		return Math.max(a,b);
	},

	min: function(a,b)
	{
		if(a.complex)
			a = a.re;
		if(b.complex)
			b = b.re;
		return Math.min(a,b);
	},
	
	neq: function(a,b)
	{
		return !math.eq(a,b);
	},

	//If number is a*pi^n, return n, otherwise return 0
	piDegree: function(n)
	{
		n=Math.abs(n);
		for(degree=1; (a=n/Math.pow(Math.PI,degree))>1 && Math.abs(a-math.round(a))>0.00000001; degree++) {}
		return( a>=1 ? degree : 0 );
	},

	//display a number nicely - rounds off to 10dp so floating point errors aren't displayed
	niceNumber: function(n)
	{
		if(n.complex)
		{
			var re = math.niceNumber(n.re);
			var im = math.niceNumber(n.im);
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
			if((piD = math.piDegree(n)) > 0)
				n /= Math.pow(Math.PI,piD);

			var	out = math.precround(n,10)+'';
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
	//returns a random number in range [0..N-1]
	randomint: function(N) {
		return Math.floor(N*(Math.random()%1)); 
	},

	//a random shuffling of the numbers [0..N-1]
	deal: function(N) 
	{ 
		var J, K, Q = new Array(N);
		for (J=0 ; J<N ; J++)
			{ K = math.randomint(J+1) ; Q[J] = Q[K] ; Q[K] = J; }
		return Q; 
	},

	//returns the inverse of a shuffling
	inverse: function(l)
	{
		arr = new Array(l.length);
		for(var i=0;i<l.length;i++)
		{
			arr[l[i]]=i;
		}
		return arr;
	},

	//just the numbers from 1 to n in array!
	range: function(n)
	{
		var arr=new Array(n);
		for(var i=0;i<n;i++)
		{
			arr[i]=i;
		}
		return arr;
	},

	precround: function(a,b) {
		if(b.complex)
			throw(new Error("Can't round to a complex number of decimal places"));
		if(a.complex)
			return math.complex(math.precround(a.re,b),math.precround(a.im,b));
		else
		{
			b = Math.pow(10,b);
			return Math.round(a*b)/b;
		}
	},

	factorial: function(n)
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
	},

	log10: function(x)
	{
		return mul(math.log(x),Math.LOG10E);
	},

	radians: function(x) {
		return mul(x,Math.PI/180);
	},
	degrees: function(x) {
		return mul(x,180/Math.PI);
	},
	cos: function(x) {
		if(x.complex)
		{
			return math.complex(Math.cos(x.re)*math.cosh(x.im), -Math.sin(x.re)*math.sinh(x.im));
		}
		else
			return Math.cos(x);
	},
	sin: function(x) {
		if(x.complex)
		{
			return math.complex(Math.sin(x.re)*math.cosh(x.im), -Math.cos(x.re)*math.sinh(x.im));
		}
		else
			return Math.sin(x);
	},
	tan: function(x) {
		if(x.complex)
			return div(math.sin(x),math.cos(x));
		else
			return Math.tan(x);
	},
	cosec: function(x) {
		return div(1,math.sin(x));
	},
	sec: function(x) {
		return div(1,math.cos(x));
	},
	cot: function(x) {
		return div(1,math.tan(x));
	},
	arcsin: function(x) {
		if(x.complex)
		{
			var i = math.complex(0,1), ni = math.complex(0,-1);
			var ex = add(mul(x,i),math.sqrt(sub(1,mul(x,x))));
			return mul(ni,math.log(ex));
		}
		else
			return Math.asin(x);
	},
	arccos: function(x) {
		if(x.complex)
		{
			var i = math.complex(0,1), ni = math.complex(0,-1);
			var ex = add(x, mul(i, math.sqrt( sub(1, mul(x,x)) ) ) );
			return mul(ni,math.log(ex));
		}
		else
			return Math.acos(x);
	},
	arctan: function(x) {
		if(x.complex)
		{
			var i = math.complex(0,1);
			var ex = div(add(i,x),sub(i,x));
			return mul(math.complex(0,0,5), math.log(ex));
		}
		else
			return Math.atan(x);
	},
	sinh: function(x) {
		if(x.complex)
			return div(sub(math.exp(x), math.exp(math.negate(x))),2);
		else
			return (Math.exp(x)-Math.exp(-x))/2;
	},
	cosh: function(x) {
		if(x.complex)
			return div(add(math.exp(x), math.exp(math.negate(x))),2);
		else
			return (Math.exp(x)-Math.exp(-x))/2
	},
	tanh: function(x) {
		return math.sinh(x)/math.cosh(x);
	},
	cosech: function(x) {
		return div(1,math.sinh(x));
	},
	sech: function(x) {
		return div(1,math.cosh(x));
	},
	coth: function(x) {
		return div(1,math.tanh(x));
	},
	arcsinh: function(x) {
		if(x.complex)
			return math.log(add(x, math.sqrt(add(mul(x,x),1))));
		else
			return Math.log(x + Math.sqrt(x*x+1));
	},
	arccosh: function (x) {
		if(x.complex)
			return math.log(add(x, math.sqrt(sub(mul(x,x),1))));
		else
			return Math.log(x + Math.sqrt(x*x-1));
	},
	arctanh: function (x) {
		if(x.complex)
			return div(math.log(div(add(1,x),sub(1,x))),2);
		else
			return 0.5 * Math.log((1+x)/(1-x));
	},

	//round UP to nearest integer
	ceil: function(x) {
		if(x.complex)
			return math.complex(math.ceil(x.re),math.ceil(x.im));
		else
			return Math.ceil(x);
	},

	//round DOWN to nearest integer
	floor: function(x) {
		if(x.complex)
			return math.complex(math.floor(x.re),math.floor(x.im));
		else
			return Math.floor(x);
	},

	//round to nearest integer
	round: function(x) {
		if(x.complex)
			return math.complex(math.round(x.re),math.round(x.im));
		else
			return Math.round(x);
	},

	//chop off decimal part
	trunc: function(x) {
		if(x.complex)
			x=x.re;

		if(x>0) {
			return Math.floor(x);
		}else{
			return Math.ceil(x);
		}
	},
	fract: function(x) {
		if(x.complex)
			x=x.re;

		return x-math.trunc(x);
	},
	sign: function(x) {
		if(x.complex)
			x=x.re;

		if(x==0) {
			return 0;
		}else if (x>0) {
			return 1;
		}else {
			return -1;
		}
	},

	//return random real number between max and min
	randomrange: function(min,max)
	{
		return Math.random()*(max-min)+min;
	},

	//call as random([min,max,step])
	//returns random choice from 'min' to 'max' at 'step' intervals
	//if all the values in the range are appended to the list, eg [min,max,step,v1,v2,v3,...], just pick randomly from the values
	random: function(range)
	{
		if(range.length>3)	//if values in range are given
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

	//choose one item from an array
	choose: function(variables)
	{
		var n = Math.floor(math.randomrange(0,variables.length));
		return variables[n];
	},


	// from http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/ 
	//(public domain)
	productRange: function(a,b) {
		if(a>b)
			return 1;
		var product=a,i=a;
		while (i++<b) {
			product*=i;
		}
		return product;
	},
	 
	combinations: function(n,k) {
		if(n.complex || k.complex)
			throw(new Error("Can't compute combinations of complex numbers"));

		k=Math.max(k,n-k);
		return math.productRange(k+1,n)/math.productRange(1,n-k);
	},

	permutations: function(n,k) {
		if(n.complex || k.complex)
			throw(new Error("Can't compute permutations of complex numbers"));

		return math.productRange(k+1,n);
	},

	divides: function(a,b) {
		if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b))
			return false;

		return (b % a) == 0;
	},

	gcf: function(a,b) {
		if(a.complex || b.complex)
			throw(new Error("Can't compute GCF of complex numbers"));

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

	lcm: function(a,b) {
		if(a.complex || b.complex)
			throw(new Error("Can't compute LCM of complex numbers"));
		a = Math.floor(Math.abs(a));
		b = Math.floor(Math.abs(b));
		
		var c = math.gcf(a,b);
		return a*b/c;
	},


	siground: function(a,b) {
		if(b.complex)
			throw(new Error("Can't round to a complex number of sig figs"));
		if(a.complex)
			return math.complex(math.siground(a.re,b),math.siground(a.im,b));
		else
		{
			var s = math.sign(a);
			a = Math.abs(a);
			if(a==0) { return s*a; }
			b = Math.pow(10,Math.ceil(Math.log(a)/Math.log(10))-b);
			return s*Math.round(a/b)*b;
		}
	},

	defineRange: function(a,b)
	{
		if(a.complex)
			a=a.re;
		if(b.complex)
			b=b.re;
		return [a,b,1];
	},
	rangeSteps: function(a,b)
	{
		if(b.complex)
			b=b.re;
		return [a[0],a[1],Math.abs(b)];
	},

	//Get a rational approximation to a real number by the continued fractions method
	//if accuracy is given, the returned answer will be within exp(-accuracy) of the original number
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

var add = math.add, sub = math.sub, mul = math.mul, div = math.div;

});
