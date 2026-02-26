/*
Copyright 2011-15 Newcastle University
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
/** @file Sets up JME built-in functions.
 *
 * Provides {@link Numbas.jme}
 */
Numbas.queueScript('jme-builtins', ['jme-base', 'jme-rules', 'jme-calculus', 'jme-variables', 'seedrandom'], function() {
var util = Numbas.util;
var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;
var setmath = Numbas.setmath;
var jme = Numbas.jme;
var Fraction = math.Fraction;

var Scope = jme.Scope;

var types = Numbas.jme.types;
const {TNum, TInt, TRational, TDecimal, TString, TBool, THTML, TList, TDict, TMatrix, TName, TRange, TInterval, TSet, TVector, TExpression, TScope, TOp, TFunc, TLambda} = types;

var sig = jme.signature;

/** The built-in JME evaluation scope.
 *
 * @type {Numbas.jme.Scope}
 * @memberof Numbas.jme
 */
var builtinScope = jme.builtinScope = new Scope({rulesets:jme.rules.simplificationRules});
builtinScope.setConstant('nothing', {value: new types.TNothing, tex: '\\text{nothing}'});

/** Definitions of constants to include in `Numbas.jme.builtinScope`.
 *
 * @type {Array.<Numbas.jme.constant_definition>}
 * @memberof Numbas.jme
 */
Numbas.jme.builtin_constants = [
    {name: 'e', value: new TNum(Math.E), tex: 'e'},
    {name: 'pi', value: new TNum(Math.PI), tex: '\\pi'},
    {name: 'i', value: new TNum(math.complex(0, 1)), tex: 'i'},
    {name: 'infinity,infty', value: new TNum(Infinity), tex: '\\infty'},
    {name: 'NaN', value: new TNum(NaN), tex: '\\texttt{NaN}'},
    {name: 'j', value: new TNum(math.complex(0, 1)), tex: 'j', enabled: false},
];
Numbas.jme.variables.makeConstants(Numbas.jme.builtin_constants, builtinScope);

Numbas.jme.function_sets = {};

function builtin_function_set() {
    const set = new jme.FunctionSet(...arguments);
    builtinScope.addFunctionSet(set);
    return set;
}

function get_notation(notation_name) {
    const notation = jme.notations[notation_name];
    if(!notation) {
        throw(new Numbas.Error('jme.func.parse.no notation', {notation_name}));
    }
    return notation;
}

/*-- Arithmetic */
builtin_function_set({name:'arithmetic', description: 'Arithmetic operations'}, (set) => {
    // Real numbers
    set.add_function('+u', [TNum], TNum, function(a) {
        return a;
    });
    set.add_function('-u', [TNum], TNum, math.negate);
    set.add_function('+', [TNum, TNum], TNum, math.add);
    set.add_function('-', [TNum, TNum], TNum, math.sub);
    set.add_function('*', [TNum, TNum], TNum, math.mul);
    set.add_function('/', [TNum, TNum], TNum, math.div);
    set.add_function('^', [TNum, TNum], TNum, math.pow);
    set.add_function('abs', [TNum], TNum, math.abs);

    // Integers
    set.add_function('+u', [TInt], TInt, function(a) {
        return a;
    });
    set.add_function('-u', [TInt], TInt, math.negate);
    set.add_function('+', [TInt, TInt], TInt, math.add);
    set.add_function('-', [TInt, TInt], TInt, math.sub);
    set.add_function('*', [TInt, TInt], TInt, math.mul);
    set.add_function('/', [TInt, TInt], TRational, function(a, b) {
        return new Fraction(a, b);
    });
    set.add_function('^', [TInt, TInt], TNum, function(a, b) {
        return math.pow(a, b);
    });

    // Rationals
    set.add_function('+u', [TRational], TRational, function(a) {
        return a;
    });
    set.add_function('-u', [TRational], TRational, function(r) {
        return r.negate();
    });
    set.add_function('+', [TRational, TRational], TRational, function(a, b) {
        return a.add(b);
    });
    set.add_function('-', [TRational, TRational], TRational, function(a, b) {
        return a.subtract(b);
    });
    set.add_function('*', [TRational, TRational], TRational, function(a, b) {
        return a.multiply(b);
    });
    set.add_function('*', [TRational, TNum], TNum, function(a, b) {
        return math.mul(a.toFloat(), b);
    });
    set.add_function('/', [TRational, TRational], TRational, function(a, b) {
        return a.divide(b);
    });
    set.add_function('^', [TRational, TInt], TRational, function(a, b) {
        return a.pow(b);
    });

    // Decimals
    set.add_function('+u', [TDecimal], TDecimal, function(a) {
        return a;
    });
    set.add_function('-u', [TDecimal], TDecimal, function(a) {
        return a.negated();
    });
    set.add_function('+', [TDecimal, TDecimal], TDecimal, function(a, b) {
        return a.plus(b);
    });
    set.add_function('+', [TNum, TDecimal], TDecimal, function(a, b) {
        return math.ensure_decimal(a).plus(b);
    });
    set.add_function('-', [TDecimal, TDecimal], TDecimal, function(a, b) {
        return a.minus(b);
    });
    set.add_function('-', [TNum, TDecimal], TDecimal, function(a, b) {
        return math.ensure_decimal(a).minus(b);
    });
    set.add_function('*', [TDecimal, TDecimal], TDecimal, function(a, b) {
        return a.times(b);
    });
    set.add_function('/', [TDecimal, TDecimal], TDecimal, function(a, b) {
        return a.dividedBy(b);
    });
    set.add_function('/', [TNum, TDecimal], TDecimal, function(a, b) {
        return math.ensure_decimal(a).dividedBy(b);
    });
    set.add_function('abs', [TDecimal], TDecimal, function(a) {
        return a.absoluteValue();
    });
    set.add_function('^', [TDecimal, TDecimal], TDecimal, function(a, b) {
        return a.pow(b);
    });
    set.add_function('^', [TInt, TDecimal], TDecimal, function(a, b) {
        return math.ensure_decimal(a).pow(b);
    });

});

/*-- Trig, exponentials and roots */
builtin_function_set({name: 'complex_numbers', description: 'Operations on complex numbers'}, (set) => {
    set.add_function('arg', [TNum], TNum, math.arg);
    set.add_function('re', [TNum], TNum, math.re);
    set.add_function('im', [TNum], TNum, math.im);
    set.add_function('conj', [TNum], TNum, math.conjugate);
    set.add_function('arg', [TDecimal], TDecimal, function(a) {
        return a.argument();
    });
});

builtin_function_set({name: 'exponentials', description: 'Exponentials, logarithms and roots'}, (set) => {
    set.add_function('sqrt', [TNum], TNum, math.sqrt);
    set.add_function('ln', [TNum], TNum, math.log);
    set.add_function('log', [TNum], TNum, math.log10);
    set.add_function('log', [TNum, TNum], TNum, math.log_base);
    set.add_function('log', [TDecimal], TDecimal, function(a) {
        return a.re.log();
    })
    set.add_function('log', [TDecimal, TDecimal], TDecimal, function(a, b) {
        return a.re.log().div(b.re.log());
    })
    set.add_function('exp', [TNum], TNum, math.exp);
    set.add_function('gamma', [TNum], TNum, math.gamma);
    set.add_function('exp', [TDecimal], TDecimal, function(a) {
        return a.exp();
    });
    set.add_function('ln', [TDecimal], TDecimal, function(a) {
        return a.ln();
    });
    set.add_function('sqrt', [TDecimal], TDecimal, function(a) {
        return a.squareRoot();
    });
});

builtin_function_set({name: 'trigonometry', description: 'Trigonometric functions'}, (set) => {
    set.add_function('sin', [TNum], TNum, math.sin);
    set.add_function('cos', [TNum], TNum, math.cos);
    set.add_function('tan', [TNum], TNum, math.tan);
    set.add_function('cosec', [TNum], TNum, math.cosec);
    set.add_function('sec', [TNum], TNum, math.sec);
    set.add_function('cot', [TNum], TNum, math.cot);
    set.add_function('arcsin', [TNum], TNum, math.arcsin);
    set.add_function('arccos', [TNum], TNum, math.arccos);
    set.add_function('arctan', [TNum], TNum, math.arctan);
    set.add_function('sinh', [TNum], TNum, math.sinh);
    set.add_function('cosh', [TNum], TNum, math.cosh);
    set.add_function('tanh', [TNum], TNum, math.tanh);
    set.add_function('cosech', [TNum], TNum, math.cosech);
    set.add_function('sech', [TNum], TNum, math.sech);
    set.add_function('coth', [TNum], TNum, math.coth);
    set.add_function('arcsinh', [TNum], TNum, math.arcsinh);
    set.add_function('arccosh', [TNum], TNum, math.arccosh);
    set.add_function('arctanh', [TNum], TNum, math.arctanh);
    set.add_function('atan2', [TNum, TNum], TNum, math.atan2);
    set.add_function('degrees', [TNum], TNum, math.degrees);
    set.add_function('radians', [TNum], TNum, math.radians);
    set.add_function('cos', [TDecimal], TDecimal, function(a) {
        return a.re.cos();
    });
    set.add_function('cosh', [TDecimal], TDecimal, function(a) {
        return a.re.cosh();
    });
    set.add_function('sinh', [TDecimal], TDecimal, function(a) {
        return a.re.sinh();
    });
    set.add_function('tanh', [TDecimal], TDecimal, function(a) {
        return a.re.tanh();
    });
    set.add_function('arccos', [TDecimal], TDecimal, function(a) {
        return a.re.acos();
    });
    set.add_function('arccosh', [TDecimal], TDecimal, function(a) {
        return a.re.acosh();
    });
    set.add_function('arcsinh', [TDecimal], TDecimal, function(a) {
        return a.re.asinh();
    });
    set.add_function('arctanh', [TDecimal], TDecimal, function(a) {
        return a.re.atanh();
    });
    set.add_function('arcsin', [TDecimal], TDecimal, function(a) {
        return a.re.asin();
    });
    set.add_function('arctan', [TDecimal], TDecimal, function(a) {
        return a.re.atan();
    });
    set.add_function('atan2', [TDecimal, TDecimal], TDecimal, function(a, b) {
        return Decimal.atan2(a.re, b.re);
    });
    set.add_function('sin', [TDecimal], TDecimal, function(a) {
        return a.re.sin();
    });
    set.add_function('tan', [TDecimal], TDecimal, function(a) {
        return a.re.tan();
    });

    });

    /*-- Rounding */
    builtin_function_set({name:'rounding', description: 'Rounding and limiting'}, (set) => {
    set.add_function('ceil', [TNum], TNum, null, {
        evaluate: function(args, scope) {
            var n = math.ceil(jme.castToType(args[0], 'number').value);
            if(n.complex) {
                return new TNum(n);
            } else {
                return new TInt(n);
            }
        }
    });
    set.add_function('floor', [TNum], TNum, null, {
        evaluate: function(args, scope) {
            var n = math.floor(jme.castToType(args[0], 'number').value);
            if(n.complex) {
                return new TNum(n);
            } else {
                return new TInt(n);
            }
        }
    });
    set.add_function('round', [TNum], TNum, null, {
        evaluate: function(args, scope) {
            var n = math.round(jme.castToType(args[0], 'number').value);
            if(n.complex) {
                return new TNum(n);
            } else {
                return new TInt(n);
            }
        }
    });
    set.add_function('tonearest', [TNum, TNum], TNum, math.toNearest);
    set.add_function('trunc', [TNum], TNum, math.trunc);
    set.add_function('trunc', [TNum, TNum], TNum, math.trunc);
    set.add_function('fract', [TNum], TNum, math.fract);
    set.add_function('sign', [TNum], TNum, math.sign);
    set.add_function('max', [TNum, TNum], TNum, math.max);
    set.add_function('min', [TNum, TNum], TNum, math.min);
    set.add_function('clamp', [TNum, TNum, TNum], TNum, function(x, min, max) {
        return math.max(math.min(x, max), min);
    });
    set.add_function('max', [TRange], TNum, function(range) {
        return range[1];
    });
    set.add_function('min', [TRange], TNum, function(range) {
        return range[0];
    });
    set.add_function('max', [sig.listof(sig.type('number'))], TNum, math.listmax, {unwrapValues: true});
    set.add_function('max', [TInt, TInt], TInt, math.max);
    set.add_function('min', [TInt, TInt], TInt, math.min);
    set.add_function('max', [sig.listof(sig.type('integer'))], TInt, math.listmax, {unwrapValues: true});
    set.add_function('min', [sig.listof(sig.type('integer'))], TInt, math.listmin, {unwrapValues: true});
    set.add_function('max', [TRational, TRational], TRational, Fraction.max);
    set.add_function('min', [TRational, TRational], TRational, Fraction.min);
    set.add_function('max', [sig.listof(sig.type('rational'))], TRational, function(l) {
        return Fraction.max.apply(Fraction, l);
    }, {unwrapValues: true});
    set.add_function('min', [sig.listof(sig.type('rational'))], TRational, function(l) {
        return Fraction.min.apply(Fraction, l);
    }, {unwrapValues: true});
    set.add_function('trunc', [TRational], TInt, function(a) {
        return a.trunc();
    });
    set.add_function('floor', [TRational], TInt, function(a) {
        return a.floor();
    });
    set.add_function('ceil', [TRational], TInt, function(a) {
        return a.ceil();
    });
    set.add_function('fract', [TRational], TRational, function(a) {
        return a.fract();
    });

    set.add_function('ceil', [TDecimal], TDecimal, function(a) {
        return a.re.ceil();
    });
    set.add_function('floor', [TDecimal], TDecimal, function(a) {
        return a.re.floor();
    });
    set.add_function('round', [TDecimal], TDecimal, function(a) {
        return a.round();
    });
    set.add_function('min', [TDecimal, TDecimal], TDecimal, math.ComplexDecimal.min);
    set.add_function('max', [TDecimal, TDecimal], TDecimal, math.ComplexDecimal.max);
    set.add_function('max', [sig.listof(sig.type('decimal'))], TDecimal, function(l) {
        return math.listmax(l, math.ComplexDecimal.max);
    }, {unwrapValues: true});
    set.add_function('min', [sig.listof(sig.type('decimal'))], TDecimal, function(l) {
        return math.listmin(l, math.ComplexDecimal.min);
    }, {unwrapValues: true});
    set.add_function('tonearest', [TDecimal, TDecimal], TDecimal, function(a, x) {
        return a.toNearest(x.re);
    });
    set.add_function('trunc', [TDecimal], TDecimal, function(a) {
        return a.re.trunc();
    });
    set.add_function('fract', [TDecimal], TDecimal, function(a) {
        return a.re.minus(a.re.trunc());
    });
    set.add_function('min', [sig.listof(sig.type('number'))], TNum, math.listmin, {unwrapValues: true});

    /**
     * Define a function with input signature `type, number` which returns a number-like type with the `precisionType` attribute specified.
     *
     * @param {string} name - The name of the functoin.
     * @param {Function} fn - The function.
     * @param {Function} type - The constructor for the type of the first argument, which must be the same as the output.
     * @param {string} precisionType - The precision type of the returned number.
     */
    function function_with_precision_info(name, fn, type, precisionType) {
    set.add_function(name, [type, TNum], type, function(a, precision) {
            var r = fn(a, precision);
            var t = new type(r);
            t.precisionType = precisionType;
            t.precision = precision;
            return t;
        }, {unwrapValues: true});
    }

    function_with_precision_info('precround', math.precround, TNum, 'dp');
    function_with_precision_info('precround', matrixmath.precround, TMatrix, 'dp');
    function_with_precision_info('precround', vectormath.precround, TVector, 'dp');
    function_with_precision_info('siground', math.siground, TNum, 'sigfig');
    function_with_precision_info('siground', matrixmath.siground, TMatrix, 'sigfig');
    function_with_precision_info('siground', vectormath.siground, TVector, 'sigfig');
    function_with_precision_info('precround', function(a, dp) {
        return a.toDecimalPlaces(dp);
    }, TDecimal, 'dp');
    function_with_precision_info('siground', function(a, dp) {
        return a.toSignificantDigits(dp);
    }, TDecimal, 'sigfig');

    });

    /*-- Number theory */
    builtin_function_set({name:'number_theory', description: 'Number-theoretic functions'}, (set) => {
    set.add_function('rational_approximation', [TNum], TList, function(n) {
        return math.rationalApproximation(n).map(function(x) {
            return new TInt(x);
        });
    });
    set.add_function('rational_approximation', [TNum, TNum], TList, function(n, accuracy) {
        return math.rationalApproximation(n, accuracy).map(function(x) {
            return new TInt(x);
        });
    });
    set.add_function('factorise', [TNum], TList, function(n) {
        return math.factorise(n).map(function(n) {
            return new TNum(n)
        });
    }
    );
    set.add_function('largest_square_factor', [TNum], TInt, math.largest_square_factor);
    set.add_function('divisors', [TNum], TList, function(n) {
        return math.divisors(n).map(function(n) {
            return new TNum(n)
        });
    }
    );
    set.add_function('proper_divisors', [TNum], TList, function(n) {
        return math.proper_divisors(n).map(function(n) {
            return new TNum(n)
        });
        }
    );

    set.add_function('fact', [TNum], TNum, math.factorial);
    set.add_function('mod', [TNum, TNum], TNum, math.mod);
    set.add_function('perm', [TNum, TNum], TNum, math.permutations);
    set.add_function('comb', [TNum, TNum], TNum, math.combinations);
    set.add_function('root', [TNum, TNum], TNum, math.root);
    set.add_function('gcd', [TNum, TNum], TNum, math.gcd);
    set.add_function('gcd', [TInt, TInt], TInt, function(a,b) { return new TInt(math.gcd(a,b)); },{unwrapValues: true});
    set.add_function('gcd_without_pi_or_i', [TNum, TNum], TNum, function(a, b) {    // take out factors of pi or i before working out gcd. Used by the fraction simplification rules
            if(a.complex && a.re == 0) {
                a = a.im;
            }
            if(b.complex && b.re == 0) {
                b = b.im;
            }
            a = a / math.pow(Math.PI, math.piDegree(a));
            b = b / math.pow(Math.PI, math.piDegree(b));
            return math.gcf(a, b);
    });
    set.add_function('coprime', [TNum, TNum], TBool, math.coprime);
    set.add_function('lcm', [sig.multiple(sig.type('number'))], TNum, math.lcm);
    set.add_function('lcm', [sig.multiple(sig.type('integer'))], TInt, function() {
        return new TInt(math.lcm.apply(math, arguments));
    },{unwrapValues: true});
    set.add_function('lcm', [sig.listof(sig.type('integer'))], TInt, function(l) {
            if(l.length == 0) {
                return new TInt(1);
            } else if(l.length == 1) {
                return new TInt(l[0]);
            } else {
                return new TInt(math.lcm.apply(math, l));
            }
        },
        {unwrapValues: true}
    );
    set.add_function('lcm', [sig.listof(sig.type('number'))], TNum, function(l) {
            if(l.length == 0) {
                return 1;
            } else if(l.length == 1) {
                return l[0];
            } else {
                return math.lcm.apply(math, l);
            }
        },
        {unwrapValues: true}
    );
    set.add_function('|', [TNum, TNum], TBool, math.divides);
    set.add_function('mod', [TInt, TInt], TInt, math.mod);
    set.add_function('mod', [TDecimal, TDecimal], TDecimal, function(a, b) {
        var m = a.re.mod(b.re);
        if(m.isNegative()) {
            m = m.plus(b.re);
        }
        return m;
    });

    });

    /*-- Comparison */
    builtin_function_set({name: 'comparison', description: 'Comparisons'}, (set) => {
    set.add_function('<', [TNum, TNum], TBool, math.lt);
    set.add_function('>', [TNum, TNum], TBool, math.gt);
    set.add_function('<=', [TNum, TNum], TBool, math.leq);
    set.add_function('>=', [TNum, TNum], TBool, math.geq);
    set.add_function('<>', ['?', '?'], TBool, null, {
        evaluate: function(args, scope) {
            return new TBool(util.neq(args[0], args[1], scope));
        }
    });
    set.add_function('=', ['?', '?'], TBool, null, {
        evaluate: function(args, scope) {
            return new TBool(util.eq(args[0], args[1], scope));
        }
    });
    set.add_function('isclose', [TNum, TNum, sig.optional(sig.type('number')), sig.optional(sig.type('number'))], TBool, math.isclose);
    set.add_function('>', [TDecimal, TDecimal], TBool, function(a, b) {
        return a.greaterThan(b);
    });
    set.add_function('>=', [TDecimal, TDecimal], TBool, function(a, b) {
        return a.greaterThanOrEqualTo(b);
    });
    set.add_function('>=', [TDecimal, TNum], TBool, function(a, b) {
        return math.geq(a.re.toNumber(), b);
    });
    set.add_function('<', [TDecimal, TDecimal], TBool, function(a, b) {
        return a.lessThan(b);
    });
    set.add_function('<=', [TDecimal, TDecimal], TBool, function(a, b) {
        return a.lessThanOrEqualTo(b);
    });
    set.add_function('<=', [TDecimal, TNum], TBool, function(a, b) {
        return math.leq(a.re.toNumber(), b);
    });

    });

    /*-- Linear algebra */
    builtin_function_set({name: 'linear_algebra', description: 'Linear algebra'}, (set) => {
    set.add_function('+u', [TVector], TVector, function(a) {
        return a;
    });
    set.add_function('+u', [TMatrix], TMatrix, function(a) {
        return a;
    });

    set.add_function('-u', [TVector], TVector, vectormath.negate);
    set.add_function('-u', [TMatrix], TMatrix, matrixmath.negate);
    set.add_function('+', [TVector, TVector], TVector, vectormath.add);
    set.add_function('+', [TMatrix, TMatrix], TMatrix, matrixmath.add);
    set.add_function('-', [TVector, TVector], TVector, vectormath.sub);
    set.add_function('-', [TMatrix, TMatrix], TMatrix, matrixmath.sub);
    set.add_function('*', [TNum, TVector], TVector, vectormath.mul);
    set.add_function('*', [TVector, TNum], TVector, function(a, b) {
        return vectormath.mul(b, a)
    });
    set.add_function('*', [TMatrix, TVector], TVector, vectormath.matrixmul);
    set.add_function('*', [TNum, TMatrix], TMatrix, matrixmath.scalarmul);
    set.add_function('*', [TMatrix, TNum], TMatrix, function(a, b) {
        return matrixmath.scalarmul(b, a);
    });
    set.add_function('*', [TMatrix, TMatrix], TMatrix, matrixmath.mul);
    set.add_function('*', [TVector, TMatrix], TVector, vectormath.vectormatrixmul);
    set.add_function('/', [TMatrix, TNum], TMatrix, function(a, b) {
        return matrixmath.scalardiv(a, b);
    });
    set.add_function('/', [TVector, TNum], TVector, function(a, b) {
        return vectormath.div(a, b)
    });
    set.add_function('dot', [TVector, TVector], TNum, vectormath.dot);
    set.add_function('dot', [TMatrix, TVector], TNum, vectormath.dot);
    set.add_function('dot', [TVector, TMatrix], TNum, vectormath.dot);
    set.add_function('dot', [TMatrix, TMatrix], TNum, vectormath.dot);
    set.add_function('cross', [TVector, TVector], TVector, vectormath.cross);
    set.add_function('cross', [TMatrix, TVector], TVector, vectormath.cross);
    set.add_function('cross', [TVector, TMatrix], TVector, vectormath.cross);
    set.add_function('cross', [TMatrix, TMatrix], TVector, vectormath.cross);
    set.add_function('det', [TMatrix], TNum, matrixmath.abs);
    set.add_function('numrows', [TMatrix], TNum, function(m) {
        return m.rows
    });
    set.add_function('numcolumns', [TMatrix], TNum, function(m) {
        return m.columns
    });
    set.add_function('angle', [TVector, TVector], TNum, vectormath.angle);
    set.add_function('transpose', [TVector], TMatrix, vectormath.transpose);
    set.add_function('transpose', [TMatrix], TMatrix, matrixmath.transpose);
    set.add_function('transpose', ['list of list'], TList, null, {
        evaluate: function(args, scope) {
            var lists = args[0].value;
            var l = Math.min(...lists.map((l) => l.value.length));
            var o = [];
            for(let i = 0;i < l;i++) {
                o.push(new TList(lists.map((l) => l.value[i])));
            }
            return new TList(o);
        }
    });
    set.add_function('is_zero', [TVector], TBool, vectormath.is_zero);
    set.add_function('id', [TNum], TMatrix, matrixmath.id);
    set.add_function('sum_cells', [TMatrix], TNum, matrixmath.sum_cells);
    set.add_function('numrows', [TMatrix], TNum, function(m) {
        return matrixmath.numrows(m)
    });
    set.add_function('numcolumns', [TMatrix], TNum, function(m) {
        return matrixmath.numcolumns(m)
    });
    set.add_function('combine_vertically', [TMatrix, TMatrix], TMatrix, function(m1, m2) {
        return matrixmath.combine_vertically(m1, m2)
    });
    set.add_function('stack', [TMatrix, TMatrix], TMatrix, function(m1, m2) {
        return matrixmath.combine_vertically(m1, m2)
    });
    set.add_function('combine_horizontally', [TMatrix, TMatrix], TMatrix, function(m1, m2) {
        return matrixmath.combine_horizontally(m1, m2)
    });
    set.add_function('augment', [TMatrix, TMatrix], TMatrix, function(m1, m2) {
        return matrixmath.combine_horizontally(m1, m2)
    });
    set.add_function('combine_diagonally', [TMatrix, TMatrix], TMatrix, function(m1, m2) {
        return matrixmath.combine_diagonally(m1, m2)
    });
    set.add_function('lu_decomposition', [TMatrix], TList, null, {
        evaluate: function(args, scope) {
            var m = args[0].value;
            const [L, U] = matrixmath.lu_decomposition(m);
            return new TList([new TMatrix(L), new TMatrix(U)]);
        }
    });

    set.add_function('gauss_jordan_elimination', [TMatrix], TMatrix, matrixmath.gauss_jordan_elimination);

    set.add_function('inverse', [TMatrix], TMatrix, matrixmath.inverse);
    set.add_function('is_scalar_multiple', [TVector, TVector, sig.optional(sig.type('number')), sig.optional(sig.type('number'))], TBool, math.is_scalar_multiple);
    set.add_function('abs', [TVector], TNum, vectormath.abs);
    set.add_function('listval', [TVector, TNum], TNum, null, {
        evaluate: function(args, scope) {
            var vector = args[0].value;
            var index = util.wrapListIndex(args[1].value, vector.length);
            return new TNum(vector[index] || 0);
        }
    });
    set.add_function('listval', [TVector, TRange], TVector, null, {
        evaluate: function(args, scope) {
            var range = args[1].value;
            var vector = args[0].value;
            var start = util.wrapListIndex(range[0], vector.length);
            var end = util.wrapListIndex(range[1], vector.length);
            var v = [];
            for(let i = start;i < end;i++) {
                v.push(vector[i] || 0);
            }
            return new TVector(v);
        }
    });
    set.add_function('listval', [TMatrix, TNum], TVector, null, {
        evaluate: function(args, scope) {
            var matrix = args[0].value;
            var index = util.wrapListIndex(args[1].value, matrix.length);
            return new TVector(matrix[index] || []);
        }
    });
    set.add_function('listval', [TMatrix, TRange], TMatrix, null, {
        evaluate: function(args, scope) {
            var range = args[1].value;
            var matrix = args[0].value;
            var start = util.wrapListIndex(range[0], matrix.length);
            var end = util.wrapListIndex(range[1], matrix.length);
            var sliced_matrix = matrix.slice(start, end);
            sliced_matrix.columns = matrix.columns;
            sliced_matrix.rows = end - start;
            return new TMatrix(sliced_matrix);
        }
    });
    set.add_function('vector', [sig.multiple(sig.type('number'))], TVector, null, {
        evaluate: function(args, scope) {
            var value = [];
            for(let i = 0;i < args.length;i++) {
                value.push(args[i].value);
            }
            var t = new TVector(value);
            if(args.length > 0) {
                t.precisionType = args[0].precisionType;
                t.precision = args[0].precision;
            }
            return t;
        }
    });
    set.add_function('vector', [sig.listof(sig.type('number'))], TVector, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var value = list.value.map(function(x) {
                return x.value
            });
            var t = new TVector(value);
            if(list.value.length > 0) {
                var tn = list.value[0];
                t.precisionType = tn.precisionType;
                t.precision = tn.precision;
            }
            return t;
        }
    });
    set.add_function('matrix', [sig.listof(sig.type('vector'))], TMatrix, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var rows = list.vars;
            var columns = 0;
            var value = [];
            if(!list.value.length) {
                rows = 0;
                columns = 0;
            } else {
                value = list.value.map(function(v) {
                    return v.value
                });
                columns = list.value[0].value.length;
            }
            value.rows = rows;
            value.columns = columns;
            var t = new TMatrix(value);
            if(list.value.length > 0) {
                t.precisionType = list.value[0].precisionType;
                t.precision = list.value[0].precision;
            }
            return t;
        }
    });
    set.add_function('matrix', [sig.listof(sig.listof(sig.type('number')))], TMatrix, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var rows = list.vars;
            var columns = 0;
            var value = [];
            if(!list.value.length) {
                rows = 0;
                columns = 0;
            } else {
                for(let i = 0;i < rows;i++) {
                    var row = list.value[i].value;
                    value.push(row.map(function(x) {
                        return x.value
                    }));
                    columns = Math.max(columns, row.length);
                }
            }
            value.rows = rows;
            value.columns = columns;
            var t = new TMatrix(value);
            if(rows > 0 && columns > 0) {
                var tn = list.value[0].value[0];
                t.precisionType = tn.precisionType;
                t.precision = tn.precision;
            }
            return t;
        }
    });
    set.add_function('matrix', [sig.listof(sig.type('number'))], TMatrix, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var rows = list.vars;
            var columns = 0;
            var value = [];
            if(!list.value.length) {
                rows = 0;
                columns = 0;
            } else {
                value = [list.value.map(function(e) {
                    return jme.castToType(e, 'number').value
                })];
                rows = 1;
                columns = list.vars;
            }
            value.rows = rows;
            value.columns = columns;
            var t = new TMatrix(value);
            if(rows > 0 && columns > 0) {
                var tn = list.value[0];
                t.precisionType = tn.precisionType;
                t.precision = tn.precision;
            }
            return t;
        }
    });
    set.add_function('matrix', [sig.multiple(sig.listof(sig.type('number')))], TMatrix, null, {
        evaluate: function(args, scope) {
            var rows = args.length;
            var columns = 0;
            var value = [];
            for(let i = 0;i < args.length;i++) {
                var row = args[i].value;
                value.push(row.map(function(x) {
                    return x.value
                }));
                columns = Math.max(columns, row.length);
            }
            value.rows = rows;
            value.columns = columns;
            var t = new TMatrix(value);
            if(rows > 0 && columns > 0) {
                var tn = args[0].value[0];
                t.precisionType = tn.precisionType;
                t.precision = tn.precision;
            }
            return t;
        }
    });
    set.add_function('rowvector', [sig.multiple(sig.type('number'))], TMatrix, null, {
        evaluate: function(args, scope) {
            var row = [];
            for(let i = 0;i < args.length;i++) {
                row.push(args[i].value);
            }
            var matrix = [row];
            matrix.rows = 1;
            matrix.columns = row.length;
            var t = new TMatrix(matrix);
            if(matrix.columns > 0) {
                var tn = args[0];
                t.precisionType = tn.precisionType;
                t.precision = tn.precision;
            }
            return t;
        }
    });
    set.add_function('rowvector', [sig.listof(sig.type('number'))], TMatrix, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var row = list.value.map(function(x) {
                return x.value
            });
            var matrix = [row];
            matrix.rows = 1;
            matrix.columns = row.length;
            var t = new TMatrix(matrix);
            if(matrix.columns > 0) {
                var tn = args[0].value[0];
                t.precisionType = tn.precisionType;
                t.precision = tn.precision;
            }
            return t;
        }
    });

    });

    /*-- Booleans */
    builtin_function_set({name: 'booleans', description: 'Booleans'}, (set) => {
    set.add_function('and', [TBool, TBool], TBool, null, {
        evaluate: function(args, scope) {
            let a = scope.evaluate(args[0]);

            if(jme.isType(a, 'set')) {
                const b = scope.evaluate(args[1]);
                return new TSet(setmath.intersection(jme.castToType(a, 'set').value, jme.castToType(b, 'set').value, scope));
            }

            a = jme.castToType(a,'boolean')

            if(!a.value) {
                return new TBool(false);
            }
            const b = jme.castToType(scope.evaluate(args[1]), 'boolean');
            return b;
        }
    });
    set.add_function('not', [TBool], TBool, function(a) {
        return !a;
    });
    set.add_function('or', [TBool, TBool], TBool, null, {
        evaluate: function(args, scope) {
            let a = scope.evaluate(args[0]);
            if(a.type == 'set') {
                const b = scope.evaluate(args[1]);
                return new TSet(setmath.union(jme.castToType(a, 'set').value, jme.castToType(b, 'set').value, scope));
            }

            a = jme.castToType(a,'boolean')

            if(a.value) {
                return new TBool(true);
            }
            const b = jme.castToType(scope.evaluate(args[1]), 'boolean');
            return b;
        }
    });

    set.add_function('xor', [TBool, TBool], TBool, function(a, b) {
        return (a || b) && !(a && b);
    });

    set.add_function('implies', [TBool, TBool], TBool, null, {
        evaluate: function(args, scope) {
            const a = scope.evaluate(args[0]);

            if(!a.value) {
                return new TBool(true);
            }
            const b = scope.evaluate(args[1]);
            return b;
        }
    });

    set.add_function('nand', [TBool, TBool], TBool, null, {
        evaluate: function(args, scope) {
            const a = scope.evaluate(args[0]);

            if(!a.value) {
                return new TBool(true);
            }
            const b = scope.evaluate(args[1]);
            return new TBool(!b.value);
        }
    });

    set.add_function('nor', [TBool, TBool], TBool, null, {
        evaluate: function(args, scope) {
            const a = scope.evaluate(args[0]);

            if(a.value) {
                return new TBool(false);
            }
            const b = scope.evaluate(args[1]);
            return new TBool(!b.value);
        }
    });

    jme.lazyOps.push('and');
    jme.lazyOps.push('or');
    jme.lazyOps.push('implies');
    jme.lazyOps.push('nand');
    jme.lazyOps.push('nor');


});

