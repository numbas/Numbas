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

/* Below is a list of all functions defined in this extension, because they're automatically wrapped from jStat so there'd otherwise be no explicit list of them all
sum
sumsqrd
sumsqerr
product
min
max
mean
meansqerr
geomean
median
cumsum
diff
mode
range
variance
stdev
meandev
meddev
coeffvar
quartiles
covariance
corrcoeff
betapdf
betacdf
betainv
betamean
betamedian
betamode
betasample
betavariance
centralfpdf
centralfcdf
centralfinv
centralfmean
centralfmode
centralfsample
centralfvariance
cauchypdf
cauchycdf
cauchyinv
cauchymedian
cauchymode
cauchysample
chisquarepdf
chisquarecdf
chisquareinv
chisquaremean
chisquaremedian
chisquaremode
chisquaresample
chisquarevariance
exponentialpdf
exponentialcdf
exponentialinv
exponentialmean
exponentialmedian
exponentialmode
exponentialsample
exponentialvariance
gammapdf
gammacdf
gammainv
gammamean
gammamode
gammasample
gammavariance
invgammapdf
invgammacdf
invgammainv
invgammamean
invgammamode
invgammasample
invgammavariance
kumaraswamypdf
kumaraswamycdf
kumaraswamymean
kumaraswamymedian
kumaraswamymode
kumaraswamyvariance
lognormalpdf
lognormalcdf
lognormalinv
lognormalmean
lognormalmedian
lognormalmode
lognormalsample
lognormalvariance
normalpdf
normalcdf
normalinv
normalmean
normalmedian
normalmode
normalsample
normalvariance
paretopdf
paretocdf
paretomean
paretomedian
paretomode
paretovariance
studenttpdf
studenttcdf
studenttinv
studenttmean
studenttmedian
studenttmode
studenttsample
studenttvariance
weibullpdf
weibullcdf
weibullinv
weibullmean
weibullmedian
weibullmode
weibullsample
weibullvariance
uniformpdf
uniformcdf
uniformmean
uniformmedian
uniformmode
uniformsample
uniformvariance
binomialpdf
binomialcdf
geometricpdf
geometriccdf
geometricmean
geometricmedian
geometricmode
geometricsample
geometricvariance
negbinpdf
negbincdf
hypgeompdf
hypgeomcdf
poissonpdf
poissoncdf
poissonmean
poissonsample
poissonvariance
triangularpdf
triangularcdf
triangularmean
triangularmedian
triangularmode
triangularsample
triangularvariance
zscore
ztest
tscore
ttest
anovafscore
anovaftest
ftest
normalci
tci
betafn
betaln
betacf
ibetainv
ibeta
gammaln
gammafn
gammap
factorialln
factorial
combination
permutation
gammapinv
erf
erfc
erfcinv
randn
randg
*/



