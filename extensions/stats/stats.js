//this extension will add a new JME function to generate a normal random variable
//so it needs Numbas.math and Numbas.jme to be loaded before it can run
Numbas.queueScript('extensions/stats/stats.js',['math','jme'],function() {

	var math = Numbas.math;
	var funcObj = Numbas.jme.funcObj;
	var types = Numbas.jme.types;
	var TNum = types.TNum;
	var TList = types.TList;


	//generate a random normal variable
	math.randomNormal = function(mu,sigma)
	{
		var u = Math.random();
		var v = Math.random();
		
		var z = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);

		return z*sigma + mu;
	}
	new funcObj('randomnormal',[TNum,TNum], TNum, math.randomNormal);

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

	math.mean = function(values)
	{
		if(values.length==0)
			return 0;

		return math.sum(values)/values.length;
	}

	new funcObj('mean',[TList],TNum, math.mean);

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

	var cdfconst = Math.sqrt(Math.PI/8);

	//based on "A Note on Approximating the Normal Distribution Function", K. M. Aludaat and M. T. Alodat, Applied Mathematical Sciences 2008
	math.normalCDF = function(z)
	{
		return 0.5+0.5*Math.sqrt(1-Math.exp(-cdfconst*z*z));
	}

	new funcObj('normalcdf',[TNum],TNum,math.normalCDF);

	math.zTest = function(sample,mu)
	{
		var mean = math.mean(sample);
		var variance = math.variance(sample);
		var n = sample.length;
		var z = (mean-mu)/(Math.sqrt(variance/n));
		return math.normalCDF(z);
	}

	new funcObj('ztest',[TList,TNum],TNum,math.zTest);

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
});