/*-- Sets */
builtin_function_set({name: 'set_theory', description: 'Set theory'}, (set) => {
    set.add_function('set', [TList], TSet, null, {
        evaluate: function(args, scope) {
            return new TSet(util.distinct(args[0].value, scope));
        }
    });
    set.add_function('set', [TRange], TSet, null, {
        evaluate: function(args, scope) {
            var l = jme.castToType(args[0], 'list');
            return new TSet(util.distinct(l.value, scope));
        }
    });
    set.add_function('set', ['*?'], TSet, null, {
        evaluate: function(args, scope) {
            return new TSet(util.distinct(args, scope));
        }
    });
    set.add_function('union', [TSet, TSet], TSet, null, {
        evaluate: function(args, scope) {
            return new TSet(setmath.union(args[0].value, args[1].value, scope));
        }
    });
    set.add_function('intersection', [TSet, TSet], TSet, null, {
        evaluate: function(args, scope) {
            return new TSet(setmath.intersection(args[0].value, args[1].value, scope));
        }
    });
    set.add_function('or', [TSet, TSet], TSet, null, {
        evaluate: function(args, scope) {
            return new TSet(setmath.union(args[0].value, args[1].value, scope));
        }
    });
    set.add_function('and', [TSet, TSet], TSet, null, {
        evaluate: function(args, scope) {
            return new TSet(setmath.intersection(args[0].value, args[1].value, scope));
        }
    });
    set.add_function('-', [TSet, TSet], TSet, null, {
        evaluate: function(args, scope) {
            return new TSet(setmath.minus(args[0].value, args[1].value, scope));
        }
    });
    set.add_function('abs', [TSet], TNum, setmath.size);
    set.add_function('in', ['?', TSet], TBool, null, {
        evaluate: function(args, scope) {
            return new TBool(util.contains(args[1].value, args[0], scope));
        }
    });

});

