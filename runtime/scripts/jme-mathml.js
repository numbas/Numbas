/*
 * Copyright (c) Christian Perfect for Newcastle University 2010-2011
 */

Numbas.queueScript('scripts/jme-mathml.js',['jme'],function() {
//convert a MathML expression to JME
var MathMLToJME = Numbas.jme.MathMLToJME = function(node)
{
	var kids = node.selectNodes('*');
	switch(node.nodeName)
	{
	case 'math':
		return MathMLToJME(kids[0]);
	case 'ci':
	case 'csymbol':
		return node.childNodes[0].data;
	case 'cn':
		var n = parseInt(node.childNodes[0].data);
		if(n<0) { n = '('+n+')';}
		return ''+n;
	case 'reln':
		var bits = stupidslice(kids,1).map(MathMLToJME);
		switch(kids[0].nodeName)
		{
		case 'eq':
			return bits.join('=');
		case 'neq':
			return bits.join('<>');
		case 'lt':
			return bits.join('<');
		case 'gt':
			return bits.join('>');
		case 'leq':
			return bits.join('<=');
		case 'geq':
			return bits.join('>=');
		}
		break;
	case 'apply':
		var kids = node.selectNodes('*');
		switch(kids[0].nodeName)
		{
		case 'plus':
			return MathMLoperation('+',kids);
		case 'minus':
			if(kids.length==2)
			{
				return '-'+MathMLToJME(kids[1]);
			}
			else
			{
				return MathMLoperation('-',kids);
			}
		case 'times':
			return MathMLoperation('*',kids,['plus','minus']);
		case 'divide':
			return MathMLoperation('/',kids,['plus','minus','times']);
		case 'power':
			return MathMLoperation('^',kids,['plus','minus','times','divide']);
		case 'and':
			return MathMLoperation(' and ',kids,['or','xor']);
		case 'or':
			return MathMLoperation(' or ',kids,['xor']);
		case 'xor':
			return MathMLoperation(' xor ',kids);
		case 'not':
			return '!('+MathMLToJME(kids[1])+')';
		case 'subs':
			return '('+MathMLToJME(kids[1])+')_('+MathMLToJME(kids[2])+')';
		case 'fn':
			return MathMLfunc( MathMLToJME(kids[0].selectSingleNode('*')),kids);
		case 'factorial':
			return MathMLfunc('fact',kids);
		case 'ceiling':
			return MathMLfunc('ceil',kids);
		case 'root':
			return MathMLfunc('sqrt',kids);
		case 'rem':
			return MathMLfunc('mod',kids);
		case 'diff':
		case 'partialdiff':
			var fname = kids[0].nodeName;
			var bvar = MathMLToJME(node.selectSingleNode('bvar/*'));
			var degree = MathMLToJME(node.selectSingleNode('bvar/degree/*'));
			return fname+'('+MathMLToJME(kids[2])+','+bvar+','+degree+')';
		case 'int':
			var bvar = MathMLToJME(node.selectSingleNode('bvar/*'));
			if(kids.length==3)
			{
				return 'int('+MathMLToJME(kids[2])+','+bvar+')';
			}
			else
			{
				var lowlimit = MathMLToJME(node.selectSingleNode('lowlimit/*'));
				var uplimit = MathMLToJME(node.selectSingleNode('uplimit/*'));
				return 'defint('+MathMLToJME(kids[4])+','+bvar+','+lowlimit+','+uplimit+')';
			}
		case 'limit':
			var bvar = MathMLToJME(node.selectSingleNode('bvar/*'));
			var lowlimit = MathMLToJME(node.selectSingleNode('lowlimit/*'));
			return 'limit('+MathMLToJME(kids[3])+','+bvar+','+lowlimit+')';
		default:
			return MathMLfunc(kids[0].nodeName,kids)
		}
	case 'mfenced':
		return node.getAttribute('open')+MathMLToJME(kids[0])+node.getAttribute('close');
	default:
		throw "Unknown MathML thing "+node.nodeName;
	}
};

//because IE's XML selection objects aren't real arrays, we have to do slices by hand
function stupidslice(a,n)
{
	if(a.slice)
	{
		return a.slice(n);
	}
	else
	{
		var b = new Array(a.length-n);
		for(var i=n;i<a.length;i++)
		{
			b[i-n]=a[i];
		}
		return b;
	}
}

//makes a function which converts an operator application
function MathMLoperation(op,kids,bracketers)
{
	if(bracketers)
	{
		return stupidslice(kids,1).map(MathMLoperand(bracketers)).join(op);
	}
	else
	{
		return stupidslice(kids,1).map(MathMLToJME).join(op);
	}
}

//makes a function which brackets an expression if it is an application of any of the ops named in 'bracketers'
function MathMLoperand(bracketers)
{
	return( function(node)
	{
		var out=MathMLToJME(node);
		if(node.nodeName=='apply' && bracketers.contains(node.selectSingleNode('*').nodeName))
		{
			out='('+out+')';
		}
		return out;
	});
}

//helper to write out function application
function MathMLfunc(name,kids)
{
	return name+'('+stupidslice(kids,1).map(MathMLToJME).join(',')+')';
}

});