/**
 * jStat - JavaScript Statistical Library
 * Copyright (c) 2011
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php */this.j$=this.jStat=function(e,t){function f(){return new f.fn.init(arguments)}var n=Array.prototype.slice,r=Object.prototype.toString,i=function(t,n){var r=t>n?t:n;return e.pow(10,17-~~(e.log(r>0?r:-r)*e.LOG10E))},s=Array.isArray||function(e){return r.call(e)==="[object Array]"},o=function(e){return r.call(e)==="[object Function]"},u=function(e){return r.call(e)==="[object Number]"&&!isNaN(e)},a=function(e){return[].concat.apply([],e)};return f.fn=f.prototype={constructor:f,init:function(e){var t=0;if(s(e[0]))if(s(e[0][0])){o(e[1])&&(e[0]=f.map(e[0],e[1]));for(;t<e[0].length;t++)this[t]=e[0][t];this.length=e[0].length}else this[0]=o(e[1])?f.map(e[0],e[1]):e[0],this.length=1;else if(u(e[0]))this[0]=f.seq.apply(null,e),this.length=1;else{if(e[0]instanceof f)return f(e[0].toArray());this[0]=[],this.length=1}return this},length:0,toArray:function(){return this.length>1?n.call(this):n.call(this)[0]},push:[].push,sort:[].sort,splice:[].splice,slice:[].slice},f.fn.init.prototype=f.fn,f.utils={calcRdx:i,isArray:s,isFunction:o,isNumber:u,toVector:a},f.extend=function(e){var t=n.call(arguments),r=1,i;if(t.length===1){for(i in e)f[i]=e[i];return this}for(;r<t.length;r++)for(i in t[r])e[i]=t[r][i];return e},f.extend({rows:function(e){return e.length||1},cols:function(e){return e[0].length||1},dimensions:function(e){return{rows:f.rows(e),cols:f.cols(e)}},row:function(e,t){return e[t]},col:function(e,t){var n=new Array(e.length),r=0;for(;r<e.length;r++)n[r]=[e[r][t]];return n},diag:function(e){var t=0,n=f.rows(e),r=new Array(n);for(;t<n;t++)r[t]=[e[t][t]];return r},antidiag:function(e){var t=f.rows(e)-1,n=new Array(t),r=0;for(;t>=0;t--,r++)n[r]=[e[r][t]];return n},transpose:function(e){var t=[],n=0,r,i,o;s(e[0])||(e=[e]),r=e.length,i=e[0].length;for(;n<i;n++){t.push(new Array(r));for(o=0;o<r;o++)t[n][o]=e[o][n]}return t.length===1?t[0]:t},map:function(e,t,n){var r=0,i,o,u,a;s(e[0])||(e=[e]),i=e.length,o=e[0].length,u=n?e:new Array(i);for(;r<i;r++){u[r]||(u[r]=new Array(o));for(a=0;a<o;a++)u[r][a]=t(e[r][a],r,a)}return u.length===1?u[0]:u},alter:function(e,t){return f.map(e,t,!0)},create:function(e,t,n){var r=new Array(e),i,s;o(t)&&(n=t,t=e);for(i=0;i<e;i++){r[i]=new Array(t);for(s=0;s<t;s++)r[i][s]=n(i,s)}return r},zeros:function(e,t){return u(t)||(t=e),f.create(e,t,function(){return 0})},ones:function(e,t){return u(t)||(t=e),f.create(e,t,function(){return 1})},rand:function(t,n){return u(n)||(n=t),f.create(t,n,function(){return e.random()})},identity:function(e,t){return u(t)||(t=e),f.create(e,t,function(e,t){return e===t?1:0})},symmetric:function(e){var t=!0,n=0,r=e.length,i;if(e.length!==e[0].length)return!1;for(;n<r;n++)for(i=0;i<r;i++)if(e[i][n]!==e[n][i])return!1;return!0},clear:function(e){return f.alter(e,function(){return 0})},seq:function(e,t,n,r){o(r)||(r=!1);var s=[],u=i(e,t),a=(t*u-e*u)/((n-1)*u),f=e,l=0;for(;f<=t;l++,f=(e*u+a*u*l)/u)s.push(r?r(f,l):f);return s}}),function(e){for(var t=0;t<e.length;t++)(function(e){f.fn[e]=function(t){var n=this,r;return t?(setTimeout(function(){t.call(n,f.fn[e].call(n))},15),this):(r=f[e](this),s(r)?f(r):r)}})(e[t])}("transpose clear symmetric rows cols dimensions diag antidiag".split(" ")),function(e){for(var t=0;t<e.length;t++)(function(e){f.fn[e]=function(t,n){var r=this;return n?(setTimeout(function(){n.call(r,f.fn[e].call(r,t))},15),this):f(f[e](this,t))}})(e[t])}("row col".split(" ")),function(e){for(var t=0;t<e.length;t++)(function(e){f.fn[e]=function(){return f(f[e].apply(null,arguments))}})(e[t])}("create zeros ones rand identity".split(" ")),f.extend(f.fn,{map:function(e,t){return f(f.map(this,e,t))},alter:function(e){return f.alter(this,e),this}}),f}(Math),function(e,t){(function(t){for(var n=0;n<t.length;n++)(function(t){e[t]=function(e,t,n){return this instanceof arguments.callee?(this._a=e,this._b=t,this._c=n,this):new arguments.callee(e,t,n)},e.fn[t]=function(n,r,i){var s=e[t](n,r,i);return s.data=this,s},e[t].prototype.sample=function(n){var r=this._a,i=this._b,s=this._c;return n?e.alter(n,function(){return e[t].sample(r,i,s)}):e[t].sample(r,i,s)},function(n){for(var r=0;r<n.length;r++)(function(n){e[t].prototype[n]=function(r){var i=this._a,s=this._b,o=this._c;return r||(r=this.data),typeof r!="number"?e.fn.map.call(r,function(r){return e[t][n](r,i,s,o)}):e[t][n](r,i,s,o)}})(n[r])}("pdf cdf inv".split(" ")),function(n){for(var r=0;r<n.length;r++)(function(n){e[t].prototype[n]=function(){return e[t][n](this._a,this._b,this._c)}})(n[r])}("mean median mode variance".split(" "))})(t[n])})("beta centralF cauchy chisquare exponential gamma invgamma kumaraswamy lognormal normal pareto studentt weibull uniform  binomial negbin hypgeom poisson triangular".split(" ")),e.extend(e.beta,{pdf:function(n,r,i){return n>1||n<0?0:t.pow(n,r-1)*t.pow(1-n,i-1)/e.betafn(r,i)},cdf:function(t,n,r){return t>1||t<0?(t>1)*1:e.ibeta(t,n,r)},inv:function(t,n,r){return e.ibetainv(t,n,r)},mean:function(e,t){return e/(e+t)},median:function(e,t){},mode:function(e,n){return e*n/(t.pow(e+n,2)*(e+n+1))},sample:function(t,n){var r=e.randg(t);return r/(r+e.randg(n))},variance:function(e,n){return e*n/(t.pow(e+n,2)*(e+n+1))}}),e.extend(e.centralF,{pdf:function(n,r,i){return n>=0?t.sqrt(t.pow(r*n,r)*t.pow(i,i)/t.pow(r*n+i,r+i))/(n*e.betafn(r/2,i/2)):undefined},cdf:function(t,n,r){return e.ibeta(n*t/(n*t+r),n/2,r/2)},inv:function(t,n,r){return r/(n*(1/e.ibetainv(t,n/2,r/2)-1))},mean:function(e,t){return t>2?t/(t-2):undefined},mode:function(e,t){return e>2?t*(e-2)/(e*(t+2)):undefined},sample:function(t,n){var r=e.randg(t/2)*2,i=e.randg(n/2)*2;return r/t/(i/n)},variance:function(e,t){return t>4?2*t*t*(e+t-2)/(e*(t-2)*(t-2)*(t-4)):undefined}}),e.extend(e.cauchy,{pdf:function(e,n,r){return r/(t.pow(e-n,2)+t.pow(r,2))/t.PI},cdf:function(e,n,r){return t.atan((e-n)/r)/t.PI+.5},inv:function(e,n,r){return n+r*t.tan(t.PI*(e-.5))},median:function(e,t){return e},mode:function(e,t){return e},sample:function(n,r){return e.randn()*t.sqrt(1/(2*e.randg(.5)))*r+n}}),e.extend(e.chisquare,{pdf:function(n,r){return t.exp((r/2-1)*t.log(n)-n/2-r/2*t.log(2)-e.gammaln(r/2))},cdf:function(t,n){return e.gammap(n/2,t/2)},inv:function(t,n){return 2*e.gammapinv(t,.5*n)},mean:function(e){return e},median:function(e){return e*t.pow(1-2/(9*e),3)},mode:function(e){return e-2>0?e-2:0},sample:function(t){return e.randg(t/2)*2},variance:function(e){return 2*e}}),e.extend(e.exponential,{pdf:function(e,n){return e<0?0:n*t.exp(-n*e)},cdf:function(e,n){return e<0?0:1-t.exp(-n*e)},inv:function(e,n){return-t.log(1-e)/n},mean:function(e){return 1/e},median:function(e){return 1/e*t.log(2)},mode:function(e){return 0},sample:function(e){return-1/e*t.log(t.random())},variance:function(e){return t.pow(e,-2)}}),e.extend(e.gamma,{pdf:function(n,r,i){return t.exp((r-1)*t.log(n)-n/i-e.gammaln(r)-r*t.log(i))},cdf:function(t,n,r){return e.gammap(n,t/r)},inv:function(t,n,r){return e.gammapinv(t,n)*r},mean:function(e,t){return e*t},mode:function(e,t){return e>1?(e-1)*t:undefined},sample:function(t,n){return e.randg(t)*n},variance:function(e,t){return e*t*t}}),e.extend(e.invgamma,{pdf:function(n,r,i){return t.exp(-(r+1)*t.log(n)-i/n-e.gammaln(r)+r*t.log(i))},cdf:function(t,n,r){return 1-e.gammap(n,r/t)},inv:function(t,n,r){return r/e.gammapinv(1-t,n)},mean:function(e,t){return e>1?t/(e-1):undefined},mode:function(e,t){return t/(e+1)},sample:function(t,n){return n/e.randg(t)},variance:function(e,t){return e>2?t*t/((e-1)*(e-1)*(e-2)):undefined}}),e.extend(e.kumaraswamy,{pdf:function(e,n,r){return t.exp(t.log(n)+t.log(r)+(n-1)*t.log(e)+(r-1)*t.log(1-t.pow(e,n)))},cdf:function(e,n,r){return 1-t.pow(1-t.pow(e,n),r)},mean:function(t,n){return n*e.gammafn(1+1/t)*e.gammafn(n)/e.gammafn(1+1/t+n)},median:function(e,n){return t.pow(1-t.pow(2,-1/n),1/e)},mode:function(e,n){return e>=1&&n>=1&&e!==1&&n!==1?t.pow((e-1)/(e*n-1),1/e):undefined},variance:function(e,t){}}),e.extend(e.lognormal,{pdf:function(e,n,r){return t.exp(-t.log(e)-.5*t.log(2*t.PI)-t.log(r)-t.pow(t.log(e)-n,2)/(2*r*r))},cdf:function(n,r,i){return.5+.5*e.erf((t.log(n)-r)/t.sqrt(2*i*i))},inv:function(n,r,i){return t.exp(-1.4142135623730951*i*e.erfcinv(2*n)+r)},mean:function(e,n){return t.exp(e+n*n/2)},median:function(e,n){return t.exp(e)},mode:function(e,n){return t.exp(e-n*n)},sample:function(n,r){return t.exp(e.randn()*r+n)},variance:function(e,n){return(t.exp(n*n)-1)*t.exp(2*e+n*n)}}),e.extend(e.normal,{pdf:function(e,n,r){return t.exp(-0.5*t.log(2*t.PI)-t.log(r)-t.pow(e-n,2)/(2*r*r))},cdf:function(n,r,i){return.5*(1+e.erf((n-r)/t.sqrt(2*i*i)))},inv:function(t,n,r){return-1.4142135623730951*r*e.erfcinv(2*t)+n},mean:function(e,t){return e},median:function(e,t){return e},mode:function(e,t){return e},sample:function(t,n){return e.randn()*n+t},variance:function(e,t){return t*t}}),e.extend(e.pareto,{pdf:function(e,n,r){return e>n?r*t.pow(n,r)/t.pow(e,r+1):undefined},cdf:function(e,n,r){return 1-t.pow(n/e,r)},mean:function(e,n){return n>1?n*t.pow(e,n)/(n-1):undefined},median:function(e,n){return e*n*t.SQRT2},mode:function(e,t){return e},variance:function(e,n){return n>2?e*e*n/(t.pow(n-1,2)*(n-2)):undefined}}),e.extend(e.studentt,{pdf:function(n,r){return e.gammafn((r+1)/2)/(t.sqrt(r*t.PI)*e.gammafn(r/2))*t.pow(1+n*n/r,-((r+1)/2))},cdf:function(n,r){var i=r/2;return e.ibeta((n+t.sqrt(n*n+r))/(2*t.sqrt(n*n+r)),i,i)},inv:function(n,r){var i=e.ibetainv(2*t.min(n,1-n),.5*r,.5);return i=t.sqrt(r*(1-i)/i),n>0?i:-i},mean:function(e){return e>1?0:undefined},median:function(e){return 0},mode:function(e){return 0},sample:function(n){return e.randn()*t.sqrt(n/(2*e.randg(n/2)))},variance:function(e){return e>2?e/(e-2):e>1?Infinity:undefined}}),e.extend(e.weibull,{pdf:function(e,n,r){return e<0?0:r/n*t.pow(e/n,r-1)*t.exp(-t.pow(e/n,r))},cdf:function(e,n,r){return e<0?0:1-t.exp(-t.pow(e/n,r))},inv:function(e,n,r){return n*t.pow(-t.log(1-e),1/r)},mean:function(t,n){return t*e.gammafn(1+1/n)},median:function(e,n){return e*t.pow(t.log(2),1/n)},mode:function(e,n){return n>1?e*t.pow((n-1)/n,1/n):undefined},sample:function(e,n){return e*t.pow(-t.log(t.random()),1/n)},variance:function(n,r){return n*n*e.gammafn(1+2/r)-t.pow(this.mean(n,r),2)}}),e.extend(e.uniform,{pdf:function(e,t,n){return e<t||e>n?0:1/(n-t)},cdf:function(e,t,n){return e<t?0:e<n?(e-t)/(n-t):1},mean:function(e,t){return.5*(e+t)},median:function(t,n){return e.mean(t,n)},mode:function(e,t){},sample:function(e,n){return e/2+n/2+(n/2-e/2)*(2*t.random()-1)},variance:function(e,n){return t.pow(n-e,2)/12}}),e.extend(e.binomial,{pdf:function(n,r,i){return i===0||i===1?r*i===n?1:0:e.combination(r,n)*t.pow(i,n)*t.pow(1-i,r-n)},cdf:function(t,n,r){var i=[],s=0;if(t<0)return 0;if(t<n){for(;s<=t;s++)i[s]=e.binomial.pdf(s,n,r);return e.sum(i)}return 1}}),e.extend(e.negbin,{pdf:function(n,r,i){return n!==n|0?!1:n<0?0:e.combination(n+r-1,n)*t.pow(1-i,r)*t.pow(i,n)},cdf:function(t,n,r){var i=0,s=0;if(t<0)return 0;for(;s<=t;s++)i+=e.negbin.pdf(s,n,r);return i}}),e.extend(e.hypgeom,{pdf:function(t,n,r,i){return t!==t|0?!1:t<0?0:e.combination(r,t)*e.combination(n-r,i-t)/e.combination(n,i)},cdf:function(t,n,r,i){var s=0,o=0;if(t<0)return 0;for(;o<=t;o++)s+=e.hypgeom.pdf(o,n,r,i);return s}}),e.extend(e.poisson,{pdf:function(n,r){return t.pow(r,n)*t.exp(-r)/e.factorial(n)},cdf:function(t,n){var r=[],i=0;if(t<0)return 0;for(;i<=t;i++)r.push(e.poisson.pdf(i,n));return e.sum(r)},mean:function(e){return e},variance:function(e){return e},sample:function(e){var n=1,r=0,i=t.exp(-e);do r++,n*=t.random();while(n>i);return r-1}}),e.extend(e.triangular,{pdf:function(e,t,n,r){return n<=t||r<t||r>n?undefined:e<t||e>n?0:e<=r?2*(e-t)/((n-t)*(r-t)):2*(n-e)/((n-t)*(n-r))},cdf:function(e,n,r,i){return r<=n||i<n||i>r?undefined:e<n?0:e<=i?t.pow(e-n,2)/((r-n)*(i-n)):1-t.pow(r-e,2)/((r-n)*(r-i))},mean:function(e,t,n){return(e+t+n)/3},median:function(e,n,r){if(r<=(e+n)/2)return n-t.sqrt((n-e)*(n-r))/t.sqrt(2);if(r>(e+n)/2)return e+t.sqrt((n-e)*(r-e))/t.sqrt(2)},mode:function(e,t,n){return n},sample:function(e,n,r){var i=t.random();return i<(r-e)/(n-e)?e+t.sqrt(i*(n-e)*(r-e)):n-t.sqrt((1-i)*(n-e)*(n-r))},variance:function(e,t,n){return(e*e+t*t+n*n-e*t-e*n-t*n)/18}})}(this.jStat,Math),function(e,t){var n=Array.prototype.push,r=e.utils.isArray;e.extend({add:function(t,n){return r(n)?(r(n[0])||(n=[n]),e.map(t,function(e,t,r){return e+n[t][r]})):e.map(t,function(e){return e+n})},subtract:function(t,n){return r(n)?(r(n[0])||(n=[n]),e.map(t,function(e,t,r){return e-n[t][r]||0})):e.map(t,function(e){return e-n})},divide:function(t,n){return r(n)?(r(n[0])||(n=[n]),e.multiply(t,e.inv(n))):e.map(t,function(e){return e/n})},multiply:function(t,n){var i,s,o,u,a=t.length,f=t[0].length,l=e.zeros(a,o=r(n)?n[0].length:f),c=0;if(r(n)){for(;c<o;c++)for(i=0;i<a;i++){u=0;for(s=0;s<f;s++)u+=t[i][s]*n[s][c];l[i][c]=u}return a===1&&c===1?l[0][0]:l}return e.map(t,function(e){return e*n})},dot:function(t,n){r(t[0])||(t=[t]),r(n[0])||(n=[n]);var i=t[0].length===1&&t.length!==1?e.transpose(t):t,s=n[0].length===1&&n.length!==1?e.transpose(n):n,o=[],u=0,a=i.length,f=i[0].length,l,c;for(;u<a;u++){o[u]=[],l=0;for(c=0;c<f;c++)l+=i[u][c]*s[u][c];o[u]=l}return o.length===1?o[0]:o},pow:function(n,r){return e.map(n,function(e){return t.pow(e,r)})},abs:function(n){return e.map(n,function(e){return t.abs(e)})},norm:function(e,n){var i=0,s=0;isNaN(n)&&(n=2),r(e[0])&&(e=e[0]);for(;s<e.length;s++)i+=t.pow(t.abs(e[s]),n);return t.pow(i,1/n)},angle:function(n,r){return t.acos(e.dot(n,r)/(e.norm(n)*e.norm(r)))},aug:function(e,t){var r=e.slice(),i=0;for(;i<r.length;i++)n.apply(r[i],t[i]);return r},inv:function(t){var n=t.length,r=t[0].length,i=e.identity(n,r),s=e.gauss_jordan(t,i),o=[],u=0,a;for(;u<n;u++){o[u]=[];for(a=r-1;a<s[0].length;a++)o[u][a-r]=s[u][a]}return o},det:function(e){var t=e.length,n=t*2,r=new Array(n),i=t-1,s=n-1,o=i-t+1,u=s,a=0,f=0,l;if(t===2)return e[0][0]*e[1][1]-e[0][1]*e[1][0];for(;a<n;a++)r[a]=1;for(a=0;a<t;a++){for(l=0;l<t;l++)r[o<0?o+t:o]*=e[a][l],r[u<t?u+t:u]*=e[a][l],o++,u--;o=--i-t+1,u=--s}for(a=0;a<t;a++)f+=r[a];for(;a<n;a++)f-=r[a];return f},gauss_elimination:function(n,r){var i=0,s=0,o=n.length,u=n[0].length,a=1,f=0,l=[],c,h,p,d;n=e.aug(n,r),c=n[0].length;for(;i<o;i++){h=n[i][i],s=i;for(d=i+1;d<u;d++)h<t.abs(n[d][i])&&(h=n[d][i],s=d);if(s!=i)for(d=0;d<c;d++)p=n[i][d],n[i][d]=n[s][d],n[s][d]=p;for(s=i+1;s<o;s++){a=n[s][i]/n[i][i];for(d=i;d<c;d++)n[s][d]=n[s][d]-a*n[i][d]}}for(i=o-1;i>=0;i--){f=0;for(s=i+1;s<=o-1;s++)f=l[s]*n[i][s];l[i]=(n[i][c-1]-f)/n[i][i]}return l},gauss_jordan:function(n,r){var i=e.aug(n,r),s=i.length,o=i[0].length;for(var u=0;u<s;u++){var a=u;for(var f=u+1;f<s;f++)t.abs(i[f][u])>t.abs(i[a][u])&&(a=f);var l=i[u];i[u]=i[a],i[a]=l;for(var f=u+1;f<s;f++){c=i[f][u]/i[u][u];for(var h=u;h<o;h++)i[f][h]-=i[u][h]*c}}for(var u=s-1;u>=0;u--){c=i[u][u];for(var f=0;f<u;f++)for(var h=o-1;h>u-1;h--)i[f][h]-=i[u][h]*i[f][u]/c;i[u][u]/=c;for(var h=s;h<o;h++)i[u][h]/=c}return i},lu:function(e,t){},cholesky:function(e,t){},gauss_jacobi:function(n,r,i,s){var o=0,u=0,a=n.length,f=[],l=[],c=[],h,p,d,v;for(;o<a;o++){f[o]=[],l[o]=[],c[o]=[];for(u=0;u<a;u++)o>u?(f[o][u]=n[o][u],l[o][u]=c[o][u]=0):o<u?(l[o][u]=n[o][u],f[o][u]=c[o][u]=0):(c[o][u]=n[o][u],f[o][u]=l[o][u]=0)}d=e.multiply(e.multiply(e.inv(c),e.add(f,l)),-1),p=e.multiply(e.inv(c),r),h=i,v=e.add(e.multiply(d,i),p),o=2;while(t.abs(e.norm(e.subtract(v,h)))>s)h=v,v=e.add(e.multiply(d,h),p),o++;return v},gauss_seidel:function(n,r,i,s){var o=0,u=n.length,a=[],f=[],l=[],c,h,p,d,v;for(;o<u;o++){a[o]=[],f[o]=[],l[o]=[];for(c=0;c<u;c++)o>c?(a[o][c]=n[o][c],f[o][c]=l[o][c]=0):o<c?(f[o][c]=n[o][c],a[o][c]=l[o][c]=0):(l[o][c]=n[o][c],a[o][c]=f[o][c]=0)}d=e.multiply(e.multiply(e.inv(e.add(l,a)),f),-1),p=e.multiply(e.inv(e.add(l,a)),r),h=i,v=e.add(e.multiply(d,i),p),o=2;while(t.abs(e.norm(e.subtract(v,h)))>s)h=v,v=e.add(e.multiply(d,h),p),o+=1;return v},SOR:function(n,r,i,s,o){var u=0,a=n.length,f=[],l=[],c=[],h,p,d,v,m;for(;u<a;u++){f[u]=[],l[u]=[],c[u]=[];for(h=0;h<a;h++)u>h?(f[u][h]=n[u][h],l[u][h]=c[u][h]=0):u<h?(l[u][h]=n[u][h],f[u][h]=c[u][h]=0):(c[u][h]=n[u][h],f[u][h]=l[u][h]=0)}v=e.multiply(e.inv(e.add(c,e.multiply(f,o))),e.subtract(e.multiply(c,1-o),e.multiply(l,o))),d=e.multiply(e.multiply(e.inv(e.add(c,e.multiply(f,o))),r),o),p=i,m=e.add(e.multiply(v,i),d),u=2;while(t.abs(e.norm(e.subtract(m,p)))>s)p=m,m=e.add(e.multiply(v,p),d),u++;return m},householder:function(n){var r=n.length,i=n[0].length,s=0,o=[],u=[],a,f,l,c,h;for(;s<r-1;s++){a=0;for(c=s+1;c<i;c++)a+=n[c][s]*n[c][s];h=n[s+1][s]>0?-1:1,a=h*t.sqrt(a),f=t.sqrt((a*a-n[s+1][s]*a)/2),o=e.zeros(r,1),o[s+1][0]=(n[s+1][s]-a)/(2*f);for(l=s+2;l<r;l++)o[l][0]=n[l][s]/(2*f);u=e.subtract(e.identity(r,i),e.multiply(e.multiply(o,e.transpose(o)),2)),n=e.multiply(u,e.multiply(n,u))}return n},QR:function(n,r){var i=n.length,s=n[0].length,o=0,u=[],a=[],f=[],l,c,h,p,d,v;for(;o<i-1;o++){c=0;for(l=o+1;l<s;l++)c+=n[l][o]*n[l][o];d=n[o+1][o]>0?-1:1,c=d*t.sqrt(c),h=t.sqrt((c*c-n[o+1][o]*c)/2),u=e.zeros(i,1),u[o+1][0]=(n[o+1][o]-c)/(2*h);for(p=o+2;p<i;p++)u[p][0]=n[p][o]/(2*h);a=e.subtract(e.identity(i,s),e.multiply(e.multiply(u,e.transpose(u)),2)),n=e.multiply(a,n),r=e.multiply(a,r)}for(o=i-1;o>=0;o--){v=0;for(l=o+1;l<=s-1;l++)v=f[l]*n[o][l];f[o]=r[o][0]/n[o][o]}return f},jacobi:function(n){var r=1,i=0,s=n.length,o=e.identity(s,s),u=[],a,f,l,c,h,p,d,v;while(r===1){i++,p=n[0][1],c=0,h=1;for(f=0;f<s;f++)for(l=0;l<s;l++)f!=l&&p<t.abs(n[f][l])&&(p=t.abs(n[f][l]),c=f,h=l);n[c][c]===n[h][h]?d=n[c][h]>0?t.PI/4:-t.PI/4:d=t.atan(2*n[c][h]/(n[c][c]-n[h][h]))/2,v=e.identity(s,s),v[c][c]=t.cos(d),v[c][h]=-t.sin(d),v[h][c]=t.sin(d),v[h][h]=t.cos(d),o=e.multiply(o,v),a=e.multiply(e.multiply(e.inv(v),n),v),n=a,r=0;for(f=1;f<s;f++)for(l=1;l<s;l++)f!=l&&t.abs(n[f][l])>.001&&(r=1)}for(f=0;f<s;f++)u.push(n[f][f]);return[o,u]},rungekutta:function(e,t,n,r,i,s){var o,u,a,f,l;if(s===2)while(r<=n)o=t*e(r,i),u=t*e(r+t,i+o),a=i+(o+u)/2,i=a,r+=t;if(s===4)while(r<=n)o=t*e(r,i),u=t*e(r+t/2,i+o/2),f=t*e(r+t/2,i+u/2),l=t*e(r+t,i+f),a=i+(o+2*u+2*f+l)/6,i=a,r+=t;return i},romberg:function(e,n,r,i){var s=0,o=(r-n)/2,u=[],a=[],f=[],l,c,h,p,d,v;while(s<i/2){d=e(n);for(h=n,p=0;h<=r;h+=o,p++)u[p]=h;l=u.length;for(h=1;h<l-1;h++)d+=(h%2!==0?4:2)*e(u[h]);d=o/3*(d+e(r)),f[s]=d,o/=2,s++}c=f.length,l=1;while(c!==1){for(h=0;h<c-1;h++)a[h]=(t.pow(4,l)*f[h+1]-f[h])/(t.pow(4,l)-1);c=a.length,f=a,a=[],l++}return f},richardson:function(e,n,r,i){function s(e,t){var n=0,r=e.length,i;for(;n<r;n++)e[n]===t&&(i=n);return i}var o=e.length,u=t.abs(r-e[s(e,r)+1]),a=0,f=[],l=[],c,h,p,d,v;while(i>=u)c=s(e,r+i),h=s(e,r),f[a]=(n[c]-2*n[h]+n[2*h-c])/(i*i),i/=2,a++;d=f.length,p=1;while(d!=1){for(v=0;v<d-1;v++)l[v]=(t.pow(4,p)*f[v+1]-f[v])/(t.pow(4,p)-1);d=l.length,f=l,l=[],p++}return f},simpson:function(e,t,n,r){var i=(n-t)/r,s=e(t),o=[],u=t,a=0,f=1,l;for(;u<=n;u+=i,a++)o[a]=u;l=o.length;for(;f<l-1;f++)s+=(f%2!==0?4:2)*e(o[f]);return i/3*(s+e(n))},hermite:function(e,t,n,r){var i=e.length,s=0,o=0,u=[],a=[],f=[],l=[],c;for(;o<i;o++){u[o]=1;for(c=0;c<i;c++)o!=c&&(u[o]*=(r-e[c])/(e[o]-e[c]));a[o]=0;for(c=0;c<i;c++)o!=c&&(a[o]+=1/(e[o]-e[c]));f[o]=(1-2*(r-e[o])*a[o])*u[o]*u[o],l[o]=(r-e[o])*u[o]*u[o],s+=f[o]*t[o]+l[o]*n[o]}return s},lagrange:function(e,t,n){var r=0,i=0,s,o,u=e.length;for(;i<u;i++){o=t[i];for(s=0;s<u;s++)i!=s&&(o*=(n-e[s])/(e[i]-e[s]));r+=o}return r},cubic_spline:function(t,n,r){var i=t.length,s=0,o,u=[],a=[],f=[],l=[],c=[],h=[],p=[];for(;s<i-1;s++)c[s]=t[s+1]-t[s];f[0]=0;for(s=1;s<i-1;s++)f[s]=3/c[s]*(n[s+1]-n[s])-3/c[s-1]*(n[s]-n[s-1]);for(s=1;s<i-1;s++)u[s]=[],a[s]=[],u[s][s-1]=c[s-1],u[s][s]=2*(c[s-1]+c[s]),u[s][s+1]=c[s],a[s][0]=f[s];l=e.multiply(e.inv(u),a);for(o=0;o<i-1;o++)h[o]=(n[o+1]-n[o])/c[o]-c[o]*(l[o+1][0]+2*l[o][0])/3,p[o]=(l[o+1][0]-l[o][0])/(3*c[o]);for(o=0;o<i;o++)if(t[o]>r)break;return o-=1,n[o]+(r-t[o])*h[o]+e.sq(r-t[o])*l[o]+(r-t[o])*e.sq(r-t[o])*p[o]},gauss_quadrature:function(){},PCA:function(t){var n=t.length,r=t[0].length,i=!1,s=0,o,u,a=[],f=[],l=[],c=[],h=[],p=[],d=[],v=[],m=[],g=[];for(s=0;s<n;s++)a[s]=e.sum(t[s])/r;for(s=0;s<r;s++){d[s]=[];for(o=0;o<n;o++)d[s][o]=t[o][s]-a[o]}d=e.transpose(d);for(s=0;s<n;s++){v[s]=[];for(o=0;o<n;o++)v[s][o]=e.dot([d[s]],[d[o]])/(r-1)}l=e.jacobi(v),m=l[0],f=l[1],g=e.transpose(m);for(s=0;s<f.length;s++)for(o=s;o<f.length;o++)f[s]<f[o]&&(u=f[s],f[s]=f[o],f[o]=u,c=g[s],g[s]=g[o],g[o]=c);p=e.transpose(d);for(s=0;s<n;s++){h[s]=[];for(o=0;o<p.length;o++)h[s][o]=e.dot([g[s]],[p[o]])}return[t,f,g,h]}}),function(t){for(var n=0;n<t.length;n++)(function(t){e.fn[t]=function(n,r){var i=this;return r?(setTimeout(function(){r.call(i,e.fn[t].call(i,n))},15),this):e(e[t](this,n))}})(t[n])}("add divide multiply subtract dot pow abs norm angle".split(" "))}(this.jStat,Math),jStat.extend({buildxmatrix:function(){var e=new Array(arguments.length);for(var t=0;t<arguments.length;t++){var n=[1];e[t]=n.concat(arguments[t])}return jStat(e)},builddxmatrix:function(){var e=new Array(arguments[0].length);for(var t=0;t<arguments[0].length;t++){var n=[1];e[t]=n.concat(arguments[0][t])}return jStat(e)},buildjxmatrix:function(e){var t=new Array(e.length);for(var n=0;n<e.length;n++)t[n]=e[n];return jStat.builddxmatrix(t)},buildymatrix:function(e){return jStat(e).transpose()},buildjymatrix:function(e){return e.transpose()},matrixmult:function(e,t){if(e.cols()==t.rows()){if(t.rows()>1){var n=[];for(var r=0;r<e.rows();r++){n[r]=[];for(var i=0;i<t.cols();i++){var s=0;for(var o=0;o<e.cols();o++)s+=e.toArray()[r][o]*t.toArray()[o][i];n[r][i]=s}}return jStat(n)}var n=[];for(var r=0;r<e.rows();r++){n[r]=[];for(var i=0;i<t.cols();i++){var s=0;for(var o=0;o<e.cols();o++)s+=e.toArray()[r][o]*t.toArray()[i];n[r][i]=s}}return jStat(n)}},regress:function(e,t){var n=jStat.xtranspxinv(e),r=e.transpose(),i=jStat.matrixmult(jStat(n),r);return jStat.matrixmult(i,t)},regresst:function(e,t,n){var r=jStat.regress(e,t),i={};i.anova={};var s=jStat.jMatYBar(e,r);i.yBar=s;var o=t.mean();i.anova.residuals=jStat.residuals(t,s),i.anova.ssr=jStat.ssr(s,o),i.anova.msr=i.anova.ssr/(e[0].length-1),i.anova.sse=jStat.sse(t,s),i.anova.mse=i.anova.sse/(t.length-(e[0].length-1)-1),i.anova.sst=jStat.sst(t,o),i.anova.mst=i.anova.sst/(t.length-1),i.anova.r2=1-i.anova.sse/i.anova.sst,i.anova.r2<0&&(i.anova.r2=0),i.anova.fratio=i.anova.msr/i.anova.mse,i.anova.pvalue=jStat.anovaftest(i.anova.fratio,e[0].length-1,t.length-(e[0].length-1)-1),i.anova.rmse=Math.sqrt(i.anova.mse),i.anova.r2adj=1-i.anova.mse/i.anova.mst,i.anova.r2adj<0&&(i.anova.r2adj=0),i.stats=new Array(e[0].length);var u=jStat.xtranspxinv(e),a,f,l;for(var c=0;c<r.length;c++)a=Math.sqrt(i.anova.mse*Math.abs(u[c][c])),f=Math.abs(r[c]/a),l=jStat.ttest(f,t.length-e[0].length-1,n),i.stats[c]=[r[c],a,f,l];return i.regress=r,i},xtranspx:function(e){return jStat.matrixmult(e.transpose(),e)},xtranspxinv:function(e){var t=jStat.matrixmult(e.transpose(),e),n=jStat.inv(t);return n},jMatYBar:function(e,t){var n=jStat.matrixmult(e,t);return new jStat(n)},residuals:function(e,t){return jStat.matrixsubtract(e,t)},ssr:function(e,t){var n=0;for(var r=0;r<e.length;r++)n+=Math.pow(e[r]-t,2);return n},sse:function(e,t){var n=0;for(var r=0;r<e.length;r++)n+=Math.pow(e[r]-t[r],2);return n},sst:function(e,t){var n=0;for(var r=0;r<e.length;r++)n+=Math.pow(e[r]-t,2);return n},matrixsubtract:function(e,t){var n=new Array(e.length);for(var r=0;r<e.length;r++){n[r]=new Array(e[r].length);for(var i=0;i<e[r].length;i++)n[r][i]=e[r][i]-t[r][i]}return jStat(n)}}),function(e,t){e.extend({gammaln:function(e){var n=0,r=[76.18009172947146,-86.50532032941678,24.01409824083091,-1.231739572450155,.001208650973866179,-0.000005395239384953],i=1.000000000190015,s,o,u;u=(o=s=e)+5.5,u-=(s+.5)*t.log(u);for(;n<6;n++)i+=r[n]/++o;return t.log(2.5066282746310007*i/s)-u},gammafn:function(e){var n=[-1.716185138865495,24.76565080557592,-379.80425647094563,629.3311553128184,866.9662027904133,-31451.272968848367,-36144.413418691176,66456.14382024054],r=[-30.8402300119739,315.35062697960416,-1015.1563674902192,-3107.771671572311,22538.11842098015,4755.846277527881,-134659.9598649693,-115132.2596755535],i=!1,s=0,o=0,u=0,a=e,f,l,c,h,p,d;if(a<=0){h=a%1+3.6e-16;if(!h)return Infinity;i=(a&1?-1:1)*t.PI/t.sin(t.PI*h),a=1-a}c=a,a<1?l=a++:l=(a-=s=(a|0)-1)-1;for(f=0;f<8;++f)u=(u+n[f])*l,o=o*l+r[f];h=u/o+1;if(c<a)h/=c;else if(c>a)for(f=0;f<s;++f)h*=a,a++;return i&&(h=i/h),h},gammap:function(n,r){var i=e.gammaln(n),s=n,o=1/n,u=o,a=r+1-n,f=1/1e-30,l=1/a,c=l,h=1,p=-~(t.log(n>=1?n:1/n)*8.5+n*.4+17),d,v;if(r<0||n<=0)return NaN;if(r<n+1){for(;h<=p;h++)o+=u*=r/++s;return o*t.exp(-r+n*t.log(r)-i)}for(;h<=p;h++)d=-h*(h-n),a+=2,l=d*l+a,f=a+d/f,l=1/l,c*=l*f;return 1-c*t.exp(-r+n*t.log(r)-i)},factorialln:function(t){return t<0?NaN:e.gammaln(t+1)},factorial:function(t){return t<0?NaN:e.gammafn(t+1)},combination:function(n,r){return n>170||r>170?t.exp(e.combinationln(n,r)):e.factorial(n)/e.factorial(r)/e.factorial(n-r)},combinationln:function(t,n){return e.factorialln(t)-e.factorialln(n)-e.factorialln(t-n)},permutation:function(t,n){return e.factorial(t)/e.factorial(t-n)},betafn:function(n,r){return n<=0||r<=0?undefined:n+r>170?t.exp(e.betaln(n,r)):e.gammafn(n)*e.gammafn(r)/e.gammafn(n+r)},betaln:function(t,n){return e.gammaln(t)+e.gammaln(n)-e.gammaln(t+n)},betacf:function(e,n,r){var i=1e-30,s=1,o,u,a,f,l,c,h,p,d;h=n+r,d=n+1,p=n-1,a=1,f=1-h*e/d,t.abs(f)<i&&(f=i),f=1/f,c=f;for(;s<=100;s++){o=2*s,u=s*(r-s)*e/((p+o)*(n+o)),f=1+u*f,t.abs(f)<i&&(f=i),a=1+u/a,t.abs(a)<i&&(a=i),f=1/f,c*=f*a,u=-(n+s)*(h+s)*e/((n+o)*(d+o)),f=1+u*f,t.abs(f)<i&&(f=i),a=1+u/a,t.abs(a)<i&&(a=i),f=1/f,l=f*a,c*=l;if(t.abs(l-1)<3e-7)break}return c},gammapinv:function(n,r){var i=0,s=r-1,o=1e-8,u=e.gammaln(r),a,f,l,c,h,p,d;if(n>=1)return t.max(100,r+100*t.sqrt(r));if(n<=0)return 0;r>1?(p=t.log(s),d=t.exp(s*(p-1)-u),h=n<.5?n:1-n,l=t.sqrt(-2*t.log(h)),a=(2.30753+l*.27061)/(1+l*(.99229+l*.04481))-l,n<.5&&(a=-a),a=t.max(.001,r*t.pow(1-1/(9*r)-a/(3*t.sqrt(r)),3))):(l=1-r*(.253+r*.12),n<l?a=t.pow(n/l,1/r):a=1-t.log(1-(n-l)/(1-l)));for(;i<12;i++){if(a<=0)return 0;f=e.gammap(r,a)-n,r>1?l=d*t.exp(-(a-s)+s*(t.log(a)-p)):l=t.exp(-a+s*t.log(a)-u),c=f/l,a-=l=c/(1-.5*t.min(1,c*((r-1)/a-1))),a<=0&&(a=.5*(a+l));if(t.abs(l)<o*a)break}return a},erf:function(e){var n=[-1.3026537197817094,.6419697923564902,.019476473204185836,-0.00956151478680863,-0.000946595344482036,.000366839497852761,42523324806907e-18,-0.000020278578112534,-0.000001624290004647,130365583558e-17,1.5626441722e-8,-8.5238095915e-8,6.529054439e-9,5.059343495e-9,-9.91364156e-10,-2.27365122e-10,9.6467911e-11,2.394038e-12,-6.886027e-12,8.94487e-13,3.13092e-13,-1.12708e-13,3.81e-16,7.106e-15,-1.523e-15,-9.4e-17,1.21e-16,-2.8e-17],r=n.length-1,i=!1,s=0,o=0,u,a,f,l;e<0&&(e=-e,i=!0),u=2/(2+e),a=4*u-2;for(;r>0;r--)f=s,s=a*s-o+n[r],o=f;return l=u*t.exp(-e*e+.5*(n[0]+a*s)-o),i?l-1:1-l},erfc:function(t){return 1-e.erf(t)},erfcinv:function(n){var r=0,i,s,o,u;if(n>=2)return-100;if(n<=0)return 100;u=n<1?n:2-n,o=t.sqrt(-2*t.log(u/2)),i=-0.70711*((2.30753+o*.27061)/(1+o*(.99229+o*.04481))-o);for(;r<2;r++)s=e.erfc(i)-u,i+=s/(1.1283791670955126*t.exp(-i*i)-i*s);return n<1?i:-i},ibetainv:function(n,r,i){var s=1e-8,o=r-1,u=i-1,a=0,f,l,c,h,p,d,v,m,g,y,b;if(n<=0)return 0;if(n>=1)return 1;r>=1&&i>=1?(c=n<.5?n:1-n,h=t.sqrt(-2*t.log(c)),v=(2.30753+h*.27061)/(1+h*(.99229+h*.04481))-h,n<.5&&(v=-v),m=(v*v-3)/6,g=2/(1/(2*r-1)+1/(2*i-1)),y=v*t.sqrt(m+g)/g-(1/(2*i-1)-1/(2*r-1))*(m+5/6-2/(3*g)),v=r/(r+i*t.exp(2*y))):(f=t.log(r/(r+i)),l=t.log(i/(r+i)),h=t.exp(r*f)/r,p=t.exp(i*l)/i,y=h+p,n<h/y?v=t.pow(r*y*n,1/r):v=1-t.pow(i*y*(1-n),1/i)),b=-e.gammaln(r)-e.gammaln(i)+e.gammaln(r+i);for(;a<10;a++){if(v===0||v===1)return v;d=e.ibeta(v,r,i)-n,h=t.exp(o*t.log(v)+u*t.log(1-v)+b),p=d/h,v-=h=p/(1-.5*t.min(1,p*(o/v-u/(1-v)))),v<=0&&(v=.5*(v+h)),v>=1&&(v=.5*(v+h+1));if(t.abs(h)<s*v&&a>0)break}return v},ibeta:function(n,r,i){var s=n===0||n===1?0:t.exp(e.gammaln(r+i)-e.gammaln(r)-e.gammaln(i)+r*t.log(n)+i*t.log(1-n));return n<0||n>1?!1:n<(r+1)/(r+i+2)?s*e.betacf(n,r,i)/r:1-s*e.betacf(1-n,i,r)/i},randn:function(n,r){var i,s,o,u,a,f;r||(r=n);if(n)return e.create(n,r,function(){return e.randn()});do i=t.random(),s=1.7156*(t.random()-.5),o=i-.449871,u=t.abs(s)+.386595,a=o*o+u*(.196*u-.25472*o);while(a>.27597&&(a>.27846||s*s>-4*t.log(i)*i*i));return s/i},randg:function(n,r,i){var s=n,o,u,a,f,l,c;i||(i=r),n||(n=1);if(r)return c=e.zeros(r,i),c.alter(function(){return e.randg(n)}),c;n<1&&(n+=1),o=n-1/3,u=1/t.sqrt(9*o);do{do l=e.randn(),f=1+u*l;while(f<=0);f=f*f*f,a=t.random()}while(a>1-.331*t.pow(l,4)&&t.log(a)>.5*l*l+o*(1-f+t.log(f)));if(n==s)return o*f;do a=t.random();while(a===0);return t.pow(a,1/s)*o*f}}),function(t){for(var n=0;n<t.length;n++)(function(t){e.fn[t]=function(){return e(e.map(this,function(n){return e[t](n)}))}})(t[n])}("gammaln gammafn factorial factorialln".split(" ")),function(t){for(var n=0;n<t.length;n++)(function(t){e.fn[t]=function(){return e(e[t].apply(null,arguments))}})(t[n])}("randn".split(" "))}(this.jStat,Math),function(e,t){var n=[].slice,r=e.utils.isNumber;e.extend({zscore:function(){var t=n.call(arguments);return r(t[1])?(t[0]-t[1])/t[2]:(t[0]-e.mean(t[1]))/e.stdev(t[1],t[2])},ztest:function(){var i=n.call(arguments);if(i.length===4){if(r(i[1])){var s=e.zscore(i[0],i[1],i[2]);return i[3]===1?e.normal.cdf(-t.abs(s),0,1):e.normal.cdf(-t.abs(s),0,1)*2}var s=i[0];return i[2]===1?e.normal.cdf(-t.abs(s),0,1):e.normal.cdf(-t.abs(s),0,1)*2}var s=e.zscore(i[0],i[1],i[3]);return i[1]===1?e.normal.cdf(-t.abs(s),0,1):e.normal.cdf(-t.abs(s),0,1)*2}}),e.extend(e.fn,{zscore:function(e,t){return(e-this.mean())/this.stdev(t)},ztest:function(n,r,i){var s=t.abs(this.zscore(n,i));return r===1?e.normal.cdf(-s,0,1):e.normal.cdf(-s,0,1)*2}}),e.extend({tscore:function(){var r=n.call(arguments);return r.length===4?(r[0]-r[1])/(r[2]/t.sqrt(r[3])):(r[0]-e.mean(r[1]))/(e.stdev(r[1],!0)/t.sqrt(r[1].length))},ttest:function(){var i=n.call(arguments),s;return i.length===5?(s=t.abs(e.tscore(i[0],i[1],i[2],i[3])),i[4]===1?e.studentt.cdf(-s,i[3]-1):e.studentt.cdf(-s,i[3]-1)*2):r(i[1])?(s=t.abs(i[0]),i[2]==1?e.studentt.cdf(-s,i[1]-1):e.studentt.cdf(-s,i[1]-1)*2):(s=t.abs(e.tscore(i[0],i[1])),i[2]==1?e.studentt.cdf(-s,i[1].length-1):e.studentt.cdf(-s,i[1].length-1)*2)}}),e.extend(e.fn,{tscore:function(e){return(e-this.mean())/(this.stdev(!0)/t.sqrt(this.cols()))},ttest:function(n,r){return r===1?1-e.studentt.cdf(t.abs(this.tscore(n)),this.cols()-1):e.studentt.cdf(-t.abs(this.tscore(n)),this.cols()-1)*2}}),e.extend({anovafscore:function(){var r=n.call(arguments),i,s,o,u,a,f,l,c;if(r.length===1){a=new Array(r[0].length);for(l=0;l<r[0].length;l++)a[l]=r[0][l];r=a}if(r.length===2)return e.variance(r[0])/e.variance(r[1]);s=new Array;for(l=0;l<r.length;l++)s=s.concat(r[l]);o=e.mean(s),i=0;for(l=0;l<r.length;l++)i+=r[l].length*t.pow(e.mean(r[l])-o,2);i/=r.length-1,f=0;for(l=0;l<r.length;l++){u=e.mean(r[l]);for(c=0;c<r[l].length;c++)f+=t.pow(r[l][c]-u,2)}return f/=s.length-r.length,i/f},anovaftest:function(){var t=n.call(arguments),i,s,o,u;if(r(t[0]))return 1-e.centralF.cdf(t[0],t[1],t[2]);anovafscore=e.anovafscore(t),i=t.length-1,o=0;for(u=0;u<t.length;u++)o+=t[u].length;return s=o-i-1,1-e.centralF.cdf(anovafscore,i,s)},ftest:function(t,n,r){return 1-e.centralF.cdf(t,n,r)}}),e.extend(e.fn,{anovafscore:function(){return e.anovafscore(this.toArray())},anovaftest:function(){var t=0,n;for(n=0;n<this.length;n++)t+=this[n].length;return e.ftest(this.anovafscore(),this.length-1,t-this.length)}}),e.extend({normalci:function(){var r=n.call(arguments),i=new Array(2),s;return r.length===4?s=t.abs(e.normal.inv(r[1]/2,0,1)*r[2]/t.sqrt(r[3])):s=t.abs(e.normal.inv(r[1]/2,0,1)*e.stdev(r[2])/t.sqrt(r[2].length)),i[0]=r[0]-s,i[1]=r[0]+s,i},tci:function(){var r=n.call(arguments),i=new Array(2),s;return r.length===4?s=t.abs(e.studentt.inv(r[1]/2,r[3]-1)*r[2]/t.sqrt(r[3])):s=t.abs(e.studentt.inv(r[1]/2,r[2].length)*e.stdev(r[2],!0)/t.sqrt(r[2].length)),i[0]=r[0]-s,i[1]=r[0]+s,i},significant:function(e,t){return e<t}}),e.extend(e.fn,{normalci:function(t,n){return e.normalci(t,n,this.toArray())},tci:function(t,n){return e.tci(t,n,this.toArray())}})}(this.jStat,Math),function(e,t){var n=e.utils.isFunction,r=function(e,t){return e-t};e.extend({sum:function(e){var t=0,n=e.length,r;while(--n>=0)t+=e[n];return t},sumsqrd:function(e){var t=0,n=e.length;while(--n>=0)t+=e[n]*e[n];return t},sumsqerr:function(t){var n=e.mean(t),r=0,i=t.length,s;while(--i>=0)s=t[i]-n,r+=s*s;return r},product:function(e){var t=1,n=e.length;while(--n>=0)t*=e[n];return t},min:function(e){var t=e[0],n=0;while(++n<e.length)e[n]<t&&(t=e[n]);return t},max:function(e){var t=e[0],n=0;while(++n<e.length)e[n]>t&&(t=e[n]);return t},mean:function(t){return e
.sum(t)/t.length},meansqerr:function(t){return e.sumsqerr(t)/t.length},geomean:function(n){return t.pow(e.product(n),1/n.length)},median:function(e){var t=e.length,n=e.slice().sort(r);return t&1?n[t/2|0]:(n[t/2-1]+n[t/2])/2},cumsum:function(e){var t=e.length,n=new Array(t),r=1;n[0]=e[0];for(;r<t;r++)n[r]=n[r-1]+e[r];return n},diff:function(e){var t=[],n=e.length,r=1;for(r=1;r<n;r++)t.push(e[r]-e[r-1]);return t},mode:function(e){var t=e.length,n=e.slice().sort(r),i=1,s=0,o=0,u=0,a=[];for(;u<t;u++)n[u]===n[u+1]?i++:(i>s?(a=[n[u]],s=i,o=0):i===s&&(a.push(n[u]),o++),i=1);return o===0?a[0]:a},range:function(t){return e.max(t)-e.min(t)},variance:function(t,n){return e.sumsqerr(t)/(t.length-(n?1:0))},stdev:function(n,r){return t.sqrt(e.variance(n,r))},meandev:function(n){var r=0,i=e.mean(n),s=n.length-1;for(;s>=0;s--)r+=t.abs(n[s]-i);return r/n.length},meddev:function(n){var r=0,i=e.median(n),s=n.length-1;for(;s>=0;s--)r+=t.abs(n[s]-i);return r/n.length},coeffvar:function(t){return e.stdev(t)/e.mean(t)},quartiles:function(e){var n=e.length,i=e.slice().sort(r);return[i[t.round(n/4)-1],i[t.round(n/2)-1],i[t.round(n*3/4)-1]]},covariance:function(t,n){var r=e.mean(t),i=e.mean(n),s=t.length,o=new Array(s),u=0;for(;u<s;u++)o[u]=(t[u]-r)*(n[u]-i);return e.sum(o)/(s-1)},corrcoeff:function(t,n){return e.covariance(t,n)/e.stdev(t,1)/e.stdev(n,1)}}),function(t){for(var r=0;r<t.length;r++)(function(t){e.fn[t]=function(r,i){var s=[],o=0,u=this;n(r)&&(i=r,r=!1);if(i)return setTimeout(function(){i.call(u,e.fn[t].call(u,r))},15),this;if(this.length>1){u=r===!0?this:this.transpose();for(;o<u.length;o++)s[o]=e[t](u[o]);return r===!0?e[t](e.utils.toVector(s)):s}return e[t](this[0],r)}})(t[r])}("sum sumsqrd sumsqerr product min max mean meansqerr geomean median diff mode range variance stdev meandev meddev coeffvar quartiles".split(" ")),e.fn.cumsum=function(t,r){var i=[],s=0,o=this;n(t)&&(r=t,t=!1);if(r)return setTimeout(function(){r.call(o,e.fn.cumsum.call(o,t))},15),this;if(this.length>1){o=t===!0?this:this.transpose();for(;s<o.length;s++)i[s]=e.cumsum(o[s]);return i}return e.cumsum(this[0],t)}}(this.jStat,Math);