/*-- Real intervals */
builtin_function_set({name: 'intervals', description: 'Real intervals'}, (set) => {
    set.add_function('interval', ['number', 'number', '[boolean]', '[boolean]'], TInterval, function(start, end, includes_start, includes_end) {
        return new math.RealIntervalUnion([new math.RealInterval(start,end,includes_start,includes_end)]);
    });

    set.add_function('union', ['*interval'], TInterval, null, {
        evaluate: function(args, scope) {
            let out = args[0].value;
            for(let i=1;i<args.length;i++) {
                out = out.union(args[i].value);
            }
            return new TInterval(out);
        }
    });
    set.add_function('union', ['list of interval'], TInterval, null, {
        evaluate: function(args, scope) {
            const intervals = args[0].value;
            let out = intervals[0].value;
            for(let i=1;i<intervals.length;i++) {
                out = out.union(intervals[i].value);
            }
            return new TInterval(out);
        }
    });

    set.add_function('+', [TInterval, TInterval], TInterval, (a,b) => a.union(b));
    set.add_function('or', [TInterval, TInterval], TInterval, (a,b) => a.union(b));

    set.add_function('intersection', ['*interval'], TInterval, null, {
        evaluate: function(args, scope) {
            let out = args[0].value;
            for(let i=1;i<args.length;i++) {
                out = out.intersection(args[i].value);
            }
            return new TInterval(out);
        }
    });
    set.add_function('intersection', ['list of interval'], TInterval, null, {
        evaluate: function(args, scope) {
            const intervals = args[0].value;
            let out = intervals[0].value;
            for(let i=1;i<intervals.length;i++) {
                out = out.intersection(intervals[i].value);
            }
            return new TInterval(out);
        }
    });

    set.add_function('*', [TInterval, TInterval], TInterval, (a,b) => a.intersection(b));
    set.add_function('and', [TInterval, TInterval], TInterval, (a,b) => a.intersection(b));

    set.add_function('complement', [TInterval], TInterval, a => a.complement());
    set.add_function('not', [TInterval], TInterval, a => a.complement());

    set.add_function('difference', [TInterval, TInterval], TInterval, (a,b) => a.difference(b));
    set.add_function('-', [TInterval, TInterval], TInterval, (a,b) => a.difference(b));
    set.add_function('except', [TInterval, TInterval], TInterval, (a,b) => a.difference(b));
});

/*-- Ranges */

/** Work out which number type best represents a range: if all values are integers, return `TInt`, otherwise `TNum`.
 *
 * @param {Numbas.math.range} range
 * @returns {Function} - a token constructor
 */
function best_number_type_for_range(range) {
    if(util.isInt(range[0]) && util.isInt(range[2]) && range[2] != 0) {
        return TInt;
    } else {
        return TNum;
    }
}

builtin_function_set({name: 'number_ranges', description: 'Ranges of numbers'}, (set) => {
    set.add_function('..', [TNum, TNum], TRange, math.defineRange);
    set.add_function('#', [TRange, TNum], TRange, math.rangeSteps);
    set.add_function('in', [TNum, TRange], TBool, function(x, r) {
        var start = r[0];
        var end = r[1];
        var step_size = r[2];
        if(x > end || x < start) {
            return false;
        }
        if(step_size === 0) {
            return true;
        } else {
            var max_steps = Math.floor(end - start) / step_size;
            var steps = Math.floor((x - start) / step_size);
            return step_size * steps + start == x && steps <= max_steps;
        }
    });

    //the next three versions of the `except` operator
    //exclude numbers from a range, given either as a range, a list or a single value
    set.add_function('except', [TRange, TRange], TList,
        function(range, except) {
            if(range[2] == 0) {
                throw(new Numbas.Error("jme.func.except.continuous range"));
            }
            var cons = best_number_type_for_range(range);
            range = math.rangeToList(range);
            if(except[2] == 0) {
                return range.filter(function(i) {
                    return i < except[0] || i > except[1]
                }).map(function(i) {
                    return new cons(i)
                });
            } else {
                except = math.rangeToList(except);
                return math.except(range, except).map(function(i) {
                    return new cons(i)
                });
            }
        }
    );
    set.add_function('except', [TRange, 'list of number'], TList,
        function(range, except) {
            if(range[2] == 0) {
                throw(new Numbas.Error("jme.func.except.continuous range"));
            }
            var cons = best_number_type_for_range(range);
            range = math.rangeToList(range)
            except = except.map(function(i) {
                return i.value;
            });
            return math.except(range, except).map(function(i) {
                return new cons(i)
            });
        }
    );
    set.add_function('except', [TRange, TNum], TList,
        function(range, except) {
            if(range[2] == 0) {
                throw(new Numbas.Error("jme.func.except.continuous range"));
            }
            var cons = best_number_type_for_range(range);
            range = math.rangeToList(range);
            return math.except(range, [except]).map(function(i) {
                return new cons(i)
            });
        }
    );
    //exclude numbers from a list, so use the math.except function
    set.add_function('except', [TList, TRange], TList,
        function(range, except) {
            except = math.rangeToList(except);
            return range.filter(function(r) {
                return !except.some(function(e) {
                    return math.eq(r.value, e)
                });
            });
        }
    );
    set.add_function('abs', [TRange], TNum, function(r) {
        return r[2] == 0 ? Math.abs(r[0] - r[1]) : math.rangeSize(r);
    });

});

/*-- Lists */
builtin_function_set({name: 'lists', description: 'Lists'}, (set) => {
    set.add_function('+', [TList, TList], TList, null, {
        evaluate: function(args, scope) {
            var value = args[0].value.concat(args[1].value);
            return new TList(value);
        }
    });
    set.add_function('+', [TList, '?'], TList, null, {
        evaluate: function(args, scope) {
            var value = args[0].value.slice();
            value.push(args[1]);
            return new TList(value);
        }
    });
    set.add_function('list', [TRange], TList, function(range) {
        return math.rangeToList(range).map(function(n) {
            return new TNum(n)
        });
    });
    //exclude values of any type from a list containing values of any type, so use the util.except function
    set.add_function('except', [TList, TList], TList, null, {
        evaluate: function(args, scope) {
            return new TList(util.except(args[0].value, args[1].value, scope));
        }
    });
    set.add_function('except', [TList, '?'], TList, null, {
        evaluate: function(args, scope) {
            return new TList(util.except(args[0].value, [args[1]], scope));
        }
    });
    set.add_function('distinct', [TList], TList, null, {
        evaluate: function(args, scope) {
            return new TList(util.distinct(args[0].value, scope));
        }
    }, {unwrapValues: false});
    set.add_function('in', ['?', TList], TBool, null, {
        evaluate: function(args, scope) {
            return new TBool(util.contains(args[1].value, args[0], scope));
        }
    });
    set.add_function('abs', [TList], TNum, function(l) {
        return l.length;
    });
    set.add_function('sum', [sig.listof(sig.type('number'))], TNum, math.sum, {unwrapValues: true});
    set.add_function('sum', [sig.listof(sig.type('integer'))], TInt, function(list) {
        return new TInt(math.sum(list));
    }, {unwrapValues: true});
    set.add_function('sum', [sig.listof(sig.type('decimal'))], TDecimal, function(list) {
        let total = math.ensure_decimal(0);
        for(let x of list) {
            total = total.plus(x);
        }
        return total;
    }, {unwrapValues: true});
    set.add_function('sum', [sig.listof(sig.type('rational'))], TRational, function(list) {
        let total = new Fraction(0,1);
        for(let x of list) {
            total = total.add(x);
        }
        return total;
    }, {unwrapValues: true});
    set.add_function('sum', [TVector], TNum, math.sum);

    set.add_function('prod', [sig.listof(sig.type('number'))], TNum, math.prod, {unwrapValues: true});
    set.add_function('prod', [sig.listof(sig.type('integer'))], TInt, function(list) {
        return new TInt(math.prod(list));
    }, {unwrapValues: true});
    set.add_function('prod', [sig.listof(sig.type('decimal'))], TDecimal, function(list) {
        let total = math.ensure_decimal(1);
        for(let x of list) {
            total = total.times(x);
        }
        return total;
    }, {unwrapValues: true});
    set.add_function('prod', [sig.listof(sig.type('rational'))], TRational, function(list) {
        let total = new Fraction(1,1);
        for(let x of list) {
            total = total.multiply(x);
        }
        return total;
    }, {unwrapValues: true});
    set.add_function('prod', [TVector], TNum, math.prod);
    set.add_function('reorder', [TList, sig.listof(sig.type('number'))], TList, function(list, order) {
        order = order.map(function(n) {
            return n.value;
        });
        return math.reorder(list, order);
    });
    // repeat(expr,n) evaluates expr n times and returns a list of the results
    set.add_function('repeat', ['?', TNum], TList, null, {
        evaluate: function(args, scope) {
            var size = jme.evaluate(args[1], scope).value;
            var value = [];
            for(let i = 0;i < size;i++) {
                value[i] = jme.evaluate(args[0], scope);
            }
            return new TList(value);
        }
    });
    Numbas.jme.lazyOps.push('repeat');
    set.add_function('listval', [TList, TNum], '?', null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var index = util.wrapListIndex(args[1].value, list.vars);
            if(list.type != 'list') {
                if(list.type == 'name') {
                    throw(new Numbas.Error('jme.variables.variable not defined', {name:list.name}));
                } else {
                    throw(new Numbas.Error('jme.func.listval.not a list'));
                }
            }
            if(index in list.value) {
                return list.value[index];
            } else {
                throw(new Numbas.Error('jme.func.listval.invalid index', {index:index, size:list.value.length}));
            }
        }
    });
    set.add_function('listval', [TList, TRange], TList, null, {
        evaluate: function(args, scope) {
            var range = args[1].value;
            var list = args[0];
            var size = list.vars;
            var start = util.wrapListIndex(range[0], size);
            var end = util.wrapListIndex(range[1], size);
            var step = range[2];
            var value;
            if(step != 1) {
                value = [];
                for(let i = start;i < end;i += step) {
                    if(i % 1 == 0) {
                        value.push(list.value[i]);
                    }
                }
            } else {
                value = list.value.slice(start, end);
            }
            return new TList(value);
        }
    });
    set.add_function('flatten', ['list of list'], TList, null, {
        evaluate: function(args, scope) {
            var o = [];
            args[0].value.forEach(function(l) {
                o = o.concat(l.value);
            });
            return new TList(o);
        }
    });
    set.add_function('groups_of', [TList, TNum], TList, null, {
        evaluate: function(args, scope) {
            var list = args[0].value;
            var n = args[1].value;

            var out = [];
            for(let i = 0; i < list.length; i += n) {
                const row = list.slice(i, i + n);
                if(row.length) {
                    out.push(new TList(row));
                }
            }

            return new TList(out);
        }
    });

    set.add_function('enumerate', [TList], TList, function(list) {
        return list.map(function(v, i) {
            return new TList([new TInt(i), v]);
        });
    });
    set.add_function('sort', [TList], TList, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var newlist = new TList(list.vars);
            newlist.value = list.value.slice().sort(jme.compareTokens);
            return newlist;
        }
    });
    set.add_function('sort_by', [TNum, sig.listof(sig.type('list'))], TList, null, {
        evaluate: function(args, scope) {
            var index = args[0].value;
            var list = args[1];
            var newlist = new TList(list.vars);
            newlist.value = list.value.slice().sort(jme.sortTokensBy(function(x) {
                return x.value[index];
            }));
            return newlist;
        }
    });

    set.add_function('sort_by', [TString, sig.listof(sig.type('dict'))], TList, null, {
        evaluate: function(args, scope) {
            var index = args[0].value;
            var list = args[1];
            var newlist = new TList(list.vars);
            newlist.value = list.value.slice().sort(jme.sortTokensBy(function(x) {
                return x.value[index];
            }));
            return newlist;
        }
    });

    set.add_function('sort_destinations', [TList], TList, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var newlist = new TList(list.vars);
            var sorted = list.value.map(function(v, i) {
                return {tok:v, i:i}
            }).sort(function(a, b) {
                return jme.compareTokens(a.tok, b.tok);
            });
            var inverse = [];
            for(let i = 0;i < sorted.length;i++) {
                inverse[sorted[i].i] = i;
            }
            newlist.value = inverse.map(function(n) {
                return new TNum(n);
            });
            return newlist;
        }
    });

    set.add_function('group_by', [TNum, sig.listof(sig.type('list'))], TList, null, {
        evaluate: function(args, scope) {
            var index = args[0].value;
            var list = args[1];
            var sorted = list.value.slice().sort(jme.sortTokensBy(function(x) {
                return x.value[index];
            }));
            var out = [];
            for(let i = 0;i < sorted.length;) {
                var key = sorted[i].value[index];
                var values = [sorted[i]];
                for(i++;i < sorted.length;i++) {
                    if(jme.compareTokens(key, sorted[i].value[index]) == 0) {
                        values.push(sorted[i]);
                    } else {
                        break;
                    }
                }
                out.push(new TList([key, new TList(values)]));
            }
            return new TList(out);
        }
    });

    set.add_function('group_by', [TString, sig.listof(sig.type('dict'))], TList, null, {
        evaluate: function(args, scope) {
            var index = args[0].value;
            var list = args[1];
            var sorted = list.value.slice().sort(jme.sortTokensBy(function(x) {
                return x.value[index];
            }));
            var out = [];
            for(let i = 0;i < sorted.length;) {
                var key = sorted[i].value[index];
                var values = [sorted[i]];
                for(i++;i < sorted.length;i++) {
                    if(jme.compareTokens(key, sorted[i].value[index]) == 0) {
                        values.push(sorted[i]);
                    } else {
                        break;
                    }
                }
                out.push(new TList([key, new TList(values)]));
            }
            return new TList(out);
        }
    });

    set.add_function('reverse', [TList], TList, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            return new TList(list.value.slice().reverse());
        }
    });
    // indices of given value in given list
    set.add_function('indices', [TList, '?'], TList, null, {
        evaluate: function(args, scope) {
            var list = args[0];
            var target = args[1];
            var out = [];
            list.value.map(function(v, i) {
                if(util.eq(v, target, scope)) {
                    out.push(new TNum(i));
                }
            });
            return new TList(out);
        }
    });
    set.add_function('product', [sig.multiple(sig.type('list'))], TList, function() {
        var lists = Array.prototype.slice.call(arguments);
        var prod = util.product(lists);
        return prod.map(function(l) {
            return new TList(l);
        });
    });

    set.add_function('product', [TList, TNum], TList, function(l, n) {
        return util.cartesian_power(l, n).map(function(sl) {
            return new TList(sl);
        });
    });

    set.add_function('zip', [sig.multiple(sig.type('list'))], TList, function() {
        var lists = Array.prototype.slice.call(arguments);
        var zipped = util.zip(lists);
        return zipped.map(function(l) {
            return new TList(l);
        });
    });
    set.add_function('combinations', [TList, TNum], TList, function(list, r) {
        var prod = util.combinations(list, r);
        return prod.map(function(l) {
            return new TList(l);
        });
    });
    set.add_function('combinations_with_replacement', [TList, TNum], TList, function(list, r) {
        var prod = util.combinations_with_replacement(list, r);
        return prod.map(function(l) {
            return new TList(l);
        });
    });
    set.add_function('permutations', [TList, TNum], TList, function(list, r) {
        var prod = util.permutations(list, r);
        return prod.map(function(l) {
            return new TList(l);
        });
    });
    set.add_function('frequencies', [TList], [TList], null, {
        evaluate: function(args, scope) {
            var o = [];
            var l = args[0].value;
            l.forEach(function(x) {
                var p = o.find(function(item) {
                    return util.eq(item[0], x);
                });
                if(p) {
                    p[1] += 1;
                } else {
                    o.push([x, 1]);
                }
            });
            return new TList(o.map(function(p) {
                return new TList([p[0], new TNum(p[1])]);
            }));
        }
    });



});

