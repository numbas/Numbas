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
	var funcObj = Numbas.jme.funcObj;
	var types = Numbas.jme.types;
	var TNum = types.TNum;
	var TList = types.TList;
	var TString = types.TString;
	


	//generate a random normal variable
	math.randomNormal = function(mu,sigma)
	{
		var u = Math.random();
		var v = Math.random();
		
		var z = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);

		return z*sigma + mu;
	}
	new funcObj('randomNormal',[TNum,TNum], TNum, math.randomNormal);

	//sum of a list of numbers
	math.sum = function(values)
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

	new funcObj('sum',[TList],TNum, math.sum);

	//mean of a list of numbers
	math.mean = function(values)
	{
		if(values.length==0)
			return 0;

		return math.sum(values)/values.length;
	}

	new funcObj('mean',[TList],TNum, math.mean);

	//variance of a list of numbers
	math.variance = function(values)
	{
		var s = 0;
		var mean = math.mean(values);
		for(var i=0;i<values.length;i++)
		{
			var d = values[i].value-mean;
			s+= d*d;
		}
		return s/(values.length-1);
	}
	new funcObj('variance',[TList],TNum, math.variance);
	
	//standard deviation of a list of numbers
	math.standardDev = function(values)
	{
		return Math.sqrt(math.variance(values));
	}
	
	new funcObj('standardDev',[TList],TNum,math.standardDev);


	//Cumulative Distribution Function of the Normal(0,1) distribution.
	//based on "A Note on Approximating the Normal Distribution Function", K. M. Aludaat and M. T. Alodat, Applied Mathematical Sciences 2008
	var cdfconst = Math.sqrt(Math.PI/8);
	math.normalCDF = function(z)
	{
		return 0.5+0.5*Math.sqrt(1-Math.exp(-cdfconst*z*z));
	}

	new funcObj('cdfNormal',[TNum],TNum,math.normalCDF);

	//the PDF function for a normal distribution
	math.pdfNormal = function(x,mu,sigma)
	{
		return ((1/(sigma*Math.sqrt(2*Math.PI)))*Math.exp((-1/2)*Math.pow((x-mu)/sigma,2)));
	}
	
	new funcObj('pdfNormal',[TNum,TNum,TNum],TNum,math.pdfNormal);
	
	//z-test of a sample; returns p-value of sample mean assuming given distribution mean and variance
	math.zTest = function(sample,mu,variance)
	{
		var mean = math.mean(sample);
		var n = sample.length;
		var z = (mean-mu)/(Math.sqrt(variance/n));
		return math.normalCDF(z);
	}

	new funcObj('zTest',[TList,TNum,TNum],TNum,math.zTest);
	
	//attempt at a T-test
	//math.tTest = function(sample,mu)
	//{
	//	var mean = math.mean(sample);
	//	var variance = math.variance(sample);
	//	var n = sample.length;
	//	var k = 0
	//	
	//	for(var i=0;i<x.length;i++)
	//	{
	//		var d = sample[i].value-mean
	//		k += d*d	
	//	}
	//			
	//	var S = Math.sqrt(k/(n-1));		
	//	var t = (mean-mu)*Math.sqrt(n)/S;
	//}	
	//
	//new funcObj('tTest',[TList,TNum],TNum,math.tTest);
	
	//random value from Poisson(lambda) distribution
	math.randomPoisson = function(lambda)
	{
		if(lambda>500)
			return math.randomPoisson(lambda/2)+math.randomPoisson(lambda/2);

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
	}

	new funcObj('randomPoisson',[TNum],TNum,math.randomPoisson);
	
	//simulating a Bernoulli random variable
	math.randomBernoulli = function(p)
	{
		var u = Math.random()
		var X = 0
		
		if(u>=(1-p))
			X = 1
			
		return X;
	}
	
	new funcObj('randomBernoulli',[TNum],TNum,math.randomBernoulli);
	
	//simulating a Binomial random variable
	math.randomBinomial = function(n,p)
	{
		var k = 0
		var X = 0
		
		while(k<n)
		{
			X += math.randomBernoulli(p)
			k += 1
		}
		
		return X;
	}
	
	new	funcObj('randomBinomial',[TNum,TNum],TNum,math.randomBinomial);
	
	//Binomial pmf
	math.pmfBinomial = function(x,n,p)
	{
		return math.combinations(n,x)*Math.pow(p,x)*Math.pow(1-p,n-x);
	}
	
	new funcObj('pmfBinomial',[TNum,TNum,TNum],TNum,math.pmfBinomial);
	
	//simulating a Geometric random variable
	math.randomGeometric = function(p)
	{
		var u = Math.random()
		var z = (Math.log(1-u))/(Math.log(1-p))
		
		if(z>=0)
			return Math.floor(z)
		else
			return Math.ceil(z)
	}
	
	new funcObj('randomGeometric',[TNum],TNum,math.randomGeometric);
	
	//Geometric pmf
	math.pmfGeometric = function(x,p)
	{
		return Math.pow(1-p,x-1)*p
	}
	
	new funcObj('pmfGeometric',[TNum,TNum],TNum,math.pmfGeometric);
	
	//Geometric cdf
	math.cdfGeometric = function(x,p)
	{
		return 1-Math.pow(1-p,x)
	}
	
	new funcObj('cdfGeometric',[TNum,TNum],TNum,math.cdfGeometric);
	
	//Poisson pmf
	math.pmfPoisson = function(x,lambda)
	{
		return (Math.pow(lambda,x)/math.factorial(x))*Math.exp(-lambda)
	}
	
	new funcObj('pmfPoisson',[TNum,TNum],TNum,math.pmfPoisson);
	
	//Uniform pdf
	math.pdfUniform = function(x,a,b)
	{
		if(a<=x<=b)
			return 1/(b-a)
		else
			return 0
	}
	
	new funcObj('pdfUniform',[TNum,TNum,TNum],TNum,math.pdfUniform);
	
	//Uniform cdf
	math.cdfUniform = function(x,a,b)
	{
		if(x<a)
			return 0
		else if(a<=x<=b)
			return (x-a)/(b-a)
		else
			return 1
	}
	
	new funcObj('cdfUniform',[TNum,TNum,TNum],TNum,math.cdfUniform);
	
	//simulate an Exponential random variable
	math.randomExponential = function(lambda)
	{
		var u = Math.random()
		
		return -Math.log(u)/lambda
	}
	
	new funcObj('randomExponential',[TNum],TNum,math.randomExponential);
	
	//Exponential  pdf
	math.pdfExponential = function(x,lambda)
	{
		if(x>=0)
			return lambda*Math.exp(-lambda*x)
		else
			return 0
	}
	
	new funcObj('pdfExponential',[TNum,TNum],TNum,math.pdfExponential);
	
	//Exponential cdf
	math.cdfExponential = function(x,lambda)
	{
		if(x<0)
			return 0
		else
			return 1-Math.exp(-lambda*x)
	}
	
	new funcObj('cdfExponential',[TNum,TNum],TNum,math.cdfExponential);
	
	//Simulate a random Gamma variable
	math.randomGamma = function(n,lambda)
	{
		var k = 0
		var X = 0
		
		while(k<n)
			{
				X += math.randomExponential(lambda)
				k += 1
			}
		
		if(n==Math.floor(n))
			return X
		else
			throw(new Error("Can't calculate for n not an integer."));
	}
			
	new funcObj('randomGamma',[TNum,TNum],TNum,math.randomGamma);		
	
	//Gamma pdf
	math.pdfGamma = function(x,n,lambda)
	{
		return (Math.pow(lambda,n)/math.factorial(n-1))*Math.pow(x,n-1)*Math.exp(-lambda*x)
	}
	
	new funcObj('pdfGamma',[TNum,TNum,TNum],TNum,math.pdfGamma);
	
	//calculate a regression  line
	math.regression = function(x,y)
	{
		var meanx = math.mean(x)
		var meany = math.mean(y)
		var Sxx = 0
		var Sxy = 0
	
		for(var i=0;i<x.length;i++)
		{
			var d = x[i].value-meanx
			var c = y[i].value-meany
			Sxx += d*d
			Sxy += d*c
		}
		
		var beta = Sxy/Sxx
		var alpha = meany -(beta*meanx)
		
		return [alpha,beta];
	}
	
	new funcObj('regressionAlpha',[TList,TList],TNum,function(l1,l2){
		return math.regression(l1,l2)[0];
	});

	new funcObj('regressionBeta',[TList,TList],TNum,function(l1,l2){
		return math.regression(l1,l2)[1];
	});
});
