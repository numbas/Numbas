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

//this extension will add a new JME function to generate a normal random variable
//so it needs Numbas.math and Numbas.jme to be loaded before it can run
Numbas.queueScript('extensions/stats/stats.js',['math','jme'],function() {

	var math = Numbas.math;
	var types = Numbas.jme.types;
	var funcObj = Numbas.jme.funcObj;
	var TNum = types.TNum;
	var TList = types.TList;
	var TString = types.TString;

	var stats = Numbas.extensions.stats  = {
		regression: {}
	};
	var distributions = stats.distributions = {}

	/*
	 * distributions provide any of:
	 * 	- random(*params) - return a random value from the distribution with given parameters
	 * 	- PDF(x,*params) - probability density function at point x of the distribution with given parameters
	 * 	- PMF(x,*params) - as above, but it's called a probability mass function for a discrete distribution
	 * 	- CDF(x,*params) - cumulative density function at point x of ditto
	 * 	- pValue(x,*params) - probability of observing value x from distribution with given parameters
	 */
	
	var statsScope = Numbas.extensions.stats.scope = new Numbas.jme.Scope();

	//sum of a list of numbers
	stats.sum = function(values)
	{
		var t = 0;
		for(var i=0;i<values.length;i++)
		{
			if(values[i].type!='number')
				throw(new Error("Can't sum non-number data."));
			t = math.add(t,values[i].value);
		}
		return t;
	}

	//mean of a list of numbers
	stats.mean = function(values)
	{
		if(values.length==0)
			return 0;

		return stats.sum(values)/values.length;
	}


	//variance of a list of numbers
	stats.variance = function(values)
	{
		var s = 0;
		var mean = stats.mean(values);
		for(var i=0;i<values.length;i++)
		{
			var d = values[i].value-mean;
			s+= d*d;
		}
		return s/(values.length-1);
	}
	
	//standard deviation of a list of numbers
	stats.standardDev = function(values)
	{
		return Math.sqrt(stats.variance(values));
	}
	

	distributions.normal = {
		//generate a random normal variable
		random: function(mu,sigma)
		{
			var u = Math.random();
			var v = Math.random();
			
			var z = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);

			return z*sigma + mu;
		},

		//Based on Abramowitz and Stegun;" Handbook of Mathematical Functions." 1964,(formula: 26.2.17) as implemented below
		CDF: function(z)
		{
			var p = 0.2316419;
			var a1 =  0.319381530;
			var a2 = -0.356563782;
			var a3 =  1.781477937;
			var a4 = -1.821255978;
			var a5 =  1.330274429;

			var t = 1/(1+p*z);
			return 1-distributions.normal.PDF(z,0,1)*(a1*t+a2*Math.pow(t,2)+a3*Math.pow(t,3)+a4*Math.pow(t,4)+a5*Math.pow(t,5));
		},

		PDF: function(x,mu,sigma)
		{
			return ((1/(sigma*Math.sqrt(2*Math.PI)))*Math.exp((-1/2)*Math.pow((x-mu)/sigma,2)));
		},

		pValue: function(sample,mu,variance)
		{
			var mean = stats.mean(sample);
			var n = sample.length;
			var z = (mean-mu)/(Math.sqrt(variance/n));
			return distributions.normal.CDF(z);
		}
	}
	
	

	/*
	//attempt at a T-test
	stats.tTest = function(sample,mu)
	{
		var mean = stats.mean(sample);
		var stdDev= stats.standardDev(sample);
		var n = sample.length;
				
		var t = (mean-mu)*Math.sqrt(n)/stdDev;
		return t;
	}
	*/

	distributions.poisson = {
		random: function(lambda)
		{
			if(lambda>500)
				return distributions.poisson.random(lambda/2)+distributions.poisson.random(lambda/2);

			var k=0;
			var u = Math.random();
			var fact = 1;
			var p = Math.exp(-lambda);
			
			u-=p;

			while(u>0)
			{
				k+=1;
				fact *= k;
				p *= lambda/k;
				u -= p;
			}
			return k;
		},

		PMF: function(x,lambda)
		{
			return (Math.pow(lambda,x)/math.factorial(x))*Math.exp(-lambda)
		}
	}
	
	distributions.bernoulli = {
		random: function(p)
		{
			var u = Math.random()
			var X = 0
			
			if(u>=(1-p))
				X = 1
				
			return X;
		}
	}
	
	distributions.binomial = {
		random: function(n,p)
		{
			var k = 0
			var X = 0
			
			while(k<n)
			{
				X += distributions.bernoulli.random(p)
				k += 1
			}
			
			return X;
		},

		PMF: function(x,n,p)
		{
			return math.combinations(n,x)*Math.pow(p,x)*Math.pow(1-p,n-x);
		}
	}
	
	
	distributions.geometric = {
		random: function(p)
		{
			var u = Math.random()
			var z = (Math.log(1-u))/(Math.log(1-p))
			
			if(z>=0)
				return Math.floor(z)
			else
				return Math.ceil(z)
		},
		
		PMF: function(x,p)
		{
			return Math.pow(1-p,x-1)*p
		},
	
	
		CDF: function(x,p)
		{
			return 1-Math.pow(1-p,x)
		}
	}
	
	distributions.uniform = {
		random: function(a,b) {
			return math.randomrange(a,b);
		},
	
		PDF: function(x,a,b)
		{
			if(a<=x<=b)
				return 1/(b-a)
			else
				return 0
		},
	
		CDF: function(x,a,b)
		{
			if(x<a)
				return 0
			else if(a<=x<=b)
				return (x-a)/(b-a)
			else
				return 1
		}
	}
	
	distributions.exponential = {
		random: function(lambda)
		{
			var u = Math.random()
			
			return -Math.log(u)/lambda
		},
		
		PDF: function(x,lambda)
		{
			if(x>=0)
				return lambda*Math.exp(-lambda*x)
			else
				return 0
		},
		
		CDF: function(x,lambda)
		{
			if(x<0)
				return 0
			else
				return 1-Math.exp(-lambda*x)
		}
	}
	
	
	distributions.gamma = {
		random: function(n,lambda)
		{
			var k = 0
			var X = 0
			
			while(k<n)
				{
					X += distributions.exponential.random(lambda)
					k += 1
				}
			
			if(n==Math.floor(n))
				return X
			else
				throw(new Error("Can't calculate for n not an integer."));
		},
		
		PDF: function(x,n,lambda)
		{
			return (Math.pow(lambda,n)/math.factorial(n-1))*Math.pow(x,n-1)*Math.exp(-lambda*x)
		}
	}
	
	stats.regression.linear = function(xs,ys) {
		var meanx = stats.mean(xs)
		var meany = stats.mean(ys)
		var Sxx = 0
		var Sxy = 0
	
		for(var i=0;i<xs.length;i++)
		{
			var d = xs[i].value-meanx
			var c = ys[i].value-meany
			Sxx += d*d
			Sxy += d*c
		}
		
		var beta = Sxy/Sxx
		var alpha = meany - (beta*meanx)
		
		return [new TNum(alpha),new TNum(beta)];
	}
	
	statsScope.addFunction(new funcObj('sum',[TList],TNum, stats.sum));
	statsScope.addFunction(new funcObj('mean',[TList],TNum, stats.mean));
	statsScope.addFunction(new funcObj('variance',[TList],TNum, stats.variance));
	statsScope.addFunction(new funcObj('standardDev',[TList],TNum,stats.standardDev));
	statsScope.addFunction(new funcObj('randomNormal',[TNum,TNum], TNum, distributions.normal.random));
	statsScope.addFunction(new funcObj('cdfNormal',[TNum],TNum,distributions.normal.CDF));
	statsScope.addFunction(new funcObj('pdfNormal',[TNum,TNum,TNum],TNum,distributions.normal.PDF));
	statsScope.addFunction(new funcObj('zTest',[TList,TNum,TNum],TNum,distributions.normal.pValue));
	//statsScope.addFunction(new funcObj('tTest',[TList,TNum],TNum,stats.tTest));
	statsScope.addFunction(new funcObj('randomPoisson',[TNum],TNum,distributions.poisson.random));
	statsScope.addFunction(new funcObj('pmfPoisson',[TNum,TNum],TNum,distributions.poisson.PMF));
	statsScope.addFunction(new funcObj('randomBernoulli',[TNum],TNum,distributions.bernoulli.random));
	statsScope.addFunction(new funcObj('randomBinomial',[TNum,TNum],TNum,distributions.binomial.random));
	statsScope.addFunction(new funcObj('pmfBinomial',[TNum,TNum,TNum],TNum,distributions.binomial.PMF));
	statsScope.addFunction(new funcObj('randomGeometric',[TNum],TNum,distributions.geometric.random));
	statsScope.addFunction(new funcObj('pmfGeometric',[TNum,TNum],TNum,distributions.geometric.PMF));
	statsScope.addFunction(new funcObj('cdfGeometric',[TNum,TNum],TNum,distributions.geometric.CDF));
	statsScope.addFunction(new funcObj('randomUniform',[TNum,TNum,TNum],TNum,distributions.uniform.random));
	statsScope.addFunction(new funcObj('pdfUniform',[TNum,TNum,TNum],TNum,distributions.uniform.PDF));
	statsScope.addFunction(new funcObj('cdfUniform',[TNum,TNum,TNum],TNum,distributions.uniform.CDF));
	statsScope.addFunction(new funcObj('randomExponential',[TNum],TNum,distributions.exponential.random));
	statsScope.addFunction(new funcObj('pdfExponential',[TNum,TNum],TNum,distributions.exponential.PDF));
	statsScope.addFunction(new funcObj('cdfExponential',[TNum,TNum],TNum,distributions.exponential.CDF));
	statsScope.addFunction(new funcObj('randomGamma',[TNum,TNum],TNum,distributions.gamma.random));		
	statsScope.addFunction(new funcObj('pdfGamma',[TNum,TNum,TNum],TNum,distributions.gamma.PDF));

	statsScope.addFunction(new funcObj('linearRegression',[TList,TList],TList,function(l1,l2){
		return stats.regression.linear(l1,l2);
	}));
});