/*-- Dictionaries */
builtin_function_set({name: 'dictionaries', description: 'Dictionaries'}, (set) => {
    const fn_dict_update = {
        evaluate: function(args, scope) {
            var nvalue = {};

            if(args.length == 1 && args[0].type == 'list') {
                args = args[0].value;
            }

            args.forEach((arg) => {
                Object.keys(arg.value).forEach(function(x) {
                    nvalue[x] = arg.value[x];
                });
            });

            return new TDict(nvalue);
        }
    }
    set.add_function('+', [TDict, TDict], TDict, null, fn_dict_update);

    set.add_function('merge', ['*dict'], TDict, null, fn_dict_update);
    set.add_function('merge', ['list of dict'], TDict, null, fn_dict_update);
    set.add_function('dict', ['*keypair'], TDict, null, {
        evaluate: function(args, scope) {
            if(args.length == 0) {
                return new TDict({});
            }
            var value = {};
            if(args[0].tok.type == 'keypair') {
                args.forEach(function(kp) {
                    value[kp.tok.key] = jme.evaluate(kp.args[0], scope);
                });
            } else if(args.length == 1) {
                var list = scope.evaluate(args[0]);
                var items = list.value;
                if(list.type != 'list' || !items.every(function(item) {
                    return item.type == 'list' && item.value.length == 2 && item.value[0].type == 'string';
                })) {
                    throw(new Numbas.Error('jme.typecheck.no right type definition', {op:'dict'}));
                }
                items.forEach(function(item) {
                    value[item.value[0].value] = item.value[1];
                });
            } else {
                throw(new Numbas.Error('jme.typecheck.no right type definition', {op:'dict'}));
            }
            return new TDict(value);
        }
    });
    Numbas.jme.lazyOps.push('dict');
    set.add_function('keys', [TDict], TList, function(d) {
        var o = [];
        Object.keys(d).forEach(function(key) {
            o.push(new TString(key));
        })
        return o;
    });
    set.add_function('values', [TDict], TList, function(d) {
        var o = [];
        Object.values(d).forEach(function(v) {
            o.push(v);
        })
        return o;
    });
    set.add_function('values', [TDict, sig.listof(sig.type('string'))], TList, function(d, keys) {
        return keys.map(function(key) {
            if(!Object.hasOwn(d, key.value)) {
                throw(new Numbas.Error('jme.func.listval.key not in dict', {key:key}));
            } else {
                return d[key.value];
            }
        });
    })
    set.add_function('items', [TDict], TList, null, {
        evaluate: function(args, scope) {
            var o = [];
            Object.entries(args[0].value).forEach(function(x) {
                o.push(new TList([new TString(x[0]), x[1]]))
            });
            return new TList(o);
        }
    });
    set.add_function('listval', [TDict, TString], '?', null, {
        evaluate: function(args, scope) {
            var d = args[0].value;
            var key = args[1].value;
            if(!Object.hasOwn(d, key)) {
                throw(new Numbas.Error('jme.func.listval.key not in dict', {key:key}));
            }
            return d[key];
        }
    });
    set.add_function('get', [TDict, TString, '?'], '?', null, {
        evaluate: function(args, scope) {
            var d = args[0].value;
            var key = args[1].value;
            if(!Object.hasOwn(d, key)) {
                return args[2]
            }
            return d[key];
        }
    });
    set.add_function('in', [TString, TDict], TBool, function(s, d) {
        return Object.hasOwn(d, s);
    });
    set.add_function('abs', [TDict], TNum, function(d) {
        return Object.keys(d).length;
    });

});

/*-- Strings */
builtin_function_set({name: 'strings', description: 'Strings'}, (set) => {
    var fconc = function(a, b) {
        return a + b;
    }
    set.add_function('+', [TString, '?'], TString, fconc);
    set.add_function('+', ['?', TString], TString, fconc);
    set.add_function('formatstring', [TString, TList], TString, null, {
        evaluate: function(args, scope) {
            var str = args[0].value;
            var extra = args[1].value;
            return new TString(util.formatString.apply(util, [str].concat(extra.map(function(x) {
                return jme.tokenToDisplayString(x, scope);
            }))));
        }
    });
    set.add_function('unpercent', [TString], TNum, util.unPercent);
    set.add_function('letterordinal', [TNum], TString, util.letterOrdinal);
    set.add_function('latex', [TString], TString, null, {
        evaluate: function(args, scope) {
            var s = new TString(args[0].value);
            s.latex = true;
            s.display_latex = true;
            s.safe = args[0].safe;
            return s;
        }
    });
    set.add_function('safe', [TString], TString, null, {
        evaluate: function(args, scope) {
            var s = args[0];
            while(jme.isFunction(s.tok, 'safe')) {
                s = s.args[0];
            }
            var t;
            if(s.args) {
                var r = scope.evaluate(s);
                t = new TString(r.value);
                t.latex = r.latex;
                t.display_latex = r.display_latex;
            } else {
                t = new TString(s.tok.value);
            }
            t.safe = true;
            return t;
        }
    });
    Numbas.jme.lazyOps.push('safe');
    jme.findvarsOps.safe = function(tree, boundvars, scope) {
        return [];
    }

    set.add_function('render', [TString, sig.optional(sig.type('dict'))], TString, null, {
        evaluate: function(args, scope) {
            var str = args[0].value;
            var variables = args.length > 1 ? args[1].value : {};
            scope = new Scope([scope, {variables: variables}]);
            return new TString(jme.contentsubvars(str, scope, true));
        }
    });
    jme.findvarsOps.render = function(tree, boundvars, scope) {
        var vars = [];
        if(tree.args[0].tok.type != 'string') {
            vars = jme.findvars(tree.args[0], [], scope);
        }
        if(tree.args.length > 1) {
            vars = vars.merge(jme.findvars(tree.args[1], boundvars, scope));
        }
        return vars;
    }
    set.add_function('capitalise', [TString], TString, function(s) {
        return util.capitalise(s);
    });
    set.add_function('upper', [TString], TString, function(s) {
        return s.toUpperCase();
    });
    set.add_function('lower', [TString], TString, function(s) {
        return s.toLowerCase();
    });
    set.add_function('pluralise', [TNum, TString, TString], TString, function(n, singular, plural) {
        return util.pluralise(n, singular, plural);
    });
    set.add_function('join', [TList, TString], TString, null, {
        evaluate: function(args, scope) {
            var list = args[0].value;
            var delimiter = args[1].value;
            return new TString(list.map(function(x) {
                return jme.tokenToDisplayString(x, scope);
            }).join(delimiter));
        }
    });
    set.add_function('split', [TString, TString], TList, function(str, delimiter) {
        return str.split(delimiter).map(function(s) {
            return new TString(s)
        });
    });
    set.add_function('trim', [TString], TString, function(str) {
        return str.trim();
    });
    set.add_function('currency', [TNum, TString, TString], TString, util.currency, {latex: true});
    set.add_function('separateThousands', [TNum, TString], TString, util.separateThousands);
    set.add_function('listval', [TString, TNum], TString, function(s, i) {
        return s[i]
    });
    set.add_function('listval', [TString, TRange], TString, function(s, range) {
        return s.slice(range[0], range[1])
    });
    set.add_function('in', [TString, TString], TBool, function(sub, str) {
        return str.indexOf(sub) >= 0
    });
    set.add_function('lpad', [TString, TNum, TString], TString, util.lpad);
    set.add_function('rpad', [TString, TNum, TString], TString, util.rpad);
    set.add_function('match_regex', [TString, TString], TList, function(pattern, str) {
        var re = new RegExp(pattern, 'u');
        var m = re.exec(str);
        return m || [];
    }, {unwrapValues: true});
    set.add_function('match_regex', [TString, TString, TString], TList, function(pattern, str, flags) {
        var re = new RegExp(pattern, flags);
        var m = re.exec(str);
        return m || [];
    }, {unwrapValues: true});

    set.add_function('split_regex', [TString, TString], TList, function(str, delimiter) {
        return str.split(new RegExp(delimiter, 'u')).map(function(s) {
            return new TString(s)
        });
    });
    set.add_function('split_regex', [TString, TString, TString], TList, function(str, delimiter, flags) {
        return str.split(new RegExp(delimiter, flags)).map(function(s) {
            return new TString(s)
        });
    });

    set.add_function('replace_regex', [TString, TString, TString], TString, function(pattern, replacement, str) {
        return str.replace(new RegExp(pattern, 'u'), replacement);
    });

    set.add_function('replace_regex', [TString, TString, TString, TString], TString, function(pattern, replacement, str, flags) {
        return str.replace(new RegExp(pattern, flags), replacement);
    });

    set.add_function('abs', [TString], TNum, function(s) {
        return s.length
    });
    set.add_function('translate', [TString], TString, function(s) {
        return R(s);
    });
    set.add_function('translate', [TString, TDict], TString, function(s, params) {
        return R(s, params);
    }, {unwrapValues:true});

});

/*-- Type casting */
builtin_function_set({name: 'type_casting', description: 'Converting between data types'}, (set) => {
    set.add_function('int', [TNum], TInt, function(n) {
        return n;
    });
    set.add_function('rational', [TNum], TRational, function(n) {
        var r = math.rationalApproximation(n);
        return new Fraction(r[0], r[1]);
    });

    set.add_function('isa', ['?', TString], TBool, null, {
        evaluate: function(args, scope) {
            var tok = args[0].tok;
            var kind = jme.evaluate(args[1], scope).value;
            if(tok.type == 'name') {
                var c = scope.getConstant(tok.name);
                if(c) {
                    tok = c.value;
                }
            }
            if(tok.type == 'name' && scope.getVariable(tok.name) == undefined) {
                return new TBool(kind == 'name');
            }
            tok = scope.evaluate(args[0]);
            var match = false;
            if(kind == 'complex') {
                match = jme.isType(tok, 'number') && tok.value.complex || false;
            } else {
                match = jme.isType(tok, kind);
            }
            return new TBool(match);
        }
    });
    Numbas.jme.lazyOps.push('isa');
    set.add_function('list', [TSet], TList, function(set) {
        var l = [];
        for(let i = 0;i < set.length;i++) {
            l.push(set[i]);
        }
        return l;
    });
    //cast vector to list
    set.add_function('list', [TVector], TList, null, {
        evaluate: function(args, scope) {
            var vector = args[0];
            var value = vector.value.map(function(n) {
                return new TNum(n)
            });
            return new TList(value);
        }
    });
    //cast matrix to list of lists
    set.add_function('list', [TMatrix], TList, null, {
        evaluate: function(args, scope) {
            var matrix = args[0];
            var value = [];
            for(let i = 0;i < matrix.value.rows;i++) {
                var row = new TList(matrix.value[i].map(function(n) {
                    return new TNum(n)
                }));
                value.push(row);
            }
            return new TList(value);
        }
    });
    set.add_function('string', [TExpression, '[string or list of string]', '[string]'], TString, null, {
        evaluate: function(args, scope) {
            var flags = {};
            if(args[1]) {
                var rules = args[1].value;
                var ruleset = jme.collectRuleset(rules, scope.allRulesets());
                flags = ruleset.flags;
            }
            let notation_name = 'standard';
            if(args[2].type != 'nothing') {
                notation_name = args[2].value;
            }
            const notation = get_notation(notation_name);
            return new TString(notation.treeToJME(args[0].tree, flags, scope));
        }
    });
    set.add_function('latex', [TExpression, '[string or list of string]'], TString, null, {
        evaluate: function(args, scope) {
            var expr = args[0];
            var flags = {};
            if(args[1]) {
                var rules = args[1].value;
                var ruleset = jme.collectRuleset(rules, scope.allRulesets());
                flags = ruleset.flags;
            }
            var tex = jme.display.texify(expr.tree, flags, scope);
            var s = new TString(tex);
            s.latex = true;
            s.display_latex = true;
            return s;
        }
    });


});

