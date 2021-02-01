Numbas.queueScript('base',[],function() {});

Numbas.queueScript('go',['jme','localisation','knockout'],function() {

    ko.bindingHandlers.tex = {
        update: function(element, valueAccessor) {
            var value = ko.unwrap(valueAccessor());
            $(element).html('\\('+value+'\\)');
            if(window.MathJax) {
                MathJax.Hub.Queue(['Typeset',MathJax.Hub,element]);
            }
        }
    }



    function ViewModel() {
        var vm = this;
        this.pattern = ko.observable('');
        this.expression = ko.observable('');
        this.replacement = ko.observable('');
        this.result = ko.observable('');
        this.resultChanged = ko.observable(false);
        this.commutative = ko.observable(true);
        this.associative = ko.observable(true);
        this.strictInverse = ko.observable(false);
        this.allowOtherTerms = ko.observable(true);
        this.gather = ko.observable(true);
        this.replaceAll = ko.observable(false);
        this.error = ko.observable('');

        var localStorageKey = 'jme-matching';

        var saved_properties = ['pattern','expression','replacement','commutative','associative','strictInverse','allowOtherTerms','gather','replaceAll'];
        function save() {
            var d = {};
            saved_properties.forEach(function(k) {
                d[k] = ko.unwrap(vm[k]);
            });
            this.localStorage.setItem(localStorageKey, JSON.stringify(d));
        }
        function load() {
            var d = this.localStorage.getItem(localStorageKey);
            if(d===null) {
                return;
            }
            try { 
                d = JSON.parse(d);
            } catch(e) {
                return;
            }
            saved_properties.forEach(function(k) {
                if(d[k]!==undefined) {
                    vm[k](d[k]);
                }
            });
        }
        load();
        ko.computed(function() {
            save();
        });

        this.patternTeX = ko.computed(function() {
            try {
                var expr = Numbas.jme.rules.patternParser.compile(this.pattern());
                return Numbas.jme.display.texify(expr,{});
            } catch(e) {
                console.log(e);
                return '';
            }
        },this);

        var simplifyRuleset = Numbas.jme.collectRuleset('basic',Numbas.jme.builtinScope.rulesets);

        this.matches = ko.computed(function() {
            console.clear();
            this.result('');
            try {
                var pattern = Numbas.jme.rules.patternParser.compile(this.pattern());
            } catch(e) {
                this.error('Invalid pattern');
                return null;
            }
            try {
                var expression = Numbas.jme.compile(this.expression());
            } catch(e) {
                this.error('Invalid expression');
                return null;
            }
            try {
                var replacement = Numbas.jme.compile(this.replacement());
            } catch(e) {
                this.error('Invalid replacement');
                return null;
            }
            try {
                var options = {commutative: this.commutative(), associative: this.associative(), strictInverse: this.strictInverse(), allowOtherTerms: this.allowOtherTerms(), gatherList: !this.gather(), scope: Numbas.jme.builtinScope};
                var match = Numbas.jme.display.matchTree(pattern,expression,options);
                if(match) {
                    var out = [];
                    for(var name in match) {
                        if(name.match(/^__.*__$/)) {
                            out.push({name: name, expression: match[name]})
                        } else {
                            out.push({
                                name: name,
                                expression: Numbas.jme.display.treeToJME(match[name])
                            });
                        }
                    }
                    this.error('');
                    out.sort(function(a,b){return a.name>b.name});
                } else {
                    this.error('No match');
                }
                if(replacement) {
                    var transform = this.replaceAll() ? Numbas.jme.rules.transformAll : Numbas.jme.rules.transform;
                    var result = transform(pattern,replacement,expression,options);
                    this.resultChanged(result.changed);
                    var resultString = Numbas.jme.display.treeToJME(result.expression,[],Numbas.jme.builtinScope);
                    this.result(resultString);
                }
                return match ? out : null;
            } catch(e) {
                this.error('Error');
                console.log(e);
                console.log(e.stack);
                return null;
            }
        },this).extend({throttle:100});

        this.examples = [
            {
                description: "Sum of two positive numbers",
                pattern: "positive:$n + positive:$n",
                expression: "1+2"
            },
            {
                description: "All brackets expanded",
                pattern: "`! m_anywhere(?*(? + ?`+))",
                expression: "x^2 + 2x + 1"
            },
            {
                description: "Complex number in argument-modulus form",
                pattern: "m_exactly(($n`? `: 1)*e^(((`*/ `+-$n)`*;x)*i))",
                expression: "2e^(pi*i/2)"
            },
            {
                description: "Complex number in Cartesian form",
                pattern: "m_exactly(((`+-real:$n)`? `: 0);re + ((`+-i*real:$n`?)`? `: 0);im)",
                expression: "2i-3"
            },
            {
                description: "Product of 2 or more terms, none of which is equal to 1",
                pattern: " m_nogather(?;factors*?`+;factors `where all(map(not numerical_compare(x,expression(\"1\")),x,factors)))",
                expression: "(x+2)(x+3)"
            },
            {
                description: "A power of 2",
                pattern: "2^?",
                expression: "2^100"
            },
            {
                description: "A polynomial with rational coefficients",
                pattern: "m_exactly(`+- ($n`* / $n`* * ($v);=base^?`? `| $n/$n`?)`* + $z)",
                expression: "1/3 - 2x^2/3 + x^4/6 + 2x^5"
            },
            {
                description: "Sum of terms all over the same denominator",
                pattern: "m_exactly((`+-(?/?;=d))`* + $z)",
                expression: "1/2 -3/2"
            },
            {
                description: "No decimals anywhere except pi",
                pattern: "`!m_anywhere(decimal:$n `& `!pi)",
                expression: "1/2 + x^4 - sin(pi/2)"
            },
            {
                description: "No surds in the denominator",
                pattern: "`+- ? / (`!m_anywhere(sqrt(?) `| ?^(`! `+-integer:$n)))",
                expression: "(x+2*sqrt(5))/(x+4)"
            },
            {
                description: "Sum of fractions, no denominator is 1 and no numerator is 0",
                pattern: "m_nogather(m_gather(`+- (?;tops/?;bottoms));fractions`*+$z) `where len(fractions)>1 and all(map(not numerical_compare(x,expression(\"1\")),x,bottoms)) and all(map(not numerical_compare(x,expression(\"0\")),x,tops))",
                expression: "1/(x+2) - (x+4)/(x^2+6)"
            },
            {
                description: "Get all x terms",
                pattern: "(`+- x^?`?*?`*)`+;xs + ?`*;rest",
                expression: "C+x-x+2x-2x+(a+1)x+x^2+2x^3+(1+2)x^(n+1)-2"
            },
            {
                description: "Get the coefficient and degree of a term",
                pattern: "(`+- ?`* `: 1);coefficient * x^(?`? `: 1);degree",
                expression: "2*(a+1)x^2*3"
            },
            {
                description: "Get both sides of an equation",
                pattern: "?;left=?;right",
                expression: "cos(x)^2 + sin(x)^2 = 1"
            },
            {
                description: "Check x terms are collected on one side",
                pattern: "m_uses(x);xside = (`! m_uses(x));otherside",
                expression: "1=cos(x)^2 + sin(x)^2"
            },
            {
                description: "Factorised quadratic",
                pattern: "((`+- x* ?`*);a + `+- ?;b)*((`+- x * ?`*);c + `+-?;d)",
                expression: "(2x+3)(3-x)"
            },
            {
                description: "Capture multiples of powers of x and y",
                pattern: "(`+-(y^?`?`+ `| ((x^?`?)`+ * (y^?`?)`*)) * ?`*)`*;terms + (?`*);rest",
                expression: "2x*y^2+(2*b)*x+x*y*3+3x^2y^3+c+x^3+3y^2+x+y+3"
            }
        ]

        this.setExample = function(example) {
            vm.pattern(example.pattern);
            vm.expression(example.expression);
            vm.replacement(example.replacement || '');
        }
    }
    var vm = window.vm = new ViewModel();
    ko.applyBindings(vm);
});