//this extension will add a new JME function to generate a normal random variable
//so it needs Numbas.math and Numbas.jme to be loaded before it can run
Numbas.queueScript('extensions/stats/stats.js',['math','jme'],function() {

	var math = Numbas.math;
	var types = Numbas.jme.types;
	var funcObj = Numbas.jme.funcObj;
	var TNum = types.TNum;
	var TList = types.TList;

	var stats = Numbas.extensions.stats  = {};

	var statsScope = Numbas.extensions.stats.scope = new Numbas.jme.Scope();

	var listFuncs = 'sum sumsqrd sumsqerr product min max mean meansqerr geomean median cumsum diff mode range variance stdev meandev meddev coeffvar quartiles covariance corrcoeff'.split(' ');
	for(var i=0;i<listFuncs.length;i++) {
		var fn = listFuncs[i];
		statsScope.addFunction(new funcObj(fn, [TList],TNum, jStat[fn], {unwrapLists:true}));
	}

	// fill in geometric distribution because jStat doesn't have it
	if(!('geometric' in jStat)) {
		jStat.geometric = {
			pdf: function(x,p) {
				return Math.pow(1-p,x-1)*p
			},

			cdf: function(x,p) {
				return 1-Math.pow(1-p,x)
			},

			mean: function(p) {
				return 1/p;
			},

			median: function(p) {
				return Math.ceil(-1/(Math.log(1-p)/Math.log(2)));
			},
			mode: function() {
				return 1;
			},
			sample: function(p) {
				var u = Math.random()
				var z = (Math.log(1-u))/(Math.log(1-p))

				return Math.round(z);
			},
			variance: function(p) {
				return (1-p)/(p*p);
			}
		}
	}

	//dictionary of distribution methods; values are the number of extra parameters to take
	var methods = {
		pdf: 1,
		cdf: 1,
		inv: 1,
		mean: 0,
		median: 0,
		mode: 0,
		sample: 0,
		variance: 0
	}

	var jdistributions = {
		beta: 2,
		centralF: 2,
		cauchy: 2,
		chisquare: 1,
		exponential: 1,
		gamma: 2,
		invgamma: 2,
		kumaraswamy: 2,
		lognormal: 2,
		normal: 2,
		pareto: 2,
		studentt: 1,
		weibull: 2,
		uniform: 2,
		binomial: 2,
		geometric: 1,
		negbin: 2,
		hypgeom: 3,
		poisson: 1,
		triangular: 3
	}

	for(var name in jdistributions) {
		for(var method in methods) {
			if(method in jStat[name]) {
				var n = jdistributions[name]+methods[method];
				var args = [];
				for(var i=0;i<n;i++)
					args.push(TNum);

				statsScope.addFunction(new funcObj(name+method, args, TNum, jStat[name][method]));
			}
		}
	}



	statsScope.addFunction(new funcObj('zScore',[TNum,TNum,TNum],TNum,jStat.zscore));
	statsScope.addFunction(new funcObj('zScore',[TNum,TList],TNum,jStat.zscore,{unwrapLists:true}));

	statsScope.addFunction(new funcObj('zTest',[TNum,TNum,TNum,TNum],TNum,jStat.ztest));
	statsScope.addFunction(new funcObj('zTest',[TNum,TList,TNum],TNum,jStat.ztest,{unwrapLists:true}));

	statsScope.addFunction(new funcObj('tScore',[TNum,TNum,TNum,TNum],TNum,jStat.tscore));
	statsScope.addFunction(new funcObj('tScore',[TNum,TList],TNum,jStat.tscore,{unwrapLists:true}));

	statsScope.addFunction(new funcObj('tTest',[TNum,TNum,TNum,TNum,TNum],TNum,jStat.ttest));
	statsScope.addFunction(new funcObj('tTest',[TNum,TNum,TNum],TNum,jStat.ttest));
	statsScope.addFunction(new funcObj('tTest',[TNum,TList,TNum],TNum,jStat.ttest,{unwrapLists:true}));

	statsScope.addFunction(new funcObj('anovaFScore',['*TList'],TNum,jStat.anovafscore,{unwrapLists:true}));
	statsScope.addFunction(new funcObj('anovaFTest',['*TList'],TNum,jStat.anovaftest,{unwrapLists:true}));
	statsScope.addFunction(new funcObj('ftest',[TNum,TNum,TNum],TNum,jStat.ftest));

	statsScope.addFunction(new funcObj('normalci',[TNum,TNum,TNum,TNum],TNum,jStat.normalci));
	statsScope.addFunction(new funcObj('normalci',[TNum,TNum,TList],TNum,jStat.normalci,{unwrapLists:true}));
	statsScope.addFunction(new funcObj('tci',[TNum,TNum,TNum,TNum],TNum,jStat.tci));
	statsScope.addFunction(new funcObj('tci',[TNum,TNum,TList],TNum,jStat.tci,{unwrapLists:true}));

	var specialFunctions = {
		betafn: 2,
		betaln: 2,
		betacf: 3,
		ibetainv: 3,
		ibeta: 3,
		gammaln: 1,
		gammafn: 1,
		gammap: 2,
		factorialln: 1,
		factorial: 1,
		combination: 2,
		permutation: 2,
		gammapinv: 2,
		erf: 1,
		erfc: 1,
		erfcinv: 1,
		randn: 2,
		randg: 3
	}
	for(var name in specialFunctions) {
		var n = specialFunctions[name];
		var args = [];
		for(var i=0;i<n;i++) { args.push(TNum) };
		statsScope.addFunction(new funcObj(name,args,TNum,jStat[name]));
	}

});