/*-- Parsing numbers */
builtin_function_set({name: 'number_parsing', description: 'Parsing numbers'}, (set) => {
    set.add_function('dpformat', [TNum, TNum], TString, function(n, p) {
        return math.niceNumber(n, {precisionType: 'dp', precision:p});
    }, {latex: true});
    set.add_function('dpformat', [TNum, TNum, TString], TString, function(n, p, style) {
        return math.niceNumber(n, {precisionType: 'dp', precision:p, style: style});
    }, {latex: true});
    set.add_function('dpformat', [TDecimal, TNum], TString, function(a, dp) {
        return a.toFixed(dp);
    });
    set.add_function('sigformat', [TNum, TNum], TString, function(n, p) {
        return math.niceNumber(n, {precisionType: 'sigfig', precision:p});
    }, {latex: true});
    set.add_function('sigformat', [TNum, TNum, TString], TString, function(n, p, style) {
        return math.niceNumber(n, {precisionType: 'sigfig', precision:p, style:style});
    }, {latex: true});
    set.add_function('sigformat', [TDecimal, TNum], TString, function(a, sf) {
        return a.toPrecision(sf);
    });
    set.add_function('formatnumber', [TDecimal, TString], TString, function(n, style) {
        return math.niceComplexDecimal(n, {style:style});
    });
    set.add_function('formatnumber', [TNum, TString], TString, function(n, style) {
        return math.niceNumber(n, {style:style});
    });
    set.add_function('string', [TNum], TString, math.niceNumber);
    set.add_function('parsenumber', [TString, TString], TNum, function(s, style) {
        return util.parseNumber(s, false, style, true);
    });
    set.add_function('parsenumber', [TString, sig.listof(sig.type('string'))], TNum, function(s, styles) {
        return util.parseNumber(s, false, styles, true);
    }, {unwrapValues: true});
    set.add_function('parsenumber_or_fraction', [TString], TNum, function(s) {
        return util.parseNumber(s, true, "plain-en", true);
    });
    set.add_function('parsenumber_or_fraction', [TString, TString], TNum, function(s, style) {
        return util.parseNumber(s, true, style, true);
    });
    set.add_function('parsenumber_or_fraction', [TString, sig.listof(sig.type('string'))], TNum, function(s, styles) {
        return util.parseNumber(s, true, styles, true);
    }, {unwrapValues: true});

    set.add_function('with_precision', [TNum, 'nothing or number', 'nothing or string'], TNum, null, {
        evaluate: function(args, scope) {
            var n = args[0];
            var precision = args[1];
            var precisionType = args[2];

            if(jme.isType(precision, 'nothing')) {
                delete n.precision;
            } else {
                n.precision = precision.value;
            }

            if(jme.isType(precisionType, 'nothing')) {
                delete n.precisionType;
            } else {
                n.precisionType = precisionType.value;
            }

            return n;
        }
    });

    set.add_function('imprecise', [TNum], TNum, null, {
        evaluate: function(args, scope) {
            var n = args[0];

            delete n.precision;
            delete n.precisionType;

            return n;
        }
    });

    set.add_function('parsedecimal', [TString, TString], TDecimal, function(s, style) {
        return util.parseDecimal(s, false, style, true);
    });
    set.add_function('parsedecimal', [TString, sig.listof(sig.type('string'))], TDecimal, function(s, styles) {
        return util.parseDecimal(s, false, styles, true);
    }, {unwrapValues: true});
    set.add_function('parsedecimal_or_fraction', [TString], TDecimal, function(s, style) {
        return util.parseDecimal(s, true, "plain-en", true);
    });
    set.add_function('parsedecimal_or_fraction', [TString, TString], TDecimal, function(s, style) {
        return util.parseDecimal(s, true, style, true);
    });
    set.add_function('parsedecimal_or_fraction', [TString, sig.listof(sig.type('string'))], TDecimal, function(s, styles) {
        return util.parseDecimal(s, true, styles, true);
    }, {unwrapValues: true});

    set.add_function('tobinary', [TInt], TString, function(n) {
        return n.toString(2);
    }, {latex: true});
    set.add_function('tooctal', [TInt], TString, function(n) {
        return n.toString(8);
    }, {latex: true});
    set.add_function('tohexadecimal', [TInt], TString, function(n) {
        return n.toString(16);
    }, {latex: true});
    set.add_function('tobase', [TInt, TInt], TString, function(n, b) {
        return n.toString(b);
    }, {latex: true});
    set.add_function('frombinary', [TString], TInt, function(s) {
        return util.parseInt(s, 2);
    });
    set.add_function('fromoctal', [TString], TInt, function(s) {
        return util.parseInt(s, 8);
    });
    set.add_function('fromhexadecimal', [TString], TInt, function(s) {
        return util.parseInt(s, 16);
    });
    set.add_function('frombase', [TString, TInt], TInt, function(s, b) {
        return util.parseInt(s, b);
    });

    set.add_function('scientificnumberlatex', [TNum], TString, null, {
        evaluate: function(args, scope) {
            var n = args[0].value;
            if(n.complex) {
                n = n.re;
            }
            var bits = math.parseScientific(math.niceRealNumber(n, {style:'scientific', scientificStyle: 'plain'}));
            var s = new TString(math.niceRealNumber(bits.significand, {syntax:'latex'}) + ' \\times 10^{' + bits.exponent + '}');
            s.latex = true;
            s.safe = true;
            s.display_latex = true;
            return s;
        }
    });
    set.add_function('scientificnumberlatex', [TDecimal], TString, null, {
        evaluate: function(args, scope) {
            var n = args[0].value;
            var bits = math.parseScientific(n.re.toExponential());
            var s = new TString(math.niceRealNumber(bits.significand) + ' \\times 10^{' + bits.exponent + '}');
            s.latex = true;
            s.safe = true;
            s.display_latex = true;
            return s;
        }
    });
    set.add_function('scientificnumberhtml', [TDecimal], THTML, function(n) {
        var bits = math.parseScientific(n.re.toExponential());
        var s = document.createElement('span');
        s.innerHTML = math.niceRealNumber(bits.significand) + ' × 10<sup>' + bits.exponent + '</sup>';
        s.setAttribute('data-interactive', 'false');
        return s;
    });
    set.add_function('scientificnumberhtml', [TNum], THTML, function(n) {
        if(n.complex) {
            n = n.re;
        }
        var bits = math.parseScientific(math.niceRealNumber(n, {style:'scientific', scientificStyle:'plain'}));
        var s = document.createElement('span');
        s.innerHTML = math.niceRealNumber(bits.significand) + ' × 10<sup>' + bits.exponent + '</sup>';
        s.setAttribute('data-interactive', 'false');
        return s;
    });
    set.add_function('matchnumber', [TString, sig.listof(sig.type('string'))], TList, function(s, styles) {
        var result = util.matchNotationStyle(s, styles, true);
        return [new TString(result.matched), new TNum(util.parseNumber(result.cleaned, false, ['plain'], true))];
    }, {unwrapValues:true});
    set.add_function('cleannumber', [TString, sig.optional(sig.listof(sig.type('string')))], TString, util.cleanNumber, {unwrapValues:true});
    set.add_function('isbool', [TString], TBool, util.isBool);
    set.add_function('string', [TInt], TString, math.niceNumber);
    set.add_function('string', [TRational], TString, function(a) {
        return a.toString();
    });
    set.add_function('string', [TDecimal], TString, math.niceComplexDecimal);
    set.add_function('decimal', [TNum], TDecimal, null, {
        evaluate: function(args, scope) {
            if(args.length !== 1) {
                throw(new Numbas.Error("jme.typecheck.no right type definition", {op:'decimal'}));
            }
            /**
             * Replace all occurrences of the `number` type in an expression with the equivalent `decimal` value.
             *
             * @param {Numbas.jme.tree} tree
             * @returns {Numbas.jme.tree}
             */
            function replace_number(tree) {
                var ntree = {};
                if(tree.args) {
                    ntree.args = tree.args.map(replace_number);
                }
                var tok;
                switch(tree.tok.type) {
                    case 'number':
                        var n = tree.tok;
                        var d = (typeof n.originalValue == 'string') ? new math.ComplexDecimal(new Decimal(n.originalValue)) : math.numberToDecimal(n.value);
                        tok = new TDecimal(d);
                        tok.precisionType = n.precisionType;
                        tok.precision = n.precision;
                        break;
                    default:
                        tok = tree.tok;
                }
                tree.tok = tok;
                return tree;
            }
            var tree = replace_number(args[0]);
            var arg = scope.evaluate(tree);
            if(jme.isType(arg, 'decimal')) {
                return jme.castToType(arg, 'decimal');
            } else if(jme.isType(arg, 'number')) {
                const n = jme.castToType(arg, 'number');
                const d = math.numberToDecimal(n.value);
                const t = new TDecimal(d);
                t.precisionType = n.precisionType;
                t.precision = n.precision;
                return t;
            } else if(jme.isType(arg, 'string')) {
                const s = jme.castToType(arg, 'string').value;
                const d = new Decimal(s);
                const t = new TDecimal(d);
                t.precisionType = 'dp';
                t.precision = math.countDP(s);
                return t;
            }
        }
    });
    Numbas.jme.lazyOps.push('decimal');
    set.add_function('decimal', [TRational], TDecimal, null, {
        evaluate: function(args, scope) {
            var n = args[0];
            return new TDecimal((new Decimal(n.value.numerator)).dividedBy(new Decimal(n.value.denominator)));
        }
    });
    set.add_function('decimal', [TString], TDecimal, function(x) {
        var d = new Decimal(x);
        var t = new TDecimal(d);
        t.precisionType = 'dp';
        t.precision = math.countDP(x);
        return t;
    }, {unwrapValues:true});

});

/*-- Testing precision */
builtin_function_set({name: 'precision', description: 'Testing precision'}, (set) => {
    set.add_function('togivenprecision', [TString, TString, TNum, TBool], TBool, math.toGivenPrecision);
    set.add_function('togivenprecision_scientific', [TString, TString, TNum], TBool, math.toGivenPrecisionScientific);
    set.add_function('withintolerance', [TNum, TNum, TNum], TBool, math.withinTolerance);
    set.add_function('countdp', [TString], TNum, function(s) {
        return math.countDP(util.cleanNumber(s));
    });
    set.add_function('countdp', [TDecimal], TInt, function(a) {
        return a.decimalPlaces();
    });
    set.add_function('countsigfigs', [TString], TNum, function(s) {
        return math.countSigFigs(util.cleanNumber(s));
    });

    set.add_function('isint', [TDecimal], TBool, function(a) {
        return a.isInt();
    })
    set.add_function('isint', [TNum], TBool, function(a) {
        return util.isInt(a);
    });

    set.add_function('isnan', [TDecimal], TBool, function(a) {
        return a.isNaN();
    })
    set.add_function('iszero', [TDecimal], TBool, function(a) {
        return a.isZero();
    })
    set.add_function('isnan', [TNum], TBool, function(n) {
        if(n.complex) {
            return isNaN(n.re) || isNaN(n.im);
        }
        return isNaN(n);
    });
    set.add_function('countsigfigs', [TDecimal], TInt, function(a) {
        return a.re.countSigFigs();
    });

});

/*-- JSON */
builtin_function_set({name: 'json', description: 'JSON'}, (set) => {
    set.add_function('json_decode', [TString], '?', null, {
        evaluate: function(args, scope) {
            var data = JSON.parse(args[0].value);
            return jme.wrapValue(data);
        }
    });
    set.add_function('json_encode', ['?'], TString, null, {
        evaluate: function(args, scope) {
            var s = new TString(JSON.stringify(jme.unwrapValue(args[0])));
            s.safe = true;
            return s;
        }
    });

});

/*-- JME */
builtin_function_set({name: 'jme', description: 'Working with JME expressions'}, (set) => {
    set.add_function('jme_string', ['?'], TString, null, {evaluate: function(args, scope) {
        return new TString(jme.display.treeToJME({tok:args[0]}, {}, scope))
    }});


    /** Evaluate the given expressions until the list of conditions is satisfied.
     *
     * @param {Array.<string>} names - Names for each expression.
     * @param {Array.<Numbas.jme.tree>} definitions - Definition of each expression.
     * @param {Array.<Numbas.jme.tree>} conditions - Expressions in terms of the assigned names, which should evaluate to `true` if the values are acceptable.
     * @param {Numbas.jme.Scope} scope - The scope in which to evaluate everything.
     * @param {number} [maxRuns=100] - The maximum number of times to try to generate a set of values.
     * @returns {Object<Numbas.jme.token>} - A dictionary mapping names to their generated values.
     */
    function satisfy(names, definitions, conditions, scope, maxRuns) {
            maxRuns = maxRuns === undefined ? 100 : maxRuns;
            if(definitions.length != names.length) {
                throw(new Numbas.Error('jme.func.satisfy.wrong number of definitions'));
            }
            var satisfied = false;
            var runs = 0;
            while(runs < maxRuns && !satisfied) {
                runs += 1;
                var variables = {};
                for(let i = 0; i < names.length; i++) {
                    variables[names[i]] = scope.evaluate(definitions[i]);
                }
                var nscope = new jme.Scope([scope, {variables:variables}]);
                satisfied = true;
                for(let i = 0; i < conditions.length; i++) {
                    var ok = nscope.evaluate(conditions[i]);
                    if(ok.type != 'boolean') {
                        throw(new Numbas.Error('jme.func.satisfy.condition not a boolean'));
                    }
                    if(!ok.value) {
                        satisfied = false;
                        break;
                    }
                }
            }
            if(!satisfied) {
                throw(new Numbas.Error('jme.func.satisfy.took too many runs'));
            }
            return variables;
    }
    set.add_function('satisfy', [TList, TList, TList, TNum], TList, null, {
        evaluate: function(args, scope) {
            var names = args[0].args.map(function(t) {
                return t.tok.name;
            });
            var definitions = args[1].args;
            var conditions = args[2].args;
            var maxRuns = args.length > 3 ? scope.evaluate(args[3]).value : 100;
            var variables = satisfy(names, definitions, conditions, scope, maxRuns);
            return new TList(names.map(function(name) {
                return variables[name];
            }));
        }
    });
    Numbas.jme.lazyOps.push('satisfy');
    jme.findvarsOps.satisfy = function(tree, boundvars, scope) {
        var names = tree.args[0].args.map(function(t) {
            return t.tok.name
        });
        boundvars = boundvars.concat(0, 0, names);
        var vars = [];
        for(let i = 1;i < tree.args.length;i++) {
            vars = vars.merge(jme.findvars(tree.args[i], boundvars, scope));
        }
        return vars;
    }
    set.add_function('isset', [TName], TBool, null, {
        evaluate: function(args, scope) {
            var name = args[0].tok.name;
            return new TBool(name in scope.variables);
        }
    });
    Numbas.jme.lazyOps.push('isset');
    jme.findvarsOps.isset = function(tree, boundvars, scope) {
        return boundvars;
    }
    jme.substituteTreeOps.isset = function(tree, scope, allowUnbound) {
        return tree;
    }
    set.add_function('unset', [TDict, '?'], '?', null, {
        evaluate: function(args, scope) {
            var defs = jme.unwrapValue(scope.evaluate(args[0]));
            var nscope = scope.unset(defs);
            return nscope.evaluate(args[1]);
        }
    });
    Numbas.jme.lazyOps.push('unset');

    set.add_function('parse', [TString], TExpression, function(str) {
        return jme.compile(str);
    });

    set.add_function('parse', [TString, TString], TExpression, function(str, notation_name) {
        return get_notation(notation_name).compile(str);
    });

    set.add_function('expand_juxtapositions', [TExpression, sig.optional(sig.type('scope')), sig.optional(sig.type('dict'))], TExpression, null, {
        evaluate: function(args, scope) {
            var tree = args[0].tree;
            var argscope = args[1]?.scope || scope;
            var options = args[2] ? jme.unwrapValue(args[2]) : undefined;
            return new TExpression(argscope.expandJuxtapositions(tree, options));
        }
    });

    set.add_function('normalise_subscripts', [TString], TString, null, {
        evaluate: function(args, scope) {
            var tok = new TName(args[0].value);
            return new TString(scope.normaliseSubscripts(tok).name);
        }
    });

    set.add_function('expression', [TString], TExpression, null, {
        evaluate: function(args, scope) {
            var notation = Numbas.locale.default_number_notation;
            Numbas.locale.default_number_notation = ['plain'];
            /**
             * Replace all strings in the given expression with copies marked with `subjme`.
             *
             * @param {Numbas.jme.tree} tree
             * @returns {Numbas.jme.tree}
             */
            function sub_strings(tree) {
                if(jme.isType(tree.tok, 'string') && !tree.tok.safe) {
                    var tok = new TString(tree.tok.value);
                    tok.subjme = true;
                    return {tok: tok};
                } else if(tree.args) {
                    return {
                        tok: tree.tok,
                        args: tree.args.map(sub_strings)
                    };
                } else {
                    return tree;
                }
            }
            var arg = sub_strings(args[0]);
            try {
                var str = scope.evaluate(arg);
            } finally {
                Numbas.locale.default_number_notation = notation;
            }
            if(!jme.isType(str, 'string')) {
                    throw(new Numbas.Error('jme.typecheck.no right type definition', {op:'expression'}));
            }
            str = jme.castToType(str, 'string');
            return new TExpression(jme.compile(str.value));
        }
    });
    Numbas.jme.lazyOps.push('expression');
    set.add_function('args', [TExpression], TList, null, {
        evaluate: function(args, scope) {
            if(!args[0].tree.args) {
                return new TList([]);
            }
            return new TList(args[0].tree.args.map(function(tree) {
                return new TExpression(tree);
            }));
        }
    });
    set.add_function('as', ['?', TString], '?', null, {
        evaluate: function(args, scope) {
            var target = args[1].value;
            return jme.castToType(args[0], target);
        }
    });
    set.add_function('type', [TExpression], TString, null, {
        evaluate: function(args, scope) {
            return new TString(args[0].tree.tok.type);
        }
    });
    set.add_function('type', ['?'], TString, null, {
        evaluate: function(args, scope) {
            return new TString(args[0].type);
        }
    });
    set.add_function('name', [TString], TName, function(name) {
        return name
    });
    set.add_function('string', [TName], TString, function(name) {
        return name
    });
    set.add_function('op', [TString], TOp, function(name) {
        return name
    });
    set.add_function('function', [TString], TFunc, function(name) {
        return name
    });
    set.add_function('exec', [sig.or(sig.type('function'), sig.type('op')), TList], TExpression, null, {
        evaluate: function(args, scope) {
            var tok;
            if(args[0].args) {
                tok = scope.evaluate(args[0]);
            } else {
                tok = args[0].tok;
            }
            var list = scope.evaluate(args[1]);
            var eargs = list.value.map(function(a) {
                if(a.type != 'expression') {
                    return {tok:a};
                } else {
                    return a.tree;
                }
            });
            tok.vars = eargs.length;
            return new TExpression({tok: tok, args: eargs});
        }
    });
    Numbas.jme.lazyOps.push('exec');

    set.add_function('simplify', [TExpression, TString], TExpression, null, {
        evaluate: function(args, scope) {
            var tree = args[0].tree;
            var ruleset = jme.rules.collectRuleset(args[1].value, scope.allRulesets());
            return new TExpression(jme.display.simplifyTree(tree, ruleset, scope));
        }
    });
    set.add_function('simplify', [TExpression, TList], TExpression, null, {
        evaluate: function(args, scope) {
            var tree = args[0].tree;
            var ruleset = jme.rules.collectRuleset(args[1].value.map(function(x) {
                return x.value
            }), scope.allRulesets());
            return new TExpression(jme.display.simplifyTree(tree, ruleset, scope));
        }
    });
    set.add_function('simplify', [TString, TString], TExpression, null, {
        evaluate: function(args, scope) {
            return new TExpression(jme.display.simplify(args[0].value, args[1].value, scope));
        }
    });
    set.add_function('eval', [TExpression], '?', null, {
        evaluate: function(args, scope) {
            return scope.evaluate(args[0].tree);
        },
        random: undefined
    });
    set.add_function('eval', [TExpression, TDict], '?', null, {
        evaluate: function(args, scope) {
            return (new Numbas.jme.Scope([scope, {variables:args[1].value}])).evaluate(args[0].tree);
        },
        random: undefined
    });
    set.add_function('findvars', [TExpression], TList, null, {
        evaluate: function(args, scope) {
            var vars = jme.findvars(args[0].tree, [], scope);
            return new TList(vars.map(function(v) {
                return new TString(v)
            }));
        }
    });
    set.add_function('definedvariables', [], TList, null, {
        evaluate: function(args, scope) {
            var vars = Object.keys(scope.allVariables());
            return new TList(vars.map(function(x) {
                return new TString(x)
            }));
        }
    });
    set.add_function('infer_variable_types', [TExpression], TDict, null, {
        evaluate: function(args, scope) {
            var expr = args[0];
            var assignments = jme.inferVariableTypes(expr.tree, scope);
            if(!assignments) {
                assignments = {};
            }
            return jme.wrapValue(assignments);
        }
    });

    set.add_function('infer_type', [TExpression], TString, null, {
        evaluate: function(args, scope) {
            var expr = args[0];
            return jme.wrapValue(jme.inferExpressionType(expr.tree, scope));
        }
    });

    set.add_function('make_variables', [sig.dict(sig.type('expression')), sig.optional(sig.type('range'))], TDict, null, {
        evaluate: function(args, scope) {
            var todo = {};
            scope = new jme.Scope([scope]);
            if(args.length > 1 && args[1].type != 'nothing') {
                scope.setVariable('vrange', args[1]);
            }
            for(const [k, v] of Object.entries(args[0].value)) {
                scope.deleteVariable(k);
                const tree = v.tree;
                var vars = jme.findvars(tree, [], scope);
                todo[k] = {tree, vars};
            }
            var result = jme.variables.makeVariables(todo, scope);
            var out = {};
            for(const [k, v] of Object.entries(result.variables)) {
                out[k] = v;
            }
            return new TDict(out);
        },
        random: undefined
    });
    set.add_function('canonical_compare', ['?', '?'], TNum, null, {
        evaluate: function(args, scope) {
            var cmp = jme.compareTrees(args[0], args[1]);
            return new TNum(cmp);
        }
    });
    jme.lazyOps.push('canonical_compare');

    set.add_function('numerical_compare', [TExpression, TExpression], TBool, null, {
        evaluate: function(args, scope) {
            var a = args[0].tree;
            var b = args[1].tree;
            return new TBool(jme.compare(a, b, {}, scope));
        }
    });

    set.add_function('debug_log', ['?', '?'], '?', null, {
        evaluate: function(args, scope) {
            console.log('DEBUG ' + args[1].value + ':', Numbas.jme.unwrapValue(args[0]));
            return args[0];
        }
    }, {unwrapValues: false});

    set.add_function('scope_case_sensitive', ['?', TBool], '?', null, {
        evaluate: function(args, scope) {
            var caseSensitive = args.length > 1 ? scope.evaluate(args[1]).value : true;
            var scope2 = new jme.Scope([scope, {caseSensitive: caseSensitive}]);
            return scope2.evaluate(args[0]);
        }
    });
    jme.lazyOps.push('scope_case_sensitive');


    set.add_function('scope', [], TScope, null, {
        evaluate: function(args, scope) {
            return new TScope(new jme.Scope({}));
        }
    });

    set.add_function('eval', [TExpression, TScope], '?', null, {
        evaluate: function(args, scope) {
            const expr = args[0];
            const eval_scope = args[1].scope;
            return eval_scope.evaluate(args[0].tree);
        },
        random: undefined
    });
    set.add_function('eval', [TExpression, TScope, TDict], '?', null, {
        evaluate: function(args, scope) {
            const eval_scope = args[1].scope;
            const variables = args[2].value;
            return (new Numbas.jme.Scope([eval_scope, {variables}])).evaluate(args[0].tree);
        },
        random: undefined
    });

    set.add_function('case_sensitive', [TScope, TBool], TScope, null, {
        evaluate: function(args, scope) {
            const argscope = args[0].scope;
            const outscope = argscope.clone();
            outscope.caseSensitive = args[1].value;
            return new TScope(outscope);
        }
    });

    set.add_function('set_variables', [TScope, TDict], TScope, null, {
        evaluate: function(args, scope) {
            const argscope = args[0].scope;
            const variables = args[1].value;
            const outscope = argscope.clone();
            for(const [k, v] of Object.entries(variables)) {
                outscope.setVariable(k, v);
            }
            return new TScope(outscope);
        }
    });

    set.add_function('add_function_sets', [TScope, 'list of string'], TScope, null, {
        evaluate: function(args, scope) {
            const argscope = args[0].scope;
            const set_names = jme.unwrapValue(args[1]);
            const outscope = argscope.clone();
            for(let set_name of set_names) {
                outscope.addFunctionSet(scope.getFunctionSet(set_name));
            }
            return new TScope(outscope);
        }
    });

    set.add_function('add_functions', [TScope, 'list of string'], TScope, null, {
        evaluate: function(args, scope) {
            const argscope = args[0].scope;
            const names = jme.unwrapValue(args[1]);
            const outscope = argscope.clone();
            for(let name of names) {
                for(let fn of scope.getFunction(name)) {
                    outscope.addFunction(fn);
                }
            }
            return new TScope(outscope);
        }
    });

    set.add_function('remove_functions', [TScope, 'list of string'], TScope, null, {
        evaluate: function(args, scope) {
            const argscope = args[0].scope;
            const names = jme.unwrapValue(args[1]);
            const outscope = argscope.clone();
            for(let name of names) {
                outscope.deleteFunction(name);
            }
            return new TScope(outscope);
        }
    });
});

/*-- Pattern matching */
builtin_function_set({name: 'pattern_matching', description: 'Pattern-matching expressions'}, (set) => {
    /** Helper function for the JME `match` function.
     *
     * @param {Numbas.jme.tree} expr
     * @param {string} pattern
     * @param {string} options
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.token}
     * @see Numbas.jme.rules.Rule#match
     */
    function match_subexpression(expr, pattern, options, scope) {
        var rule = new jme.rules.Rule(pattern, null, options);
        var match = rule.match(expr, scope);
        if(!match) {
            return jme.wrapValue({match: false, groups: {}});
        } else {
            var groups = {}
            for(const [k, v] of Object.entries(match)) {
                if(k.slice(0, 2) != '__') {
                    groups[k] = new TExpression(v);
                }
            }
            return jme.wrapValue({
                match: true,
                groups: groups
            });
        }
    }

    set.add_function('match', [TExpression, TString], TDict, null, {
        evaluate: function(args, scope) {
            var expr = args[0].tree;
            var pattern = args[1].value;
            var options = 'ac';
            return match_subexpression(expr, pattern, options, scope);
        }
    });
    set.add_function('match', [TExpression, TString, TString], TDict, null, {
        evaluate: function(args, scope) {
            var expr = args[0].tree;
            var pattern = args[1].value;
            var options = args[2].value;
            return match_subexpression(expr, pattern, options, scope);
        }
    });

    /** Helper function for the JME `matches` function.
     *
     * @param {Numbas.jme.tree} expr
     * @param {string} pattern
     * @param {string} options
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.token}
     * @see Numbas.jme.rules.Rule#match
     */
    function matches_subexpression(expr, pattern, options, scope) {
        var rule = new jme.rules.Rule(pattern, null, options);
        var match = rule.match(expr, scope);
        return new TBool(match && true);
    }

    set.add_function('matches', [TExpression, TString], TBool, null, {
        evaluate: function(args, scope) {
            var expr = args[0].tree;
            var pattern = args[1].value;
            var options = 'ac';
            return matches_subexpression(expr, pattern, options, scope);
        }
    });
    set.add_function('matches', [TExpression, TString, TString], TBool, null, {
        evaluate: function(args, scope) {
            var expr = args[0].tree;
            var pattern = args[1].value;
            var options = args[2].value;
            return matches_subexpression(expr, pattern, options, scope);
        }
    });

    /** Helper function for the JME `replace` function.
     *
     * @param {string} pattern
     * @param {string} repl
     * @param {Numbas.jme.tree} expr
     * @param {string} options
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.token}
     * @see Numbas.jme.rules.Rule#replaceAll
     */
    function replace_expression(pattern, repl, expr, options, scope) {
            var rule = new jme.rules.Rule(pattern, repl, options);
            var out = rule.replaceAll(expr, scope).expression;
            return new TExpression(out);
    }
    set.add_function('replace', [TString, TString, TExpression], TExpression, null, {
        evaluate: function(args, scope) {
            var pattern = args[0].value;
            var repl = args[1].value;
            var expr = args[2].tree;
            var options = 'acg';
            return replace_expression(pattern, repl, expr, options, scope);
        }
    });
    set.add_function('replace', [TString, TString, TExpression, TString], TExpression, null, {
        evaluate: function(args, scope) {
            var pattern = args[0].value;
            var repl = args[1].value;
            var expr = args[2].tree;
            var options = args[3].value;
            return replace_expression(pattern, repl, expr, options, scope);
        }
    });
    set.add_function('substitute', [TDict, TExpression], TExpression, null, {
        evaluate: function(args, scope) {
            var substitutions = args[0].value;
            for(const [k, v] of Object.entries(substitutions)) {
                if(v.type == 'expression') {
                    substitutions[k] = v.tree;
                }
            }
            var expr = args[1].tree;
            scope = new Scope({variables: substitutions});
            var nexpr = jme.substituteTree(expr, scope, true, true);
            return new TExpression(nexpr);
        }
    });


});

/*-- HTML */
builtin_function_set({name: 'html', description: 'HTML'}, (set) => {
    set.add_function('html', [TString], THTML, null, {
        evaluate: function(args, scope) {
            var container = document.createElement('div');
            container.innerHTML = args[0].value;
            var subber = new jme.variables.DOMcontentsubber(scope);
            subber.subvars(container);
            var nodes = Array.from(container.childNodes);
            nodes.forEach((node) => {
                if(node.nodeType == node.ELEMENT_NODE) {
                    node.setAttribute('data-interactive', 'false');
                }
            });
            return new THTML(nodes);
        }
    });
    set.add_function('isnonemptyhtml', [TString], TBool, function(html) {
        return util.isNonemptyHTML(html);
    });
    set.add_function('image', [TString, '[number]', '[number]'], THTML, null, {
        evaluate: function(args, scope) {
            var url = args[0].value;
            var width = args[1];
            var height = args[2];
            var img = document.createElement('img');
            img.setAttribute('src', url);
            if(width.type != 'nothing') {
                img.style.width = width.value + 'em';
            }
            if(height.type != 'nothing') {
                img.style.height = height.value + 'em';
            }
            var subber = new jme.variables.DOMcontentsubber(scope);
            var element = subber.subvars(img);

            // The subber replaces SVG images with <object> tags which have an event listener for when the content loads, so they must be considered interactive.
            element.setAttribute('data-interactive', element.tagName.toLowerCase() == 'object');

            return new THTML(element);
        }
    });
    set.add_function('escape_html', [TString], TString, function(str) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    });
    /** Set the content of an HTML element to something corresponding to the value of the given token.
     * If the token is not of type HTML, use {@link Numbas.jme.typeToDisplayString}.
     *
     * @param {Element} element
     * @param {Numbas.jme.token} tok
     * @param {Numbas.jme.Scope} scope
     */
    function set_html_content(element, tok, scope) {
        if(tok.type != 'html') {
            element.innerHTML = jme.tokenToDisplayString(tok, scope);
        } else {
            element.appendChild(tok.value);
        }
    }
    set.add_function('table', ['list of list', 'list', 'list'], THTML, null, {
        evaluate: function(args, scope) {
            var data = args[0].value;
            var col_headers = args[1].value;
            var row_headers = args[2].value;
            var table = document.createElement('table');
            var thead = document.createElement('thead');
            table.appendChild(thead);
            thead.appendChild(document.createElement('th'));
            for(let i = 0;i < col_headers.length;i++) {
                const th = document.createElement('th');
                th.setAttribute('scope', 'col');
                set_html_content(th, col_headers[i], scope);
                thead.appendChild(th);
            }
            var tbody = document.createElement('tbody');
            table.appendChild(tbody);
            for(let i = 0;i < data.length;i++) {
                var row = document.createElement('tr');
                tbody.appendChild(row);

                const th = document.createElement('th');
                th.setAttribute('scope', 'row');
                set_html_content(th, row_headers[i], scope);
                row.appendChild(th);

                for(let j = 0;j < data[i].value.length;j++) {
                    var td = document.createElement('td');
                    set_html_content(td, data[i].value[j], scope);
                    row.appendChild(td);
                }
            }
            table.setAttribute('data-interactive', 'false');
            return new THTML(table);
        }
    });
    set.add_function('table', ['list of list', 'list'], THTML, null, {
        evaluate: function(args, scope) {
            var data = args[0].value;
            var headers = args[1].value;
            var table = document.createElement('table');
            var thead = document.createElement('thead');
            table.appendChild(thead);
            for(let i = 0;i < headers.length;i++) {
                var th = document.createElement('th');
                th.setAttribute('scope', 'col');
                set_html_content(th, headers[i], scope);
                thead.appendChild(th);
            }
            var tbody = document.createElement('tbody');
            table.appendChild(tbody);
            for(let i = 0;i < data.length;i++) {
                var row = document.createElement('tr');
                tbody.appendChild(row);
                for(let j = 0;j < data[i].value.length;j++) {
                    var td = document.createElement('td');
                    set_html_content(td, data[i].value[j], scope);
                    row.appendChild(td);
                }
            }
            table.setAttribute('data-interactive', 'false');
            return new THTML(table);
        }
    });
    set.add_function('table', ['list of list'], THTML, null, {
        evaluate: function(args, scope) {
            var data = args[0].value;
            var table = document.createElement('table');
            var tbody = document.createElement('tbody');
            table.appendChild(tbody);
            for(let i = 0;i < data.length;i++) {
                var row = document.createElement('tr');
                tbody.appendChild(row);
                for(let j = 0;j < data[i].value.length;j++) {
                    var td = document.createElement('td');
                    set_html_content(td, data[i].value[j], scope);
                    row.appendChild(td);
                }
            }
            table.setAttribute('data-interactive', 'false');
            return new THTML(table);
        }
    });

    set.add_function('max_width', [TNum, THTML], THTML, function(w, h) {
        h[0].style['max-width'] = w + 'em';
        return h[0];
    });

    set.add_function('max_height', [TNum, THTML], THTML, function(w, h) {
        h[0].style['max-height'] = w + 'em';
        return h[0];
    });


});

/*-- Random */
builtin_function_set({name: 'randomisation', description: 'Randomisation'}, (set) => {
    set.add_function('random', [TRange], TNum, null, {
        evaluate: function(args, scope) {
            var range = args[0];
            var n = math.random(range.value);
            var cons = best_number_type_for_range(range.value);
            return new cons(n);
        },
        random:true
    });
    set.add_function('random', [TList], '?', null, {
        random:true,
        evaluate: function(args, scope) {
            return math.choose(args[0].value);
        }
    });
    set.add_function('random', ['*?'], '?', null, {
        random:true,
        evaluate: function(args, scope) {
            return math.choose(args);
        }
    });
    set.add_function('weighted_random', [sig.listof(sig.list(sig.anything(), sig.type('number')))], '?', null, {
        evaluate: function(args, scope) {
            var items = args[0].value.map(function(item) {
                return [item.value[0], Numbas.jme.unwrapValue(item.value[1])];
            });
            return math.weighted_random(items);
        },
        random: true
    });

    set.add_function('seedrandom', ['?', '?'], '?', null, {
        evaluate: function(args, scope) {
            const seed = Numbas.jme.unwrapValue(scope.evaluate(args[0]));
            const orandom = Math.random;
            Math.seedrandom(seed);
            let result;
            try {
                result = scope.evaluate(args[1]);
            } finally {
                Math.random = orandom;
            }
            return result;
        }
    });
    jme.lazyOps.push('seedrandom');
    jme.isDeterministicOps['seedrandom'] = function(expr, scope) {
        // The second argument is always deterministic.
        return jme.isDeterministic(expr.args[0], scope);
    }
    set.add_function('deal', [TNum], TList,
        function(n) {
            return math.deal(n).map(function(i) {
                return new TNum(i);
            });
        },
        {
            random:true
        }
    );
    set.add_function('shuffle', [TList], TList,
        function(list) {
            return math.shuffle(list);
        },
        {
            random:true
        }
    );
    set.add_function('shuffle_together', [sig.listof(sig.type('list'))], TList, function(lists) {
        lists = lists.map(function(l) {
            return l.value;
        });
        lists = math.shuffle_together(lists);
        return lists.map(function(l) {
            return new TList(l);
        });
    }, {random: true});

    set.add_function('random_integer_partition', [TNum, TNum], TList, function(n, k) {
        return math.random_integer_partition(n, k).map(function(x) {
            return new TInt(x);
        })
    }, {random: true});

});

/*-- Control flow */
builtin_function_set({name: 'control_flow', description: 'Control flow'}, (set) => {
    set.add_function('if', [TBool, '?', '?'], '?', null, {
        evaluate: function(args, scope) {
            if(args.length !== 3) {
                throw(new Numbas.Error("jme.typecheck.no right type definition", {op:'if'}));
            }
            var test = jme.evaluate(args[0], scope);
            if(jme.isType(test, 'boolean')) {
                test = jme.castToType(test, 'boolean').value;
            } else {
                // If the test can't be cast to a boolean, use JS's truthiness test on the value attribute.
                // Ideally this should throw an error, but I don't know if anything depends on this undocumented behaviour.
                test = test.value;
            }
            if(test) {
                return jme.evaluate(args[1], scope);
            } else {
                return jme.evaluate(args[2], scope);
            }
        }
    });
    Numbas.jme.lazyOps.push('if');
    set.add_function('switch', [sig.multiple(sig.sequence(sig.type('boolean'), sig.anything())), '?'], '?', null, {
        evaluate: function(args, scope) {
            for(let i = 0; i < args.length - 1; i += 2) {
                var result = jme.evaluate(args[i], scope).value;
                if(result) {
                    return jme.evaluate(args[i + 1], scope);
                }
            }
            if(args.length % 2 == 1) {
                return jme.evaluate(args.at(-1), scope);
            } else {
                throw(new Numbas.Error('jme.func.switch.no default case'));
            }
        }
    });
    Numbas.jme.lazyOps.push('switch');

    var let_sig_names = sig.multiple(
                        sig.or(
                            sig.sequence(sig.type('name'), sig.anything()),
                            sig.sequence(sig.listof(sig.type('name')), sig.anything())
                        )
                    );
    set.add_function('let', [sig.or(sig.type('dict'), let_sig_names), '?'], TList, null, {
        evaluate: function(args, scope) {
            var signature = sig.or(sig.type('dict'), let_sig_names)(args.map(function(a) {
                if(a.tok.type == 'list' && a.args) {
                    return new TList(a.args.map(function(aa) {
                        return aa.tok;
                    }));
                } else {
                    return a.tok
                }
            }));
            if(!signature) {
                throw(new Numbas.Error('jme.typecheck.no right type definition', {op:'let'}));
            }
            let variables, lambda, nscope;
            if(signature[0].type == "dict") {
                var d = scope.evaluate(args[0]);
                variables = d.value;
                lambda = args[1];
                nscope = new Scope([scope, {variables:variables}]);
                return nscope.evaluate(lambda);
            } else {
                lambda = args.at(-1);
                variables = {};
                nscope = new Scope([scope]);
                for(let i = 0;i < args.length - 1;i += 2) {
                    var value = nscope.evaluate(args[i + 1]);
                    if(args[i].tok.type == 'name') {
                        var name = args[i].tok.name;
                        nscope.setVariable(name, value);
                    } else if(args[i].tok.type == 'list') {
                        var names = args[i].args.map(function(t) {
                            return t.tok.name
                        });
                        var values = jme.castToType(value, 'list').value;
                        for(let j = 0;j < names.length;j++) {
                            nscope.setVariable(names[j], values[j]);
                        }
                    }
                }
                return nscope.evaluate(lambda);
            }
        }
    });
    Numbas.jme.lazyOps.push('let');
    jme.findvarsOps.let = function(tree, boundvars, scope) {
        var vars = [];
        boundvars = boundvars.slice();
        for(let i = 0;i < tree.args.length - 1;i += 2) {
            switch(tree.args[i].tok.type) {
                case 'name':
                    boundvars.push(jme.normaliseName(tree.args[i].tok.name, scope));
                    break;
                case 'list':
                    boundvars = boundvars.concat(tree.args[i].args.map(function(t) {
                        return t.tok.name
                    }));
                    break;
                case 'dict':
                    tree.args[i].args.forEach(function(kp) {
                        boundvars.push(kp.tok.key);
                        vars = vars.merge(jme.findvars(kp.args[0], boundvars, scope));
                    });
                    break;
            }
            vars = vars.merge(jme.findvars(tree.args[i + 1], boundvars, scope));
        }
        // find variables used in the lambda expression, excluding the ones assigned by let
        vars = vars.merge(jme.findvars(tree.args.at(-1), boundvars, scope));
        return vars;
    }
    jme.substituteTreeOps.let = function(tree, scope, allowUnbound) {
        var nscope = new Scope([scope]);
        let names;
        if(tree.args[0].tok.type == 'dict') {
            var d = tree.args[0];
            names = d.args.map(function(da) {
                return da.tok.key;
            });
            for(let i = 0;i < names.length;i++) {
                nscope.deleteVariable(names[i]);
            }
            d.args = d.args.map(function(da) {
                return jme.substituteTree(da, nscope, allowUnbound)
            });
        } else {
            for(let i = 1;i < tree.args.length - 1;i += 2) {
                switch(tree.args[i - 1].tok.type) {
                    case 'name':
                        var name = tree.args[i - 1].tok.name;
                        nscope.deleteVariable(name);
                        break;
                    case 'list':
                        names = tree.args[i - 1].args;
                        for(let j = 0;j < names.length;j++) {
                            nscope.deleteVariable(names[j].tok.name);
                        }
                        break;
                }
                tree.args[i] = jme.substituteTree(tree.args[i], nscope, allowUnbound);
            }
        }
    }
    set.add_function('assert', [TBool, '?'], '?', null, {
        evaluate: function(args, scope) {
            var result = scope.evaluate(args[0]).value;
            if(!result) {
                return scope.evaluate(args[1]);
            } else {
                return new TBool(false);
            }
        }
    });
    Numbas.jme.lazyOps.push('assert');
    set.add_function('try', ['?', TName, '?'], '?', null, {
        evaluate: function(args, scope) {
            try {
                var res = scope.evaluate(args[0]);
                return res;
            } catch(e) {
                var variables = {};
                variables[args[1].tok.name] = e.message;
                return scope.evaluate(args[2], variables);
            }
        }
    });
    Numbas.jme.lazyOps.push('try');
    jme.findvarsOps.try = function(tree, boundvars, scope) {
        var try_boundvars = boundvars.slice();
        try_boundvars.push(jme.normaliseName(tree.args[1].tok.name, scope));
        var vars = jme.findvars(tree.args[0], boundvars, scope);
        vars = vars.merge(jme.findvars(tree.args[2], try_boundvars, scope));
        return vars;
    }
    /**
     * Rewrite an application of the pipe operator `a |> b(...)` to `b(a, ...)`.
     *
     * Note that the `|>` operator won't normally appear in compiled expressions, because the tree is rewritten as part of the compilation process.
     * This definition is added only so that manually-constructed expressions containing `|>` still work.
     *
     * @param {Array.<Numbas.jme.tree>} args
     * @returns {Numbas.jme.tree}
     */
    function pipe_rewrite(args) {
        var bargs = args[1].args.slice();
        bargs.splice(0, 0, args[0]);
        var tree = {
            tok: args[1].tok,
            args: bargs
        };

        return tree;
    }

    set.add_function('|>', ['?', '?'], '?', null, {
        evaluate: function(args, scope) {
            return scope.evaluate(pipe_rewrite(args));
        }
    });
    jme.lazyOps.push('|>');
    jme.findvarsOps['|>'] = function(tree, boundvars, scope) {
        tree = pipe_rewrite(tree.args);
        return jme.findvars(tree, boundvars, scope);
    }

});

/*-- Map, reduce, comprehensions */
builtin_function_set({name: 'comprehensions', description: 'List comprehensions'}, (set) => {
    /** Map the given expression, considered as a lambda, over the given list.
     *
     * @param {Numbas.jme.types.TLambda} lambda
     * @param {Numbas.jme.types.TList} list - The list to map over.
     * @param {Numbas.jme.Scope} scope - The scope in which to evaluate.
     * @returns {Numbas.jme.types.TList}
     */
    function mapOverList(lambda, list, scope) {
        var olist = list.map(function(v) {
            return lambda.evaluate([v], scope);
        });
        return new TList(olist);
    }
    /** Functions for 'map', by the type of the thing being mapped over.
     * Functions take a JME expression lambda, a name or list of names to map, a value to map over, and a scope to evaluate against.
     *
     * @memberof Numbas.jme
     * @name mapFunctions
     * @enum {Function}
     */
    jme.mapFunctions = {
        'list': mapOverList,
        'set': mapOverList,
        'range': function(lambda, range, scope) {
            var list = math.rangeToList(range).map(function(n) {
                return new TNum(n)
            });
            return mapOverList(lambda, list, scope);
        },
        'matrix': function(lambda, matrix, scope) {
            return new TMatrix(matrixmath.map(matrix, function(n) {
                var o = lambda.evaluate([new TNum(n)], scope);
                if(!jme.isType(o, 'number')) {
                    throw(new Numbas.Error("jme.map.matrix map returned non number"))
                }
                return jme.castToType(o, 'number').value;
            }));
        },
        'vector': function(lambda, vector, scope) {
            return new TVector(vectormath.map(vector, function(n) {
                var o = lambda.evaluate([new TNum(n)], scope);
                if(!jme.isType(o, 'number')) {
                    throw(new Numbas.Error("jme.map.vector map returned non number"))
                }
                return jme.castToType(o, 'number').value;
            }));
        }
    }
    const fn_map = set.add_function('map', ['?', TName, '?'], TList, null, {
        make_lambda: function(args, scope) {
            if(args[0].tok.type == 'lambda') {
                return args;
            }
            return [{tok: new TLambda([args[1]], args[0])}, args[2]];
        },
        evaluate: function(args, scope) {
            args = this.options.make_lambda(args, scope);

            var lambda = args[0].tok;

            var value = scope.evaluate(args[1]);

            if(!(value.type in jme.mapFunctions)) {
                throw(new Numbas.Error('jme.typecheck.map not on enumerable', {type:value.type}));
            }

            return jme.mapFunctions[value.type](lambda, value.value, scope);
        }
    });
    Numbas.jme.lazyOps.push('map');
    jme.findvarsOps.map = function(tree, boundvars, scope) {
        return jme.findvars_args(fn_map.options.make_lambda(tree.args, scope), boundvars, scope);
    }
    jme.substituteTreeOps.map = function(tree, scope, allowUnbound) {
        var list_index = tree.args[0].tok.type == 'lambda' ? 1 : 2;
        tree.args[list_index] = jme.substituteTree(tree.args[list_index], scope, allowUnbound);
        return tree;
    }
    set.add_function('for:', ['?', TName, '?'], TList, null, {
        evaluate: function(args, scope) {
            var lambda = args[0];

            var fors = [];

            /** Unfold chained applications of the `for:`, `of:` and `where:` operators.
             *
             * @param {Numbas.jme.tree} arg
             * @returns {object}
             */
            function unfold_for(arg) {
                if(jme.isOp(arg.tok, 'for:')) {
                    unfold_for(arg.args[0]);
                    unfold_for(arg.args[1]);
                    return null;
                } else if(jme.isOp(arg.tok, 'where:')) {
                    const f = unfold_for(arg.args[0]);
                    f.where = arg.args[1];
                    return null;
                } else if(jme.isOp(arg.tok, 'of:')) {
                    var value_tree = arg.args[1];
                    var namearg = arg.args[0];
                    if(jme.isType(namearg.tok, 'name')) {
                        const f = {name: namearg.tok.name, value_tree};
                        fors.push(f);
                        return f;
                    } else if(jme.isType(namearg.tok, 'list')) {
                        var names = namearg.args.map(function(subnamearg) {
                            if(!jme.isType(subnamearg.tok, 'name')) {
                                throw(new Numbas.Error('jme.typecheck.for in name wrong type', {type: subnamearg.tok.type}));
                            }
                            return subnamearg.tok.name;
                        });
                        const f = {names, value_tree};
                        fors.push(f);
                        return f;
                    } else {
                        throw(new Numbas.Error('jme.typecheck.for in name wrong type', {type: namearg.tok.type}));
                    }
                } else {
                    throw(new Numbas.Error('jme.typecheck.no right type definition', {op:'for:'}));
                }
            }

            unfold_for(args[1]);

            scope = new Scope(scope);

            var indexes = fors.map(function() {
                return 0;
            });
            var values = fors.map(function() {
                return [];
            });

            var end = fors.length - 1;
            var out = [];
            var j = 0;

            /** After reaching the end of the mapping chain, go back a step and move to the next item in the last collection.
             */
            function retreat() {
                values[j] = [];
                if(fors[j].names !== undefined) {
                    fors[j].names.forEach(function(name) {
                        scope.deleteVariable(name);
                    });
                } else {
                    scope.deleteVariable(fors[j].name);
                }
                indexes[j] = 0;
                j -= 1;
                if(j >= 0) {
                    indexes[j] += 1;
                }
            }

            while(j >= 0) {
                if(indexes[j] == 0) {
                    values[j] = jme.castToType(scope.evaluate(fors[j].value_tree), 'list').value;
                    if(fors[j].names !== undefined) {
                        values[j] = values[j].map(function(v) {
                            return jme.castToType(v, 'list').value;
                        });
                    }
                }
                var f = fors[j];
                while(indexes[j] < values[j].length) {
                    var value = values[j][indexes[j]];
                    if(f.name !== undefined) {
                        scope.setVariable(f.name, value);
                    } else {
                        f.names.forEach(function(name, j) {
                            scope.setVariable(name, value[j]);
                        });
                    }
                    if(f.where === undefined) {
                        break;
                    }
                    var res = jme.castToType(scope.evaluate(f.where), 'boolean').value;
                    if(res) {
                        break;
                    }
                    indexes[j] += 1;
                }
                if(indexes[j] >= values[j].length) {
                    retreat();
                    continue;
                }

                if(j == end) {
                    out.push(scope.evaluate(lambda));
                    indexes[j] += 1;
                    while(j >= 0 && indexes[j] >= values[j].length) {
                        retreat();
                    }
                } else {
                    j += 1;
                    if(j <= end) {
                        indexes[j] = 0;
                    }
                }
            }

            return new TList(out);
        }
    });
    Numbas.jme.lazyOps.push('for:');
    jme.findvarsOps['for:'] = function(tree, boundvars, scope) {
        var mapped_boundvars = boundvars.slice();
        var vars = [];

        /** Find variables used in part of a `.. for: .. of: ..` expression.
         *
         * @param {Numbas.jme.tree} arg
         */
        function visit_for(arg) {
            if(jme.isOp(arg.tok, 'for:')) {
                visit_for(arg.args[0]);
                visit_for(arg.args[1]);
            } else if(jme.isOp(arg.tok, 'where:')) {
                visit_for(arg.args[0]);
                vars = vars.merge(jme.findvars(arg.args[1], mapped_boundvars, scope));
            } else if(jme.isOp(arg.tok, 'of:')) {
                var namearg = arg.args[0];
                if(namearg.tok.type == 'list') {
                    var names = namearg.args;
                    for(let i = 0;i < names.length;i++) {
                        mapped_boundvars.push(jme.normaliseName(names[i].tok.name, scope));
                    }
                } else {
                    mapped_boundvars.push(jme.normaliseName(namearg.tok.name, scope));
                }
                vars = vars.merge(jme.findvars(arg.args[1], mapped_boundvars, scope));
            }
        }
        visit_for(tree.args[1]);
        vars = vars.merge(jme.findvars(tree.args[0], mapped_boundvars, scope));
        return vars;
    }
    jme.substituteTreeOps['for:'] = function(tree, scope, allowUnbound) {
        var nscope = new Scope([scope]);

        /** Substitute variables into part of a `.. for: .. of: ..` expression.
         *
         * @param {Numbas.jme.tree} arg
         * @returns {Numbas.jme.tree}
         */
        function visit_for(arg) {
            arg = {tok: arg.tok, args: arg.args.slice()};
            if(jme.isOp(arg.tok, 'for:')) {
                arg.args[0] = visit_for(arg.args[0]);
                arg.args[1] = visit_for(arg.args[1]);
            } else if(jme.isOp(arg.tok, 'when:')) {
                arg.args[0] = visit_for(arg.args[0]);
                arg.args[1] = visit_for(arg.args[1]);
            } else if(jme.isOp(arg.tok, 'of:')) {
                var namearg = arg.args[0];
                if(namearg.tok.type == 'list') {
                    namearg.args.forEach(function(name) {
                        nscope.deleteVariable(name.tok.name);
                    });
                } else {
                    nscope.deleteVariable(namearg.tok.name);
                }
                arg.args[1] = jme.substituteTree(arg.args[1], nscope, true);
            } else {
                arg = jme.substituteTree(arg, nscope, true);
            }
            return arg;
        }
        tree.args[1] = visit_for(tree.args[1]);
        tree.args[0] = jme.substituteTree(tree.args[0], nscope, true);
        return tree;
    }

    var fn_filter = set.add_function('filter', ['?', TName, '?'], TList, null, {
        make_lambda: function(args, scope) {
            if(args[0].tok.type == 'lambda') {
                return args;
            }
            return [{tok: new TLambda([args[1]], args[0])}, args[2]];
        },
        evaluate: function(args, scope) {
            args = this.options.make_lambda(args, scope);

            var lambda = args[0].tok;
            var list = jme.castToType(scope.evaluate(args[1]), 'list').value;

            var ovalue = list.filter(function(v) {
                return jme.castToType(lambda.evaluate([v], scope), 'boolean').value;
            });

            return new TList(ovalue);
        }
    });
    Numbas.jme.lazyOps.push('filter');
    jme.findvarsOps.filter = function(tree, boundvars, scope) {
        return jme.findvars_args(fn_filter.options.make_lambda(tree.args), boundvars, scope);
    }
    jme.substituteTreeOps.filter = function(tree, scope, allowUnbound) {
        var list_index = tree.args[0].tok.type == 'lambda' ? 1 : 2;
        tree.args[list_index] = jme.substituteTree(tree.args[list_index], scope, allowUnbound);
        return tree;
    }

    set.add_function('iterate', ['?', TName, '?', TNum], TList, null, {
        make_lambda: function(args, scope) {
            if(args[0].tok.type == 'lambda') {
                return args;
            }
            return [{tok: new TLambda([args[1]], args[0])}, args[2], args[3]];
        },
        evaluate: function(args, scope) {
            args = this.options.make_lambda(args, scope);

            var lambda = args[0].tok;
            var value = scope.evaluate(args[1]);
            var times = Math.round(jme.castToType(scope.evaluate(args[2]), 'number').value);

            var out = [value];
            for(let i = 0;i < times;i++) {
                value = lambda.evaluate([value], scope);
                out.push(value);
            }
            return new TList(out);
        }
    });
    Numbas.jme.lazyOps.push('iterate');
    jme.findvarsOps.iterate = function(tree, boundvars, scope) {
        return jme.findvars_args(fn_iterate.options.make_lambda(tree.args), boundvars, scope);
    }
    jme.substituteTreeOps.iterate = function(tree, scope, allowUnbound) {
        var i = tree.args[0].tok.type == 'lambda' ? 0 : 1;
        tree.args[i + 1] = jme.substituteTree(tree.args[i + 1], scope, allowUnbound);
        tree.args[i + 2] = jme.substituteTree(tree.args[i + 2], scope, allowUnbound);
        return tree;
    }

    set.add_function('iterate_until', ['?', TName, '?', '?', sig.optional(sig.type('number'))], TList, null, {
        make_lambda: function(args, scope) {
            if(args[0].tok.type == 'lambda') {
                return args;
            }
            return [{tok: new TLambda([args[1]], args[0])}, args[2], {tok: new TLambda([args[1]], args[3])}, args[4]];
        },

        evaluate: function(args, scope) {
            args = this.options.make_lambda(args, scope);

            var lambda = args[0].tok;
            var value = scope.evaluate(args[1]);
            var condition = args[2].tok;
            var max_iterations = args[3] ? jme.castToType(scope.evaluate(args[3]), 'number').value : 100;

            var out = [value];

            for(let n = 0;n < max_iterations;n++) {
                var stop = condition.evaluate([value], scope);
                if(!jme.isType(stop, 'boolean')) {
                    throw(new Numbas.Error('jme.iterate_until.condition produced non-boolean', {type: stop.type}));
                } else {
                    stop = jme.castToType(stop, 'boolean');
                    if(stop.value) {
                        break;
                    }
                }
                value = lambda.evaluate([value], scope);
                out.push(value);
            }

            return new TList(out);
        }
    });
    Numbas.jme.lazyOps.push('iterate_until');
    jme.findvarsOps.iterate_until = function(tree, boundvars, scope) {
        return jme.findvars_args(fn_iterate_until.options.make_lambda(tree.args), boundvars, scope);
    }
    jme.substituteTreeOps.iterate_until = function(tree, scope, allowUnbound) {
        tree = {
            tok: tree.tok,
            args: tree.args
        };

        var i = tree.args[0].tok.type == 'lambda' ? 0 : 1;
        tree.args[i + 1] = jme.substituteTree(tree.args[i + 1], scope, allowUnbound);
        if(tree.args[i + 3]) {
            tree.args[i + 3] = jme.substituteTree(tree.args[i + 3], scope.allowUnbound);
        }
        return tree;
    }

    set.add_function('foldl', ['?', TName, TName, '?', TList], '?', null, {
        make_lambda: function(args, scope) {
            if(args[0].tok.type == 'lambda') {
                return args;
            }
            return [{tok: new TLambda([args[1], args[2]], args[0])}, args[3], args[4]];
        },
        evaluate: function(args, scope) {
            args = this.options.make_lambda(args);

            var lambda = args[0].tok;
            var first_value = scope.evaluate(args[1]);
            var list = jme.castToType(scope.evaluate(args[2]), 'list').value;

            var result = list.reduce(function(acc, value) {
                return lambda.evaluate([acc, value], scope);
            }, first_value)
            return result;
        }
    });
    Numbas.jme.lazyOps.push('foldl');
    jme.findvarsOps.foldl = function(tree, boundvars, scope) {
        return jme.findvars_args(fn_foldl.options.make_lambda(tree.args), boundvars, scope);
    }
    jme.substituteTreeOps.foldl = function(tree, scope, allowUnbound) {
        var i = tree.args[0].tok.type == 'lambda' ? 0 : 2;
        tree.args[i + 1] = jme.substituteTree(tree.args[i + 1], scope, allowUnbound);
        tree.args[i + 2] = jme.substituteTree(tree.args[i + 2], scope, allowUnbound);
        return tree;
    }


    set.add_function('take', [TNum, '?', TName, '?'], TList, null, {
        make_lambda: function(args, scope) {
            if(args[1].tok.type == 'lambda') {
                return args;
            }
            return [args[0], {tok: new TLambda([args[2]], args[1])}, args[3]];
        },
        evaluate: function(args, scope) {
            args = this.options.make_lambda(args);

            var n = scope.evaluate(args[0]).value;
            var lambda = args[1].tok;
            var list = args[2];

            list = jme.castToType(scope.evaluate(list), 'list').value;

            var value = [];

            for(let i = 0; i < list.length && value.length < n; i++) {
                var v = list[i];
                var ok = jme.castToType(lambda.evaluate([v], scope), 'boolean').value;
                if(ok) {
                    value.push(v);
                }
            };
            return new TList(value);
        }
    });
    Numbas.jme.lazyOps.push('take');
    jme.findvarsOps.take = function(tree, boundvars, scope) {
        return jme.findvars_args(fn_take.options.make_lambda(tree.args), boundvars, scope);
    }
    jme.substituteTreeOps.take = function(tree, scope, allowUnbound) {
        var list_index = tree.args[1].tok.type == 'lambda' ? 2 : 3;
        var args = tree.args.slice();
        args[0] = jme.substituteTree(args[0], scope, allowUnbound);
        args[list_index] = jme.substituteTree(args[list_index], scope, allowUnbound);
        return {tok:tree.tok, args: args};
    }

    set.add_function('separate', [TList, TLambda], TList, null, {
        evaluate: function(args, scope) {
            var trues = [];
            var falses = [];

            var list = args[0];
            var lambda = args[1];

            list.value.forEach((x) => {
                const b = jme.castToType(lambda.evaluate([x], scope), 'boolean').value;
                (b ? trues : falses).push(x);
            });

            return new TList([new TList(trues), new TList(falses)]);
        }
    });


    /** Is the given token the value `true`?
     *
     * @param {Numbas.jme.token} item
     * @returns {boolean}
     */
    function tok_is_true(item) {
        return item.type == 'boolean' && item.value
    }
    set.add_function('all', [sig.listof(sig.type('boolean'))], TBool, function(list) {
        return list.every(tok_is_true);
    });
    set.add_function('some', [sig.listof(sig.type('boolean'))], TBool, function(list) {
        return list.some(tok_is_true);
    });

});

/*-- Calculus */
builtin_function_set({name: 'calculus', description: 'Calculus'}, (set) => {
    set.add_function('diff', [TExpression, String], TExpression, null, {
        evaluate: function(args, scope) {
            var expr = scope.evaluate(args[0]).tree;
            var name = scope.evaluate(args[1]).value;
            var res = jme.calculus.differentiate(expr, name, scope);
            var ruleset = jme.collectRuleset('all', scope.allRulesets());
            var simplified = jme.display.simplifyTree(res, ruleset, scope);
            return new TExpression(simplified);
        }
    });
    Numbas.jme.lazyOps.push('diff');

});

/*-- Marking */
builtin_function_set({name: 'marking', description: 'Marking utility functions'}, (set) => {
    set.add_function('award', [TNum, TBool], TNum, function(a, b) {
        return (b ? a : 0);
    });

    set.add_function('resultsequal', ['?', '?', TString, TNum], TBool, null, {
        evaluate: function(args, scope) {
            var a = args[0];
            var b = args[1];
            var accuracy = args[3].value;
            var checkingFunction = jme.checkingFunctions[args[2].value.toLowerCase()];
            return new TBool(jme.resultsEqual(a, b, checkingFunction, accuracy, scope));
        }
    });
});


});
