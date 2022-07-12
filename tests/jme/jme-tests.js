Numbas.queueScript('base',[],function() {});
Numbas.queueScript('go',['jme','jme-rules','jme-display','jme-calculus','localisation'],function() {
    var jme = Numbas.jme;
    var math = Numbas.math;
    var types = jme.types;
    var tokenise = jme.tokenise;

    function raisesNumbasError(assert, fn,error,description) {
        assert.throws(fn,function(e){return e.originalMessage == error},description);
    }

    function closeEqual(assert, value,expect,message) {
        if(typeof(expect)=='number' || expect.complex)
        {
            value = Numbas.math.precround(value,10);
            expect = Numbas.math.precround(expect,10);
        }
        return assert.equal(value,expect,message);
    }

    function deepCloseEqual(assert, value,expect,message) {
        if(typeof(expect)=='number' || expect.complex)
        {
            value = Numbas.math.precround(value,10);
            expect = Numbas.math.precround(expect,10);
        }
        return assert.deepEqual(value,expect,message);
    }


    function remove_pos(tree) {
        if(tree.tok) {
            delete tree.tok.pos;
        }
        delete tree.bracketed;
        if(tree.args) {
            tree.args.forEach(function(a) { remove_pos(a) });
        }
        return tree;
    }

    function treesEqual(assert, a, b, message) {
        return deepCloseEqual(assert, remove_pos(a), remove_pos(b), message);
    }

    function tokWithPos(tok,pos) {
        tok.pos = pos;
        return tok;
    }

    QUnit.module('Subvars');
    QUnit.test('splitbrackets',function(assert) {
        assert.deepEqual(Numbas.util.splitbrackets('a','{','}'),['a'],'a');
        assert.deepEqual(Numbas.util.splitbrackets('a{1}','{','}'),['a','1'],'a{1}');
        assert.deepEqual(Numbas.util.splitbrackets('a{{{1}}}','{{{','}}}'),['a','1'],'a{{{1}}} with lb and rb {{{ and }}}');
        assert.deepEqual(Numbas.util.splitbrackets('{1}a','{','}'),['','1','a'],'{1}a');
        assert.deepEqual(Numbas.util.splitbrackets('{1}a{2}','{','}'),['','1','a','2'],'{1}a{2}');
        assert.deepEqual(Numbas.util.splitbrackets('}a','{','}'),['}a'],'}a');
        assert.deepEqual(Numbas.util.splitbrackets('a{{','{','}'),['a{{'],'a{{');
        assert.deepEqual(Numbas.util.splitbrackets('}a{','{','}'),['}a{'],'}a{');
        assert.deepEqual(Numbas.util.splitbrackets('a{1}b{','{','}'),['a','1','b{'],'a{1}b{');
        assert.deepEqual(Numbas.util.splitbrackets('a{b{1}c}d','{','}','[[',']]'),['a','b[[1]]c','d'],'a{b{1}c}d');
        assert.deepEqual(Numbas.util.splitbrackets('{a("{b}"){y}}', '{', '}', '(', ')'), ['','a("{b}")(y)'], '{a("{b}"){y}}');
    });
    QUnit.test('contentsplitbrackets',function(assert) {
        deepCloseEqual(assert, Numbas.util.contentsplitbrackets('{a}$x$'),["{a}","$","x","$"],'return the character before the maths delimiter to the plain text part');
    });
    QUnit.test('subvars',function(assert) {
        assert.equal(Numbas.jme.subvars('{1}a{',Numbas.jme.builtinScope,true),'1a{','Leave unclosed brackets alone');
        assert.equal(Numbas.jme.subvars('e^{-{2}5}',Numbas.jme.builtinScope,true),'e^-10','e^{-{2}5} - Replace nested brackets with parentheses');
        var scope = new Numbas.jme.Scope([Numbas.jme.builtinScope,{variables: {x: new Numbas.jme.types.TNum(2)}}]);
        assert.equal(Numbas.jme.subvars('e^{-{x}x}',scope,true),'e^-4','e^{-{x}x} - Replace nested brackets with parentheses');
        assert.equal(Numbas.jme.subvars('{4/4}x',scope,true),'1x','{4/4}x - Reduce rationals');
        assert.equal(Numbas.jme.subvars('x/{1/2}',scope),'x/(1/2)','x/{1/2} - Brackets round rationals');
        assert.equal(Numbas.jme.subvars('{0.0048000000000000004}',scope),'(0.0048000000000000004)','{0.0048000000000000004} - No scientific notation');
        assert.equal(Numbas.jme.subvars('{split("02(x)02","{x}")}',scope),'[ "0", "(x)0", "" ]','{split("02(x)02","{x}")} - curly braces in a string')
    });

    QUnit.test('findvars',function(assert) {
        deepCloseEqual(assert, Numbas.jme.findvars(Numbas.jme.compile('"{a} $\\\\var{b}$ {c} \\\\[ \\\\simplify{{d}*f} \\\\]"')),['a','b','c','d'],'Findvars finds all variables used in strings');
        deepCloseEqual(assert, Numbas.jme.findvars(Numbas.jme.compile('map(x,x,x)')),['x'],'Can reassign vars used in map but they\'re still found by findvars');
        deepCloseEqual(assert, Numbas.jme.findvars(Numbas.jme.compile('let(x,z,x+y)')),['y','z'],'findvars on let');
        deepCloseEqual(assert, Numbas.jme.findvars(Numbas.jme.compile('let(["x":z],x+y)')),['y','z'],'findvars on let with a dictionary');
        deepCloseEqual(assert, Numbas.jme.findvars(Numbas.jme.compile('let([q,w],[2,3],x,z,x+y+q+w)')),['y','z'],'findvars on let with a sequence of names');
    });

    QUnit.test('findvars in HTML',function(assert) {
        var s = new Numbas.jme.variables.DOMcontentsubber(Numbas.jme.builtinScope);
        var d = document.createElement('div');
        d.innerHTML = '<p>$\\var{x} + \\simplify{f(y)-{y}}$</p><div eval-style="s">{f(c)}</div>';
        var vars = s.findvars(d);
        vars.sort();
        deepCloseEqual(assert, vars,['c','s','x','y']);
    });

    QUnit.test('util',function(assert) {
        deepCloseEqual(assert, Numbas.util.separateThousands(0,','),'0','0');
        deepCloseEqual(assert, Numbas.util.separateThousands(123,','),'123','123');
        deepCloseEqual(assert, Numbas.util.separateThousands(1234,','),'1,234','1234');
        deepCloseEqual(assert, Numbas.util.separateThousands(12345,','),'12,345','12345');
        deepCloseEqual(assert, Numbas.util.separateThousands(123456,','),'123,456','123456');
        deepCloseEqual(assert, Numbas.util.separateThousands(1234567.0123,','),'1,234,567.0123','1234567.0123');
        deepCloseEqual(assert, Numbas.util.separateThousands(-1234567.0123,','),'-1,234,567.0123','-1234567.0123');
        deepCloseEqual(assert, Numbas.util.separateThousands(-1234567.0123,' '),'-1 234 567.0123','-1234567.0123 with space');
    });

    QUnit.module('Compiling');

    QUnit.test('Booleans', function(assert) {
        var t_true = new types.TBool(true);
        t_true.pos = 0
        deepCloseEqual(assert, tokenise('true'),[t_true],'true');
        deepCloseEqual(assert, tokenise('TRUE'),[t_true],'TRUE');
        deepCloseEqual(assert, tokenise('True'),[t_true],'True');
        assert.equal(tokenise('true')[0].value,true,'value is true');

        var t_false = new types.TBool(false);
        t_false.pos = 0
        deepCloseEqual(assert, tokenise('false'),[t_false],'false');
        deepCloseEqual(assert, tokenise('FALSE'),[t_false],'FALSE');
        deepCloseEqual(assert, tokenise('False'),[t_false],'False');
        assert.equal(tokenise('false')[0].value,false,'value is false');
    });
    QUnit.test('Numbers', function(assert) {
        function checkNumber(str,expected) {
            var n = tokenise(str);
            assert.ok(n.length==1,str+' is one token');
            n = n[0];
            expected = /^[0-9]+(?!\x2E)/.exec(str) ? new types.TInt(expected) : new types.TNum(expected);
            assert.equal(n.type,expected.type,str+' is a '+expected.type);
            deepCloseEqual(assert, n.value,expected.value,str+' has the right value');
        }
        checkNumber('0',0);
        checkNumber('0.0',0);

        raisesNumbasError(assert, function(){ tokenise('.1')},'jme.tokenise.invalid near','Invalid: .1');

        checkNumber('1',1);
        checkNumber('1.0023',1.0023);
    });

    QUnit.test('Names',function(assert) {
        deepCloseEqual(assert, tokenise('x'),[tokWithPos(new types.TName('x'),0)],'x');
        deepCloseEqual(assert, tokenise('arg123'),[tokWithPos(new types.TName('arg123'),0)],'arg123');
        deepCloseEqual(assert, tokenise('a1b2'),[tokWithPos(new types.TName('a1b2'),0)],'a1b2');
        deepCloseEqual(assert, tokenise('X'),[tokWithPos(new types.TName('X'),0)],'X');
        deepCloseEqual(assert, tokenise('xyz'),[tokWithPos(new types.TName('xyz'),0)],'xyz');
        deepCloseEqual(assert, tokenise('$x'),[tokWithPos(new types.TName('$x'),0)],'$x');
        deepCloseEqual(assert, tokenise("f'''"),[tokWithPos(new types.TName("f'''"),0)],"f'''");
        deepCloseEqual(assert, tokenise("_"),[tokWithPos(new types.TName("_"),0)],"_");
        deepCloseEqual(assert, tokenise("a_1"),[tokWithPos(new types.TName("a_1"),0)],"a_1");
        deepCloseEqual(assert, tokenise("in_code"),[tokWithPos(new types.TName("in_code"),0)],"in_code");
    });

    QUnit.test('Whitespace',function(assert) {
        var one = new types.TInt(1);
        one.originalValue = '1';
        one.pos = 1;
        deepCloseEqual(assert, tokenise('\u00A01'),[one],'\\u00A01');
        var one = new types.TInt(1);
        one.originalValue = '1';
        one.pos = 0;
        deepCloseEqual(assert, tokenise('1        '),[one],'1       (whitespace at end of expression)');
        deepCloseEqual(assert, tokenise('a &nbsp; + b'),[tokWithPos(new types.TName('a'),0),tokWithPos(new types.TOp('+',false,false,2,true,true),9),tokWithPos(new types.TName('b'),11)],'a &nbsp; + b (html-escaped space)');
    });

    QUnit.test('Operators', function(assert) {
        deepCloseEqual(assert, tokenise('..'),[tokWithPos(new types.TOp('..'),0)],'..');
        deepCloseEqual(assert, tokenise('#'),[tokWithPos(new types.TOp('#'),0)],'#');
        deepCloseEqual(assert, tokenise('<='),[tokWithPos(new types.TOp('<='),0)],'<=');
        deepCloseEqual(assert, tokenise('>='),[tokWithPos(new types.TOp('>='),0)],'>=');
        deepCloseEqual(assert, tokenise('<>'),[tokWithPos(new types.TOp('<>'),0)],'<>');
        deepCloseEqual(assert, tokenise('&&'),[tokWithPos(new types.TOp('and',false,false,2,true,true),0)],'&&');
        deepCloseEqual(assert, tokenise('||'),[tokWithPos(new types.TOp('or',false,false,2,false,true),0)],'||');
        deepCloseEqual(assert, tokenise('|'),[tokWithPos(new types.TOp('|'),0)],'|');
        deepCloseEqual(assert, tokenise('*'),[tokWithPos(new types.TOp('*',false,false,2,true,true),0)],'*');
        deepCloseEqual(assert, tokenise('+'),[tokWithPos(new types.TOp('+u',false,true,1),0)],'+');
        deepCloseEqual(assert, tokenise('-'),[tokWithPos(new types.TOp('-u',false,true,1),0)],'-');
        deepCloseEqual(assert, tokenise('/'),[tokWithPos(new types.TOp('/u',false,true,1),0)],'/');
        deepCloseEqual(assert, tokenise('^'),[tokWithPos(new types.TOp('^'),0)],'^');
        deepCloseEqual(assert, tokenise('<'),[tokWithPos(new types.TOp('<'),0)],'<');
        deepCloseEqual(assert, tokenise('>'),[tokWithPos(new types.TOp('>'),0)],'>');
        deepCloseEqual(assert, tokenise('='),[tokWithPos(new types.TOp('=',false,false,2,true),0)],'=');
        deepCloseEqual(assert, tokenise('!'),[tokWithPos(new types.TOp('not',false,true,1),0)],'!');
        deepCloseEqual(assert, tokenise('not'),[tokWithPos(new types.TOp('not',false,true,1),0)],'not');
        deepCloseEqual(assert, tokenise('and'),[tokWithPos(new types.TOp('and',false,false,2,true,true),0)],'and');
        deepCloseEqual(assert, tokenise('or'),[tokWithPos(new types.TOp('or',false,false,2,false,true),0)],'or');
        deepCloseEqual(assert, tokenise('isa'),[tokWithPos(new types.TOp('isa'),0)],'isa');
        deepCloseEqual(assert, tokenise('except'),[tokWithPos(new types.TOp('except'),0)],'except');
    });

    QUnit.test('Punctuation',function(assert) {
        deepCloseEqual(assert, tokenise('('),[tokWithPos(new types.TPunc('('),0)],'(');
        deepCloseEqual(assert, tokenise(')'),[tokWithPos(new types.TPunc(')'),0)],')');
        deepCloseEqual(assert, tokenise(','),[tokWithPos(new types.TPunc(','),0)],',');
        deepCloseEqual(assert, tokenise('['),[tokWithPos(new types.TPunc('['),0)],']');
        deepCloseEqual(assert, tokenise(']'),[tokWithPos(new types.TPunc(']'),0)],']');
    });

    QUnit.test('String',function(assert) {
        deepCloseEqual(assert, tokenise('"hi"'),[tokWithPos(new types.TString('hi'),0)],'"hi"');
        deepCloseEqual(assert, tokenise("'hi'"),[tokWithPos(new types.TString('hi'),0)],"'hi'");
        deepCloseEqual(assert, tokenise('""'),[tokWithPos(new types.TString(''),0)],'"" -- empty string');
        deepCloseEqual(assert, tokenise("''"),[tokWithPos(new types.TString(''),0)],"'' -- empty string");

        deepCloseEqual(assert, tokenise('"hi \\"Bob\\""'),[tokWithPos(new types.TString('hi "Bob"'),0)],'"hi \\"Bob\\"" -- escape quotes');
        deepCloseEqual(assert, tokenise("'hi \\'Bob\\''"),[tokWithPos(new types.TString("hi 'Bob'"),0)],"'hi \\'Bob\\'' -- escape quotes");
        deepCloseEqual(assert, tokenise("'hi \\{Bob\\}'"),[tokWithPos(new types.TString("hi \\{Bob\\}"),0)],"'hi \\{Bob\\}' -- keep slashes before braces");

        raisesNumbasError(assert, function() {tokenise('"hi')},'jme.tokenise.invalid near','Invalid: "hi');
        raisesNumbasError(assert, function() {tokenise('hi"')},'jme.tokenise.invalid near','Invalid: hi"');

        deepCloseEqual(assert, tokenise('"hi \\n there"'),[tokWithPos(new types.TString('hi \n there'),0)],'"hi \\n there"');
        deepCloseEqual(assert, tokenise('"hi \\\\n there"'),[tokWithPos(new types.TString('hi \\n there'),0)],'"hi \\\\n there"');
        deepCloseEqual(assert, tokenise('"hi \\\\\\n there"'),[tokWithPos(new types.TString('hi \\\n there'),0)],'"hi \\\\\\n there"');
    });

    QUnit.test('Superscript digits', function(assert) {
        treesEqual(assert, compile('x^2'), compile('x²'));
        treesEqual(assert, compile('x^72'), compile('x⁷²'));
    });
    
    QUnit.test('Superscript formulas', function(assert) {
        treesEqual(assert, compile('x^(5+3)'), compile('x⁵⁺³'));
        treesEqual(assert, compile('x^5+3'), compile('x⁵+3'));
        treesEqual(assert, compile('x^(5+3)'), compile('x⁽⁵⁺³⁾'));
        treesEqual(assert, compile('x^(55-3)'), compile('x⁵⁵⁻³'));
        treesEqual(assert, compile('x^(55-(3)(5))'), compile('x⁵⁵⁻⁽³⁾⁽⁵⁾'));
    });

    QUnit.test('Superscript variables', function(assert) {
        treesEqual(assert, compile('x^i'), compile('xⁱ'));
        treesEqual(assert, compile('x^n'), compile('xⁿ'));
    });

    QUnit.test('Implicit multiplication',function(assert) {
        treesEqual(assert, compile('x 5'),compile('x*5'),'x 5');
        treesEqual(assert, compile('5x'),compile('5*x'),'5x');
        treesEqual(assert, compile('x x'),compile('x*x'),'x x');
        treesEqual(assert, compile('5(x+1)'),compile('5*(x+1)'),'5(x+1)');
        treesEqual(assert, compile('(x+1)(x+2)'),compile('(x+1)*(x+2)'),'(x+1)(x+2)');
    });

    QUnit.test('Invalid expressions',function(assert) {
        raisesNumbasError(assert, function(){tokenise('x.1')},'jme.tokenise.invalid near','Invalid: x.1');
    });

    var compile = function(s){ return jme.compile(s) };

    QUnit.test('jme.shunt',function(assert) {
        raisesNumbasError(assert, function(){ compile('x+') },'jme.shunt.not enough arguments','not enough arguments: x+')
        raisesNumbasError(assert, function(){ compile('!') },'jme.shunt.not enough arguments','not enough arguments: !')
        raisesNumbasError(assert, function(){ compile('f x,y')},'jme.shunt.no left bracket in function','no left bracket in function: f x,y');
        raisesNumbasError(assert, function(){ compile('x]') },'jme.shunt.no left square bracket','no left square bracket: x]');
        raisesNumbasError(assert, function(){ compile('x)') },'jme.shunt.no left bracket','no left bracket: x)');
        raisesNumbasError(assert, function(){ compile('(x') },'jme.shunt.no right bracket','no right bracket: (x');
        raisesNumbasError(assert, function(){ compile('[x,y') },'jme.shunt.no right square bracket','no right square bracket: [x,y');
        raisesNumbasError(assert, function(){ compile('1 2 3') },'jme.shunt.missing operator','missing operator: 1 2 3');
        raisesNumbasError(assert, function(){ compile('["a":1,2]') },'jme.shunt.list mixed argument types','mixed list/dict arguments: ["a":1,2]');
        raisesNumbasError(assert, function(){ compile('[2,"a":1]') },'jme.shunt.list mixed argument types','mixed list/dict arguments: [2,"a":1]');
        treesEqual(assert, compile('[1,2,]'), compile('[1,2]'), 'trailing comma in a list is OK');
        treesEqual(assert, compile('["a":1, "b": 2,]'), compile('["a":1, "b": 2]'), 'trailing comma in a dictionary is OK');
        assert.ok(compile('q(1,["a":1,])'), 'trailing comma in a dictionary which is a second argument is OK');
        raisesNumbasError(assert, function() { compile('f(,)') }, 'jme.shunt.expected argument before comma');
        !Numbas.jme.caseSensitive && assert.equal(compile("true AND true").tok.name,'and','operator names are case insensitive');
    })

    QUnit.test('Chained relations', function(assert) {
        function assert_rewritten(from,to,description) {
            treesEqual(assert, compile(from), compile(to), description || from);
        }
        assert_rewritten('a<b<c', 'a<b and b<c');
        assert_rewritten('a<b=c>d', 'a<b and b=c and c>d');
        assert_rewritten('a=b<c', 'a=b and b<c');
        assert_rewritten('a in b in c', 'a in b and b in c');
        assert_rewritten('a < b <= c > d >= f', 'a<b and b <= c and c > d and d >= f');

    });

    QUnit.test('Expand juxtapositions',function(assert) {
        function expand(expr,options,scope) {
            scope = scope || Numbas.jme.builtinScope;
            var tree = compile(expr);
            return scope.expandJuxtapositions(tree,options);
        }
        treesEqual(assert, expand('xy'), compile('x*y'), 'xy');
        treesEqual(assert, expand('xy',{singleLetterVariables:false}), compile('xy'), 'xy, allow multi-letter variable names');
        treesEqual(assert, expand('g12x'), compile('g_12*x'), 'g12x');
        treesEqual(assert, expand('x\'y'), compile('x\'*y'), 'x\'y');
        treesEqual(assert, expand('ax_yz'), compile('a*x_y*z'), 'ax_yz');
        treesEqual(assert, expand('axy\'z'), compile('a*x*y\'*z'), 'axy\'z');
        treesEqual(assert, expand('pi'), compile('pi'), 'pi');
        treesEqual(assert, expand('pizza'), compile('pi*z*z*a'), 'pizza');
        treesEqual(assert, expand('alpha_1m_xy'), compile('alpha_1*m_x*y'), 'alpha_1m_xy');
        treesEqual(assert, expand('v:abc'), compile('v:a*b*c'), 'v:abc');
        treesEqual(assert, expand('xcos(x)'), compile('x*cos(x)'), 'xcos(x)');
        treesEqual(assert, expand('xsqr(x)'), compile('x*sqrt(x)'), 'xsqr(x)');
        treesEqual(assert, expand('lnabs(x)'), compile('ln(abs(x))'), 'lnabs(x)');
        treesEqual(assert, expand('lnabs(x)',{implicitFunctionComposition:false}), compile('lnabs(x)'), 'lnabs(x), no implicit function composition');
        treesEqual(assert, expand('x(y)'), compile('x*y'), 'x(y)');
        treesEqual(assert, expand('x(y)',{noUnknownFunctions: false}), compile('x(y)'), 'x(y), allow unknown functions');
        treesEqual(assert, expand('xy(z)'), compile('x*y*z'), 'xy(z)');
        treesEqual(assert, expand('xlnabs(x)'), compile('x*ln(abs(x))'), 'xlnabs(x)');
        treesEqual(assert, expand('lnarccos(x)'), compile('ln(arccos(x))'), 'lnarccos(x)');
        treesEqual(assert, expand('lnlnln(x)'), compile('ln(ln(ln(x)))'), 'lnlnln(x)');
        treesEqual(assert, expand('xysincos(x)'), compile('x*y*sin(cos(x))'), 'xysincos(x)');
        treesEqual(assert, expand('x(y,1)'), compile('x(y,1)'), 'x(y,1)');
        treesEqual(assert, expand('ln(y)'), compile('ln(y)'), 'ln(y)');
        treesEqual(assert, expand('f(y)'), compile('f*y'), 'f(y)');
        treesEqual(assert, expand('ln abs(x)'), compile('ln(abs(x))'), 'ln abs(x)');
        treesEqual(assert, expand('ln*abs(x)'), compile('ln(abs(x))'), 'ln*abs(x)');
        treesEqual(assert, expand('x ln abs(x)'), compile('x*ln(abs(x))'), 'x ln abs(x)');
        treesEqual(assert, expand('xy*sin ln abs(x)'), compile('x*y*sin(ln(abs(x)))'), 'xy*sin ln abs(x)');
        treesEqual(assert, expand('5g()'), compile('5*g()'), '5g()');
        treesEqual(assert, expand('xy^z'), compile('x*y^z'), 'xy^z');
        treesEqual(assert, expand('(xy)^z'), compile('(x*y)^z'), '(xy)^z');
        treesEqual(assert, expand('x^yz'), compile('x^y*z'), 'x^yz');
        treesEqual(assert, expand('x^(yz)'), compile('x^(y*z)'), 'x^(yz)');
        treesEqual(assert, expand('xy^ab'), compile('x*y^a*b'), 'xy^ab');
        treesEqual(assert, expand('xy+ab'), compile('x*y+a*b'), 'xy+ab');
        treesEqual(assert, expand('xy/z'), compile('x*y/z'), 'xy/z');
        treesEqual(assert, expand('x/yz'), compile('x/(y*z)'), 'x/yz');
        treesEqual(assert, expand('5xe^(2x+1)'), compile('5*(x*e^(2x+1))'), '5xe^(2x+1)');
        treesEqual(assert, expand('xy!'), compile('x*y!'), 'xy!');
        treesEqual(assert, expand('exp(x)'), compile('exp(x)'), 'exp(x)');

        var s = new Numbas.jme.Scope([Numbas.jme.builtinScope]);
        s.setConstant('e1',{value: s.evaluate('vector(1,0)'), tex: 'e_1'});
        treesEqual(assert, expand('ze1',null,s), compile('z*e1'), 'don\'t add subscripts to known constants');
        treesEqual(assert, expand('ze2 + e2',null,s), compile('z*e_2 + e_2'), 'add subscripts when splitting variable names');
    });

    QUnit.test('Case sensitivity',function(assert) {
        var scope = new Numbas.jme.Scope([Numbas.jme.builtinScope]);
        scope.caseSensitive = true;
        assert.notDeepEqual(scope.parser.compile('X'), scope.parser.compile('x'));
        raisesNumbasError(assert, function(){ scope.evaluate('SIN(1)') },'jme.typecheck.function not defined','function not defined: SIN(1)');
        closeEqual(assert, scope.evaluate('w*W',{w: scope.evaluate('1'), W: scope.evaluate('2')}).value,2,'w/W, w=1, W=2.')
    });
    
    QUnit.module('Evaluating');

    QUnit.test('Numbas.math',function(assert) {
        assert.equal(Numbas.math.countSigFigs('1.10'),3,"math.countSigFigs('1.10')==3");
        assert.equal(Numbas.math.countSigFigs('-1.10'),3,"math.countSigFigs('-1.10')==3");
        assert.equal(Numbas.math.countSigFigs('1.23e6'),3,"math.countSigFigs('1.23e6')==3");
        assert.equal(Numbas.math.countSigFigs('1.23e-6'),3,"math.countSigFigs('1.23e-6')==3");
        assert.equal(Numbas.math.countSigFigs('1.23E6'),3,"math.countSigFigs('1.23e6')==3");
        assert.equal(Numbas.math.countSigFigs('1.23E-6'),3,"math.countSigFigs('1.23e-6')==3");
        assert.equal(Numbas.math.countSigFigs('1.20e6',5),3,"math.countSigFigs('1.20e6',5)==3 (the max setting doesn't have any meaning for E notation)");
        assert.ok(Numbas.math.eq(NaN,NaN),'NaN = NaN');
        assert.notOk(Numbas.math.eq({complex:true,re:1,im:1},{complex:true,re:1,im:2}));
        assert.notOk(Numbas.math.eq(Infinity,1));
        assert.notOk(Numbas.math.eq(1,-Infinity));
    });

    var evaluate = function(t,scope) {
        scope = scope || Numbas.jme.builtinScope;
        if(scope.__proto__!=Numbas.jme.Scope.prototype) {
            scope = new Numbas.jme.Scope([Numbas.jme.builtinScope,scope]);
        }
        return jme.evaluate(t,scope)
    };

    function evaluateNumber(t,scope) {
        var v = evaluate(t,scope);
        return jme.castToType(v,'number').value;
    }

    QUnit.test('jme.typecheck',function(assert) {
        raisesNumbasError(assert, function(){ evaluate('x()') },'jme.typecheck.function not defined','function not defined: x()');
        raisesNumbasError(assert, function(){ evaluate('x+y',new jme.Scope()) },'jme.typecheck.op not defined','op not defined with empty scope: x+y');
        raisesNumbasError(assert, function(){ evaluate('gcd(2)') },'jme.typecheck.no right type definition','no right type definition: gcd(2)');
    });

    QUnit.test('jme.findCompatibleType', function(assert) {
        assert.equal(jme.findCompatibleType('number','number'),'number','number,number -> number');
        assert.equal(jme.findCompatibleType('integer','number'),'number','integer,number -> number');
        assert.equal(jme.findCompatibleType('number','integer'),'number','number,integer -> number');
        assert.equal(jme.findCompatibleType('integer','integer'),'integer','integer,integer -> integer');
        assert.equal(jme.findCompatibleType('number','decimal'),'decimal','number,decimal -> decimal');
        assert.equal(jme.findCompatibleType('integer','decimal'),'decimal','integer,decimal -> decimal');
        assert.equal(jme.findCompatibleType('number','string'),undefined,'number,string -> undefined');
    });

    function getValue(e){ return e.value; }	//mapped on lists to just get the javascript primitives of their elements

    QUnit.test('Number-like types', function(assert) {
        assert.equal(evaluate('1').type,'integer','1 is an integer');
        assert.equal(evaluate('1.0').type,'number','1.0 is a number');
        assert.equal(evaluate('1/2').type,'rational','1/2 is a rational');
        assert.equal(evaluate('1^1').type,'number','1^1 is a number');

        assert.equal(evaluate('1+1.0').type,'number','1+1.0 is a number');
        assert.equal(evaluate('1+dec(1)').type,'decimal','1+dec(1) is a decimal');
        assert.equal(evaluate('dec(1)+dec(1)').type,'decimal','dec(1)+dec(1) is a decimal');
        assert.equal(evaluate('1/2+dec(1)').type,'decimal','1/2+dec(1) is a decimal');
        assert.equal(evaluate('1/6+1/6+1/6+1/6+1/6+1/6=1').value,true,'adding six sixths gives exactly 1');
        assert.equal(evaluate('1/2=0.5').value,true,'1/2=0.5');
        assert.equal(evaluate('1+1/2').type,'rational','1+1/2 produces a rational');

        assert.ok(evaluate('vector([1,dec(1),1/2])'),'vector([1,dec(1),1/2]) - automatic casting of list elements');

        assert.equal(evaluate('1..5 except 2..3').value[0].type, 'integer', '1..5 except 2..3 produces integers');
        assert.equal(evaluate('1..5 except [2,3]').value[0].type, 'integer', '1..5 except [2,3] produces integers');
        assert.equal(evaluate('1..5 except 2').value[0].type, 'integer', '1..5 except 2 produces integers');
        assert.equal(evaluate('1..5#0.5 except 2..3').value[0].type, 'number', '1..5#0.5 except 2..3 produces number');
        assert.equal(evaluate('1.5..3.5 except 2..3').value[0].type, 'number', '1.5..3.5 except 2..3 produces numbers');
        var l = evaluate('[1,6,9.5] except 3..8').value;
        assert.ok(l[0].type=='integer' && l[1].type=='number','[1,6,9.5] except 3..8 preserves original types');
    });

    QUnit.test('jme.inferVariableTypes', function(assert) {
        function inferVariableTypes(expr) {
            return jme.inferVariableTypes(jme.compile(expr), jme.builtinScope);
        }

        deepCloseEqual(assert, inferVariableTypes('x'),{},'x gives nothing');
        deepCloseEqual(assert, inferVariableTypes('1'),{},'1 gives nothing');
        deepCloseEqual(assert, inferVariableTypes('x+x'),{x:'number'},'x+x gives x number');
        deepCloseEqual(assert, inferVariableTypes('x+sin(x)'),{x:'number'},'x+sin(x) gives x number');
        deepCloseEqual(assert, inferVariableTypes('k*det(x)'),{x:'matrix', k:'number'},'k*det(x) gives {x:\'matrix\',k:\'number\'}');
        deepCloseEqual(assert, inferVariableTypes('dot(vector(1,2,3),a)'),{a:'vector'},'dot(vector(1,2,3),a) gives {a:\'vector\'}');
        deepCloseEqual(assert, inferVariableTypes('log(abs(x+1),e) + log(abs(x-1),e)'),{x:'number'},'log(abs(x+1),e) + log(abs(x-1),e) gives x number');
        deepCloseEqual(assert, inferVariableTypes('cross(x+y,vector(z,1,2))'),{x:'vector',y:'vector',z:'number'},'cross(x+y,vector(z,1,2)) gives x vector, y vector, z number');
    });

    QUnit.test('jme.inferExpressionType', function(assert) {
        function inferExpressionType(expr) {
            return jme.inferExpressionType(jme.compile(expr), jme.builtinScope);
        }

        deepCloseEqual(assert, inferExpressionType('1'),'integer','1 gives integer');
        deepCloseEqual(assert, inferExpressionType('pi'),'number','pi gives number');
        deepCloseEqual(assert, inferExpressionType('a*pi'),'number','a*pi gives number');
        deepCloseEqual(assert, inferExpressionType('transpose(pi*z)'),'matrix','det(pi*z) gives matrix');
    });

    QUnit.test('Variables',function(assert) {
        var scope = new Numbas.jme.Scope([Numbas.jme.builtinScope,{variables: {
            x: new types.TNum(1),
            name: new types.TString('Bob')
        }}]);
        closeEqual(assert, evaluate('y',scope).type,'name','undefined variable remains a TName')
        closeEqual(assert, evaluate('x',scope).value,1,'substitute variable x=1')
        closeEqual(assert, evaluate('"hi {name}"',scope).value,'hi Bob','substitute into string');

        var tree = Numbas.jme.substituteTree(Numbas.jme.compile('let(["q":x+1],q+w)'),scope,true);
        var s = Numbas.jme.display.treeToJME(tree);
        closeEqual(assert, s,'let([ "q": ( 1 + 1 ) ],q + w)','Substitute into let')

        var tree = Numbas.jme.substituteTree(Numbas.jme.compile('let([q,w],[x,x+1],z,x,q+w)'),scope,true);
        var s = Numbas.jme.display.treeToJME(tree);
        closeEqual(assert, s,'let([ q, w ],[ 1, 1 + 1 ],z,1,q + w)','Substitute into let')

        deepCloseEqual(assert, evaluate('let(a,1,let(a,2,b,a,b))').value, 2, 'let(a,1,let(a,2,b,a,b))');
        deepCloseEqual(assert, evaluate('let(b,1,let(a,b,b,a+1,b))').value, 2, 'let(b,1,let(a,b,b,a+1,b))');
        deepCloseEqual(assert, evaluate('let(a,1,let(["a":2,"b":a],b))').value, 1, 'let(a,1,let(["a":2,"b":a],b))');

        var expr = Numbas.jme.builtinScope.evaluate('substitute(["c":expression("x+1")],expression("c"))');
        assert.notEqual(expr.tree.tok.type,'expression',"When substituting subexpressions into subexpressions, unwrap them");

        /*
        // Removed while I think about how I want this to work

        var expr = new Numbas.jme.types.TExpression(Numbas.jme.compile('x+1'));
        var expr_scope = new Numbas.jme.Scope([Numbas.jme.builtinScope,{variables:{expr:expr, n: Numbas.jme.builtinScope.evaluate('2')}}]);
        var tree = Numbas.jme.substituteTree(Numbas.jme.compile('expr/n'),expr_scope,true);
        var s = Numbas.jme.display.treeToJME(tree);
        closeEqual(assert, s,'(x + 1)/2','Substitute TExpression')

        var expr = new Numbas.jme.types.TExpression(Numbas.jme.compile('x+n'));
        var expr_scope = new Numbas.jme.Scope([Numbas.jme.builtinScope,{variables:{expr:expr, n: Numbas.jme.builtinScope.evaluate('2')}}]);
        var tree = Numbas.jme.substituteTree(Numbas.jme.compile('expr/n'),expr_scope,true);
        var s = Numbas.jme.display.treeToJME(tree);
        closeEqual(assert, s,'(x + 2)/2','Substitute TExpression - substitution into sub-expression')

        */
    });

    QUnit.test('Literals',function(assert) {
        closeEqual(assert, evaluate('1').value,1,'1');
        closeEqual(assert, evaluate('true').value,true,'true');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('1..3')),[1,3,1],'1..3');
        deepCloseEqual(assert, evaluate('[1,2]').value.map(getValue),[1,2],'[1,2]');
        deepCloseEqual(assert, evaluate('[1,"hi",true]').value.map(getValue),[1,"hi",true],'[1,"hi",true]');
        closeEqual(assert, evaluate('"hi"').value,'hi','"hi"');
        closeEqual(assert, evaluate("'hi'").value,'hi',"'hi'");
        closeEqual(assert, evaluate('x').type,'name','x');
    });

    QUnit.test('Safe strings',function(assert) {
        assert.equal(evaluate('safe("a")').value,'a','safe("a")');
        assert.ok(evaluate('safe("a")').safe,'safe("a") is safe');
        assert.equal(evaluate('safe(safe("a"))').value,'a','safe(safe("a"))');
    });

    QUnit.test('Operator precedence',function(assert) {
        closeEqual(assert, evaluateNumber('2*3!'),12,'factorial highest: 2*3! = 2*(3!)');
        closeEqual(assert, evaluateNumber('(2*3)!'),6*5*4*3*2,'brackets work: (2*3)! = 6!');
        closeEqual(assert, evaluateNumber('2^1^2'),2,'exponentiation is right-associative: 2^1^2 = 2^(1^2)');
        closeEqual(assert, evaluateNumber('2*3^2'),18,'exponentation before multiplication: 2*3^2 = 2*(3^2)');
        closeEqual(assert, evaluateNumber('5*4+3*2'),26,'multiplication before addition: 5*4+3*2 = (5*4)+(3*2)');
        closeEqual(assert, evaluateNumber('5/4+3/2'),2.75,'division before addition: 5/4+3/2 = (5/4)+(3/2)');
        closeEqual(assert, evaluateNumber('5*4/3-5/3*4'),0,'multiplication and division equal precedence: 5*4/3 = 5/3*4');
        closeEqual(assert, evaluateNumber('1/2/3'),1/6,'division is left-associative: 1/2/3 = (1/2)/3');
        closeEqual(assert, evaluateNumber('5-+2'),3,'unary addition: 5-+2 = 5-2');
        closeEqual(assert, evaluateNumber('5--2'),7,'unary minus: 5--2 = 5+2');
        closeEqual(assert, evaluateNumber('3*2^-1'),1.5,'unary minus with power');
        closeEqual(assert, evaluateNumber('3+--2'),5,'lots of unary minus in a chain');
        closeEqual(assert, evaluateNumber('-2^2'),-4,'unary minus before a power');
        closeEqual(assert, evaluateNumber('-2+3'),1,'unary minus before addition');
        deepCloseEqual(assert, evaluate('-vector(1,2,-3.3)').value,[-1,-2,3.3],'unary minus: -vector(1,2,-3.3)==vector(-1,-2,3.3)');
        deepCloseEqual(assert, evaluate('-matrix([1,0],[2,3])').value,[[-1,0],[-2,-3]],'unary minus: -matrix([1,0],[2,3])==matrix([-1,0],[-2,-3]))');
        assert.ok(evaluate('1+2*3|7^2'),'"divides" after arithmetic');
        closeEqual(assert, evaluate('1+2..5').start,3,'arithmetic before range .. operator: 1+2..5 = (1+2)..5');
        closeEqual(assert, evaluate('1..5#2').step,2,'range step operator');
        assert.ok(evaluate('1..2 except 3'),'except operator');
        assert.ok(evaluate('1+2<2+3'),'comparison operator lower than arithmetic: 1+2<2+3 = (1+2)<(2+3)');
        assert.ok(evaluate('1<2=2<3'),'equality after inequality');
        assert.ok(evaluate('1<2 && 3<4'),'AND after comparisons');
        closeEqual(assert, evaluate('true or false and false').value,true,'OR after AND');
        closeEqual(assert, evaluate('true xor true or true').value,false,'XOR after OR');
        assert.ok(evaluate('1/-7'),'unary operation straight after a binary operation');
        closeEqual(assert, evaluate('3!+4!').value,30,'3!+4!=30; postfix operators interact with binary operators properly');
    });

    QUnit.test('Synonyms',function(assert) {
        closeEqual(assert, evaluate('5!=fact(5)').value,true,'x! == fact(x)');
        closeEqual(assert, evaluate('true and true = true & true = true && true').value,true,'true == & == &&');
        closeEqual(assert, evaluate('1|5 = 1 divides 5').value,true,'x|y == x divides y');
        closeEqual(assert, evaluate('true||false = true or false').value,true,'x||y == x or y');
        closeEqual(assert, evaluate('sqr(2) = sqrt(2)').value,true,'sqr == sqrt');
        closeEqual(assert, evaluate('gcf(2,3) = gcd(2,3)').value,true,'gcf == gcd');
        closeEqual(assert, evaluate('sgn(4) = sign(4)').value,true,'sgn == sign');
        closeEqual(assert, evaluate('len(32) = abs(32) and length(32) = abs(32)').value,true,'len == length == abs');
        assert.ok(jme.compile('length+1'),'length as a variable name');
        closeEqual(assert, evaluate('2ˆ3').value,8,'2ˆ3 - modifier circumflex');
    });

    QUnit.test('Types (isa)',function(assert) {
        closeEqual(assert, evaluate('1 isa "number"').value,true,'1 isa "number"');
        closeEqual(assert, evaluate('1 isa "complex"').value,false,'1 isa "complex"');
        closeEqual(assert, evaluate('i isa "complex"').value,true,'i isa "complex"');
        closeEqual(assert, evaluate('1+i isa "complex"').value,false,'1+i isa "complex"');
        closeEqual(assert, evaluate('"1" isa "number"').value,false,'"1" isa "number"');
        closeEqual(assert, evaluate('"1" isa "string"').value,true,'"1" isa "string"');
        closeEqual(assert, evaluate('[] isa "list"').value,true,'[] isa "list"');
        closeEqual(assert, evaluate('xy isa "name"').value,true,'xy isa "name"');
    });

    QUnit.test('Arithmetic',function(assert) {
        closeEqual(assert, evaluateNumber('+2'),2,'+2');
        closeEqual(assert, evaluateNumber('-2'),-2,'-2');
        closeEqual(assert, evaluateNumber('1+2'),3,'1+2');
        deepCloseEqual(assert, evaluateNumber('i+1'),math.complex(1,1),'i+1');
        deepCloseEqual(assert, evaluate('[1,2]+[3,4]').value.map(getValue),[1,2,3,4],'[1,2]+[3,4]');
        deepCloseEqual(assert, evaluate('[1,2]+3').value.map(getValue),[1,2,3],'[1,2]+3');
        deepCloseEqual(assert, evaluate('["x","y"]+"z"').value.map(getValue),['x','y','z'],'["x","y"]+"z"');
        closeEqual(assert, evaluate('"hi "+"there"').value,'hi there','"hi"+" there"');
        closeEqual(assert, evaluate('"n: "+1').value,'n: 1','"n: "+1');
        closeEqual(assert, evaluate('2+" things"').value,'2 things','2+" things"');
        deepCloseEqual(assert, evaluate('vector(1,2)+vector(2,3)').value,[3,5],'vector(1,2)+vector(2,3)');
        deepCloseEqual(assert, evaluate('matrix([1,0],[0,1])+matrix([0,1],[1,0])').value,[[1,1],[1,1]],'matrix([1,0],[0,1])+matrix([0,1],[1,0])');
        closeEqual(assert, evaluateNumber('3-13'),-10,'3-13');
        deepCloseEqual(assert, evaluate('vector(1,2)-vector(5,5)').value,[-4,-3],'vector(1,2)-vector(5,5)');
        deepCloseEqual(assert, evaluate('matrix([1,0],[0,1])-matrix([2,1],[2,1])').value,[[-1,-1],[-2,0]],'matrix([1,0],[0,1])-matrix([2,1],[2,1])');
        closeEqual(assert, evaluateNumber('5*4'),20,'5*4');
        closeEqual(assert, evaluateNumber('i*i'),-1,'i*i');
        deepCloseEqual(assert, evaluate('5*vector(1,2)').value,[5,10],'5*vector(1,2)');
        deepCloseEqual(assert, evaluate('vector(1,2)*5').value,[5,10],'vector(1,2)*5');
        deepCloseEqual(assert, evaluate('matrix([1,1],[3,2])*vector(1,2)').value,[3,7],'matrix([1,1],[3,2])*vector(1,2)');
        deepCloseEqual(assert, evaluate('5*matrix([1,0],[0,1])').value,[[5,0],[0,5]],'5*matrix([1,0],[0,1])');
        deepCloseEqual(assert, evaluate('matrix([1,0],[0,1])*5').value,[[5,0],[0,5]],'matrix([1,0],[0,1])*5');
        deepCloseEqual(assert, evaluate('matrix([1,2],[1,1])*matrix([2,3],[4,5])').value,[[10,13],[6,8]],'matrix([1,2],[1,1])*matrix([2,3],[4,5])');
        closeEqual(assert, evaluateNumber('5/2'),2.5,'5/2');
        deepCloseEqual(assert, evaluateNumber('5/(1+i)'),math.complex(2.5,-2.5),'5/(1+i)');
        deepCloseEqual(assert, evaluateNumber('(1+i)/5'),math.complex(0.2,0.2),'(1+i)/5');
        deepCloseEqual(assert, evaluateNumber('(1+i)/(2-i)'),math.complex(0.2,0.6),'(1+i)/(2+i)');
        closeEqual(assert, evaluateNumber('2^4'),16,'2^4');
        closeEqual(assert, evaluateNumber('(-6)^2'),36,'(-6)^2 - see https://github.com/numbas/examples/issues/4');
        deepCloseEqual(assert, evaluateNumber('(1+i)^0'),1,'(1+i)^0');
        deepCloseEqual(assert, evaluateNumber('(1+i)^5'),math.complex(-4,-4),'(1+i)^5');
        deepCloseEqual(assert, evaluateNumber('(1+i)^6'),math.complex(0,-8),'(1+i)^6');
        deepCloseEqual(assert, evaluateNumber('(1+i)^(-2)'),math.complex(0,-0.5),'(1+i)^(-2)');
        deepCloseEqual(assert, evaluateNumber('(1+i)^(-3)'),math.complex(-0.25,-0.25),'(1+i)^(-3)');
        deepCloseEqual(assert, evaluateNumber('2^i'),math.complex(0.7692389013639721,0.6389612763136348),'2^i');
        assert.equal(evaluateNumber('e^0.9'),evaluateNumber('exp(0.9)'),'e^0.9 == exp(0.9)');
        assert.ok(Numbas.jme.builtinScope.evaluate('iszero(dec(e)-exp(dec(1)))').value,'dec(e) uses more accurate e than Math.E');
        assert.notOk(Numbas.jme.builtinScope.evaluate('iszero(dec(e)-exp(1))').value,'dec(e) uses more accurate e than Math.E');
        assert.ok(Numbas.jme.builtinScope.evaluate('iszero(dec(pi)-arccos(dec(-1)))').value,'dec(pi) uses more accurate pi than Math.PI');
        assert.notOk(Numbas.jme.builtinScope.evaluate('iszero(dec(pi)-arccos(-1))').value,'dec(pi) uses more accurate pi than Math.PI');
        deepCloseEqual(assert, evaluateNumber('dec(1+2i)/dec(3+4i)'),math.complex(11/25,2/25),'dec(1+2i)/(3+4i)');
    });

    QUnit.test('Logic',function(assert) {
        closeEqual(assert, evaluate('0<2').value,true,'0<2');
        closeEqual(assert, evaluate('2<0').value,false,'2<0');
        closeEqual(assert, evaluate('0<-0').value,false,'0<0');
        closeEqual(assert, evaluate('0>2').value,false,'0>2');
        closeEqual(assert, evaluate('2>0').value,true,'2>0');
        closeEqual(assert, evaluate('0>-0').value,false,'0>0');

        raisesNumbasError(assert, function(){ evaluate('1<i') },'math.order complex numbers',"can't order complex numbers");
        raisesNumbasError(assert, function(){ evaluate('i>1') },'math.order complex numbers',"can't order complex numbers");
        raisesNumbasError(assert, function(){ evaluate('i<=1') },'math.order complex numbers',"can't order complex numbers");
        raisesNumbasError(assert, function(){ evaluate('1>=i') },'math.order complex numbers',"can't order complex numbers");

        assert.equal(evaluate('dec(1005.31)>=1005.31').value,true,'dec(1005.31)>=1005.31');
        assert.equal(evaluate('dec(1005.31)<=1005.31').value,true,'dec(1005.31)<=1005.31');

        closeEqual(assert, evaluate('1=1').value,true,'1=1');
        closeEqual(assert, evaluate('1/5=0.2').value,true,'1/5=0.2');
        closeEqual(assert, evaluate('"abcdef"=\'abcdef\'').value,true,'"abcdef"=\'abcdef\'');
        closeEqual(assert, evaluate('"abcdef"=" abcdef "').value,false,'"abcdef"=" abcdef "');
        closeEqual(assert, evaluate('"abcdef"="ABCDEF"').value,false,'"abcdef"="ABCDEF"');
        closeEqual(assert, evaluate('"<b>abcdef</b>"="*abcdef*"').value,false,'"<b>abcdef</b>="*abcdef*"');
        closeEqual(assert, evaluate('true=true').value,true,'true=true');
        closeEqual(assert, evaluate('false=false').value,true,'false=false');
        closeEqual(assert, evaluate('true=false').value,false,'true=false');
        closeEqual(assert, evaluate('[0,1,2]=[0,1,2]').value,true,'[0,1,2]=[0,1,2]');
        closeEqual(assert, evaluate('[0,4,2]=[0,1,2]').value,false,'[0,4,2]=[0,1,2]');
        closeEqual(assert, evaluate('[0,1,2]=[0,1,2,3]').value,false,'[0,1,2]=[0,1,2,3]');
        closeEqual(assert, evaluate('0..4=0..4#1').value,true,'0..4=0..4#1');
        closeEqual(assert, evaluate('0..4=0..4#2').value,false,'0..4=0..4#2');
        closeEqual(assert, evaluate('0="0"').value,false,'0="0"');
        closeEqual(assert, evaluate('a=a').value,true,'a=a');
        closeEqual(assert, evaluate('0<>1').value,true,'0<>1');
        closeEqual(assert, evaluate('1<>1').value,false,'0<>1');

        closeEqual(assert, evaluate('not true').value,false,'not true');
        closeEqual(assert, evaluate('not false').value,true,'not false');

        closeEqual(assert, evaluate('true and false').value,false,'true and false');
        closeEqual(assert, evaluate('false and true').value,false,'false and true');
        closeEqual(assert, evaluate('true and true').value,true,'true and true');
        closeEqual(assert, evaluate('false and false').value,false,'false and false');

        closeEqual(assert, evaluate('true or false').value,true,'true or false');
        closeEqual(assert, evaluate('false or true').value,true,'false or true');
        closeEqual(assert, evaluate('true or true').value,true,'true or true');
        closeEqual(assert, evaluate('false or false').value,false,'false or false');

        closeEqual(assert, evaluate('true xor false').value,true,'true xor false');
        closeEqual(assert, evaluate('false xor true').value,true,'false xor true');
        closeEqual(assert, evaluate('true xor true').value,false,'true xor true');
        closeEqual(assert, evaluate('false xor false').value,false,'false xor false');

        closeEqual(assert, evaluate('NaN=NaN').value,true,'nan=NaN');
    });

    QUnit.test('Annotations',function(assert) {
        closeEqual(assert, evaluate('dot:x=x').value,false,'dot:x=x');
        closeEqual(assert, evaluate('dot:bar:x=bar:dot:x').value,false,'dot:bar:x=bar:dot:x');
        assert.throws(function(){ evaluate('dot:sin(1)') }, 'dot:sin(1) - dot:sin is not defined');
    })

    QUnit.test('Number functions',function(assert) {
        closeEqual(assert, evaluate('abs(-5.4)').value,5.4,'abs(-5.4)');
        closeEqual(assert, evaluate('abs(1+i)').value,Math.sqrt(2),'abs(1+i)');
        closeEqual(assert, evaluate('abs([1,2,3,4])').value,4,'abs([1,2,3,4])');
        closeEqual(assert, evaluate('abs(1..5)').value,5,'abs(1..5)');
        closeEqual(assert, evaluate('abs(1..5#1.2)').value,4,'abs(1..5#1.2)');
        closeEqual(assert, evaluate('abs(1..4#0)').value,3,'abs(1..4#0)');
        closeEqual(assert, evaluate('abs(dec(3))').value.toNumber(),3,'abs(dec(3))')
        closeEqual(assert, evaluate('abs(vector(3,4))').value,5,'abs(vector(3,4))');
        closeEqual(assert, evaluate('abs(vector(3,4,5,5,5))').value,10,'abs(vector(3,4,5,5,5))');
        closeEqual(assert, evaluate('arg(1+i)').value,Math.PI/4,'arg(1+i)');
        closeEqual(assert, evaluate('arg(-1-i)').value,-3*Math.PI/4,'arg(1+i)');
        closeEqual(assert, evaluate('arg(0)').value,0,'arg(0)');
        closeEqual(assert, evaluate('arg(1)').value,0,'arg(1)');

        closeEqual(assert, evaluate('re(1)').value,1,'re(1)');
        closeEqual(assert, evaluate('re(i)').value,0,'re(i)');
        closeEqual(assert, evaluate('re(5+6i)').value,5,'re(5+6i)');
        closeEqual(assert, evaluate('im(1)').value,0,'im(1)');
        closeEqual(assert, evaluate('im(i)').value,1,'im(i)');
        closeEqual(assert, evaluate('im(5+6i)').value,6,'im(5+6i)');
        closeEqual(assert, evaluate('conj(1)').value,1,'conj(1)');
        deepCloseEqual(assert, evaluate('conj(i)').value,math.complex(0,-1),'conj(i)');
        deepCloseEqual(assert, evaluate('conj(5+6i)').value,math.complex(5,-6),'conj(5+6i)');

        closeEqual(assert, evaluate('isint(0)').value,true,'isint(0)');
        closeEqual(assert, evaluate('isint(542)').value,true,'isint(542)');
        closeEqual(assert, evaluate('isint(-431)').value,true,'isint(-431)');
        closeEqual(assert, evaluate('isint(4/3)').value,false,'isint(4/3)');
        closeEqual(assert, evaluate('isint(-43.1)').value,false,'isint(-43.1)');
        closeEqual(assert, evaluate('isint(5i)').value,false,'isint(5i)');

        closeEqual(assert, evaluate('degrees(0)').value,0,'degrees(0)');
        closeEqual(assert, evaluate('degrees(pi)').value,180,'degrees(pi)');
        closeEqual(assert, evaluate('degrees(1)').value,57.29577951308232,'degrees(1)');
        closeEqual(assert, evaluate('degrees(5.5*pi)').value,990,'degrees(5.5*pi)');
        deepCloseEqual(assert, evaluate('degrees(pi*i)').value,math.complex(0,180),'degrees(pi*i)');

        closeEqual(assert, evaluate('sign(54)').value,1,'sign(54)');
        closeEqual(assert, evaluate('sign(0.5)').value,1,'sign(0.5)');
        closeEqual(assert, evaluate('sign(0)').value,0,'sign(0)');
        closeEqual(assert, evaluate('sign(-43)').value,-1,'sign(-43)');
        deepCloseEqual(assert, evaluate('sign(4-i)').value,math.complex(1,-1),'sign(4-i)');

        closeEqual(assert, evaluate('award(5,true)').value,5,'award(5,true)');
        closeEqual(assert, evaluate('award(5,false)').value,0,'award(5,true)');
    });

    QUnit.test('resultsequal', function(assert) {
        assert.equal(evaluate('resultsequal(dec("0.00001"),dec("0.00002"),"absdiff",0.001)').value,true,'resultsequal(dec("0.00001"),dec("0.00002"),"absdiff",0.001)');
        assert.equal(evaluate('resultsequal(dec("0.1"),dec("0.2"),"absdiff",0.001)').value,false,'resultsequal(dec("0.1"),dec("0.2"),"absdiff",0.001)');
    });

    QUnit.test('Number theory/combinatorics',function(assert) {
        deepCloseEqual(assert, evaluate('mod(0,0)').value,NaN,'mod(0,0)');
        deepCloseEqual(assert, evaluate('mod(5,0)').value,NaN,'mod(5,0)');
        closeEqual(assert, evaluate('mod(13,2)').value,1,'mod(13,2)');
        closeEqual(assert, evaluate('mod(4.765,3)').value,1.765,'mod(4.765,3)');
        closeEqual(assert, evaluate('mod(-13,6)').value,5,'mod(-13,6)');
        closeEqual(assert, evaluate('mod(2.4,1.1)').value,0.2,'mod(2.4,1.1)');

        closeEqual(assert, evaluate('perm(5,4)').value,120,'perm(5,4)');
        closeEqual(assert, evaluate('perm(6,1)').value,6,'perm(6,1)');
        raisesNumbasError(assert, function() {evaluate('perm(2,3)')},'math.permutations.n less than k','n less than k: perm(2,3)');
        raisesNumbasError(assert, function() {evaluate('perm(-2,3)')},'math.permutations.n less than zero','n less than zero: perm(-2,3)');
        raisesNumbasError(assert, function() {evaluate('perm(2,-3)')},'math.permutations.k less than zero','k less than zero: perm(2,-3)');
        raisesNumbasError(assert, function() {evaluate('perm(i,1)')},'math.permutations.complex',"error: can't compute permutations of complex numbers: perm(i,1)");
        raisesNumbasError(assert, function() {evaluate('perm(1,i)')},'math.permutations.complex',"error: can't compute permutations of complex numbers: perm(1,i)");

        closeEqual(assert, evaluate('comb(5,4)').value,5,'comb(5,4)');
        closeEqual(assert, evaluate('comb(6,1)').value,6,'comb(6,1)');
        closeEqual(assert, evaluate('comb(7,3)').value,35,'comb(6,1)');
        raisesNumbasError(assert, function() {evaluate('comb(2,3)')},'math.combinations.n less than k','n less than k: comb(2,3)');
        raisesNumbasError(assert, function() {evaluate('comb(-2,3)')},'math.combinations.n less than zero','n less than zero: comb(-2,3)');
        raisesNumbasError(assert, function() {evaluate('comb(2,-3)')},'math.combinations.k less than zero','k less than zero: comb(2,-3)');
        raisesNumbasError(assert, function() {evaluate('comb(i,1)')},'math.combinations.complex',"error: can't compute combinations of complex numbers: comb(i,1)");
        raisesNumbasError(assert, function() {evaluate('comb(1,i)')},'math.combinations.complex',"error: can't compute combinations of complex numbers: comb(1,i)");

        closeEqual(assert, evaluate('gcd(36,15)').value,3,'gcd(36,15)');
        closeEqual(assert, evaluate('gcd(1.1,15)').value,1,'gcd(1.1,15)');
        closeEqual(assert, evaluate('gcd(-60,18)').value,6,'gcd(-60,18)');
        closeEqual(assert, evaluate('gcd(60,-18)').value,6,'gcd(60,-18)');
        closeEqual(assert, evaluate('gcd(0,3)').value,3,'gcd(0,3)');
        closeEqual(assert, evaluate('gcd(0,-3)').value,3,'gcd(0,-3)');
        closeEqual(assert, evaluate('gcd(3,0)').value,3,'gcd(3,0)');
        closeEqual(assert, evaluate('gcd(infinity,15)').value,1,'gcd(infinity,15)');
        raisesNumbasError(assert, function(){ evaluate('gcd(2i,4)') },'math.gcf.complex',"can't take gcf of complex numbers: gcf(2i,4)");

        closeEqual(assert, evaluate('coprime(2,3)').value,true,'coprime(2,3)');
        closeEqual(assert, evaluate('coprime(2,-3)').value,true,'coprime(2,-3)');
        closeEqual(assert, evaluate('coprime(2,i)').value,true,'coprime(2,i)');
        closeEqual(assert, evaluate('coprime(2,4)').value,false,'coprime(2,4)');
        closeEqual(assert, evaluate('coprime(2,-4)').value,false,'coprime(2,-4)');
        closeEqual(assert, evaluate('coprime(1,3)').value,true,'coprime(1,3)');
        closeEqual(assert, evaluate('coprime(1,1)').value,true,'coprime(1,1)');

        closeEqual(assert, evaluate('lcm(3,7)').value,21,'lcm(3,7)');
        closeEqual(assert, evaluate('lcm(4,6)').value,12,'lcm(4,12)');
        closeEqual(assert, evaluate('lcm(-10,35)').value,70,'lcm(-10,35)');
        raisesNumbasError(assert, function(){ evaluate('lcm(2,i)') },'math.lcm.complex',"can't find lcm of complex numbers: lcm(2,i)");

        closeEqual(assert, evaluate('5|25').value,true,'5|25');
        closeEqual(assert, evaluate('6|42').value,true,'6|42');
        closeEqual(assert, evaluate('4|42').value,false,'4|42');
        closeEqual(assert, evaluate('-4|40').value,true,'-4|40');
        closeEqual(assert, evaluate('4|-40').value,true,'4|-40');
        closeEqual(assert, evaluate('i|2i').value,false,'i|2i');
    });

    QUnit.test('Is scalar multiple', function(assert) {
        // normal case
        var u = [1,2,3];
        var v = [2,4,6];
        var is_scalar = Numbas.math.is_scalar_multiple(u,v);
        assert.equal(is_scalar, true);

        // float case to test rel
        u = [1.01,2.01,3.01];
        v = [2,4,6];
        is_scalar = Numbas.math.is_scalar_multiple(u,v);
        assert.equal(is_scalar, false);

        // float case to test rel
        u = [1.00001,2.00001,3.00001];
        v = [2,4,6];
        is_scalar = Numbas.math.is_scalar_multiple(u,v,0.001,0.001);
        assert.equal(is_scalar, true);

        // float case to test rel
        u = [1.01,2.01,3.01];
        v = [2,4,6];
        is_scalar = Numbas.math.is_scalar_multiple(u,v,0.1,0.1);
        assert.equal(is_scalar, true);

        // corner case: empty scalar
        u = [];
        v = [];
        is_scalar = Numbas.math.is_scalar_multiple(u,v);
        assert.equal(is_scalar, false);

        // corner case: zero value
        u = [1,0,2];
        v = [2,0,4];
        is_scalar = Numbas.math.is_scalar_multiple(u,v);
        assert.equal(is_scalar, true);

        // corner case: head zero value
        u = [0,0,2];
        v = [0,0,4];
        is_scalar = Numbas.math.is_scalar_multiple(u,v);
        assert.equal(is_scalar, true);

    });

    QUnit.test('Ordering numbers', function(assert) {
        closeEqual(assert, evaluate('min(3,5)').value,3,'min(3,5)');
        closeEqual(assert, evaluate('min(54,1.5654)').value,1.5654,'min(54,1.5654)');
        closeEqual(assert, evaluate('min(-32,4)').value,-32,'min(-32,4)');
        raisesNumbasError(assert, function(){ evaluate('min(i,1+i)') },'math.order complex numbers',"can't order complex numbers: min(i,1+i)");

        closeEqual(assert, evaluate('min([3,1,-5,-2])').value,-5,'min([3,1,-5,-2])');

        closeEqual(assert, evaluate('max(3,5)').value,5,'max(3,5)');
        closeEqual(assert, evaluate('max(54,1.5654)').value,54,'max(54,1.5654)');
        closeEqual(assert, evaluate('max(-32,4)').value,4,'max(-32,4)');
        raisesNumbasError(assert, function(){ evaluate('max(i,1+i)') },'math.order complex numbers',"can't order complex numbers: max(i,1+i)");

        closeEqual(assert, evaluate('max([3,1,-5,-2])').value,3,'max([3,1,-5,-2])');

        closeEqual(assert, evaluate('max(1/2, 1/3)').value+'', '1/2', 'max(1/2, 1/3)');
        closeEqual(assert, evaluate('min(1/2, 1/3)').value+'', '1/3', 'min(1/2, 1/3)');
        closeEqual(assert, evaluate('max([12/18,-43/67, 3/4,1/2])').value+'', '3/4', 'max([12/18,-43/67, 3/4,1/2])');
        closeEqual(assert, evaluate('min([12/18,-43/67, 3/4,1/2])').value+'', '-43/67', 'min([12/18,-43/67, 3/4,1/2])');

        assert.equal(evaluate('max([dec(0),dec(1)])').type,'decimal');
        assert.equal(evaluate('min([dec(0),dec(1)])').type,'decimal');
        assert.equal(evaluate('max(dec(0),dec(1))').type,'decimal');
        assert.equal(evaluate('min(dec(0),dec(1))').type,'decimal');

        raisesNumbasError(assert, function() { evaluate('min(decimal(2)i, decimal(0))'); }, 'math.order complex numbers');
        raisesNumbasError(assert, function() { evaluate('max(decimal(2)i, decimal(0))'); }, 'math.order complex numbers');
        raisesNumbasError(assert, function() { evaluate('min([decimal(2)i, decimal(0)])'); }, 'math.order complex numbers');
        raisesNumbasError(assert, function() { evaluate('max([decimal(2)i, decimal(0)])'); }, 'math.order complex numbers');
    });

    QUnit.test('Rounding',function(assert) {
        closeEqual(assert, evaluate('radians(0)').value,0,'radians(0)');
        closeEqual(assert, evaluate('radians(180)').value,Math.PI,'radians(180)');
        closeEqual(assert, evaluate('radians(1080)').value,6*Math.PI,'radians(1080)');
        deepCloseEqual(assert, evaluate('radians(90+360i)').value,math.complex(Math.PI/2,2*Math.PI),'radians(90+360i)');

        closeEqual(assert, evaluate('ceil(0.1)').value,1,'ceil(0.1)');
        closeEqual(assert, evaluate('ceil(532.9)').value,533,'cei(532.9)');
        closeEqual(assert, evaluate('ceil(0)').value,0,'ceil(0)');
        closeEqual(assert, evaluate('ceil(-14.6)').value,-14,'ceil(-14.6)');
        deepCloseEqual(assert, evaluate('ceil(1.7-2.3i)').value,math.complex(2,-2),'ceil(1.7-2.3i)');

        closeEqual(assert, evaluate('floor(0.1)').value,0,'floor(0.1)');
        closeEqual(assert, evaluate('floor(532.9)').value,532,'cei(532.9)');
        closeEqual(assert, evaluate('floor(0)').value,0,'floor(0)');
        closeEqual(assert, evaluate('floor(-14.6)').value,-15,'floor(-14.6)');
        deepCloseEqual(assert, evaluate('floor(1.2i)').value,math.complex(0,1),'floor(1.2i)');

        closeEqual(assert, evaluate('trunc(0)').value,0,'trunc(0)');
        closeEqual(assert, evaluate('trunc(5)').value,5,'trunc(5)');
        closeEqual(assert, evaluate('trunc(14.3)').value,14,'trunc(14.3)');
        closeEqual(assert, evaluate('trunc(-4.76)').value,-4,'trunc(-4.76)');
        deepCloseEqual(assert, evaluate('trunc(0.5+4.75i)').value,math.complex(0,4),'trunc(0.5+4.75i)');

        closeEqual(assert, evaluate('fract(0)').value,0,'fract(0)');
        closeEqual(assert, evaluate('fract(5)').value,0,'fract(5)');
        closeEqual(assert, evaluate('fract(14.3)').value,0.3,'fract(14.3)');
        closeEqual(assert, evaluate('fract(-4.76)').value,-0.76,'fract(-4.76)');
        deepCloseEqual(assert, evaluate('fract(0.5+4.75i)').value,math.complex(0.5,0.75),'fract(0.5+4.75i)');

        closeEqual(assert, evaluate('round(0)').value,0,'round(0)');
        closeEqual(assert, evaluate('round(12321)').value,12321,'round(12321)');
        closeEqual(assert, evaluate('round(1.4)').value,1,'round(1.4)');
        closeEqual(assert, evaluate('round(4.9)').value,5,'round(4.5)');
        closeEqual(assert, evaluate('round(11.5)').value,12,'round(11.5)');
        closeEqual(assert, evaluate('round(-3.2)').value,-3,'round(-3.2)');
        closeEqual(assert, evaluate('round(-3.5)').value,-3,'round(-3.5)');
        closeEqual(assert, evaluate('round(-50)').value,-50,'round(-50)');
        deepCloseEqual(assert, evaluate('round(1.4-6.7i)').value,math.complex(1,-7),'round(1.4-6.7i)');

        assert.equal(evaluate('precround(1.1234567891011121314151617181920,0)').value,1,'precround(1.1234567891011121314151617181920,0) - round to integer');
        assert.equal(evaluate('precround(1.1234567891011121314151617181920,1)').value,1.1,'precround(1.1234567891011121314151617181920,1) - round to 1 d.p.');
        assert.equal(evaluate('precround(1.1234567891011121314151617181920,5)').value,1.12346,'precround(1.1234567891011121314151617181920,5) - round to 5 d.p. - should round up');
        assert.equal(evaluate('precround(1.1234567891011121314151617181920,20)').value,1.12345678910111213142,'precround(1.1234567891011121314151617181920,20)');
        assert.equal(evaluate('precround(1.9999,3)').value,2,'precround(1.9999,3) - round to 3 dp results in integer');
        assert.equal(evaluate('precround(-132.6545,3)').value,-132.654,'precround(-132.6545,3) - round on 5 in negative number rounds up');
        assert.equal(evaluate('precround(123456789012,8)').value,123456789012,'precround(123456789012,8) - only multiply fractional part, to get better precision');
        assert.equal(evaluate('precround(4+488/1000,3)').value,4.488,'precround(4+488/1000,3) - try not to add floating point error in the middle of precround');
        assert.equal(evaluate('precround(0.05,2)').value,0.05,'precround(0.05,2)');
        assert.equal(evaluate('precround(-0.05,2)').value,-0.05,'precround(-0.05,2)');
        assert.equal(evaluate('precround(-2.51,0)').value,-3,'precround(-2.51,0)');

        assert.equal(evaluate('precround(237.55749999999998,3)').value,237.558,'precround(237.55749999999998,3)==237.558');
        assert.equal(evaluate('precround(237.55748999999998,3)').value,237.557,'precround(237.55748999999998,3)==237.557');
        assert.equal(evaluate('precround(-237.55750000000001,3)').value,-237.557,'precround(-237.55750000000001,3)==-237.557');
        assert.equal(evaluate('precround(-237.55751000000001,3)').value,-237.558,'precround(-237.55751000000001,3)==-237.558');

        assert.equal(evaluate('siground(0.123,2)').value,0.12,'siground(0.123,2)');
        assert.equal(evaluate('siground(123456.123456,3)').value,123000,'siground(123456.123456,3)');
        assert.equal(evaluate('siground(-32.45,3)').value,-32.5,'siground(-32.45,3)');
        assert.equal(evaluate('siground(-32452,2)').value,-32000,'siground(-32452,2)');
        assert.equal(evaluate('siground(-2.51,1)').value,-3,'siground(-2.51,1)');
        assert.equal(evaluate('siground(14515200,3)').value,14500000,'siground(14515200,3)');

        assert.equal(evaluate('siground(1/7,3)').type,'decimal','siground(1/7,3) is a decimal');
        assert.ok(evaluate('fract(siground(1/7,2)*100)=0').value, 'fract(siground(1/7,2)*100)=0');
    });

    QUnit.test('Currency',function(assert) {
        assert.equal(evaluate('currency(2.01,"£","p")').value,'£2.01','currency(2.01,"£","p")');
        assert.equal(evaluate('currency(2.00001,"£","p")').value,'£2','currency(2.00001,"£","p")');
        assert.equal(evaluate('currency(2.999,"£","p")').value,'£3','currency(2.999,"£","p")');
        assert.equal(evaluate('currency(0.999,"£","p")').value,'£1','currency(0.999,"£","p")');
        assert.equal(evaluate('currency(0.99,"£","p")').value,'99p','currency(0.99,"£","p")');
    });

    QUnit.test('Random numbers',function(assert) {
        var acc = true;
        for(var i=0;i<10;i++) {
            acc &= [1,2,3,4,5].contains(evaluate('random(1..5)').value);
        }
        assert.equal(acc,true,'random(1..5) in [1,2,3,4,5]');
        assert.equal(evaluate('random(1..1)').value,1,'random(1..1) = 1');
        raisesNumbasError(assert, function(){ evaluate('random([])') },'math.choose.empty selection','empty selection: random([])');
        acc = true;
        for(i=0;i<10;i++) {
            acc &= ['a','b','c'].contains(evaluate('random(["a","b","c"])').value);
        }
        assert.equal(acc,true,'random(["a","b","c"]) in ["a","b","c"]');

        acc = true;
        for(var i=0;i<10;i++) {
            acc &= [1,2,'a'].contains(evaluate('random(1,2,"a")').value);
        }
        assert.equal(acc,true,'random(1,2,"a") in [1,2,"a"]');

        var x = evaluate('random(1..3#0)').value;
        assert.ok(x>=1 && x<=3,'random(1..3#0)')

        raisesNumbasError(assert, function(){ evaluate('random()') },'math.choose.empty selection','empty selection: random()');

        deepCloseEqual(assert, evaluate('deal(4)').value.map(getValue).sort(),[0,1,2,3],'deal(4)');

        assert.equal(evaluate('random(1..5)').type,'integer','random(1..5) produces an integer');
        assert.equal(evaluate('random(1..5#3)').type,'integer','random(1..5#3) produces an integer');
        assert.equal(evaluate('random(1..5#0.5)').type,'number','random(1..5#0.5) produces a number');
    });

    QUnit.test('Exponentials',function(assert) {
        closeEqual(assert, evaluate('sqrt(2)').value,Math.sqrt(2),'sqrt(2)');
        deepCloseEqual(assert, evaluate('sqrt(-1)').value,math.complex(0,1),'sqrt(-1)');
        deepCloseEqual(assert, evaluate('sqrt(-49)').value,math.complex(0,7),'sqrt(-49');
        deepCloseEqual(assert, evaluate('sqrt(1+2i)').value,math.complex(1.272019649514068964,0.786151377757423286069),'sqrt(1+2i)');

        closeEqual(assert, evaluate('ln(e)').value,1,'ln(e)');
        closeEqual(assert, evaluate('ln(1)').value,0,'ln(1)');
        deepCloseEqual(assert, evaluate('ln(-2)').value,math.complex(Math.log(2),Math.PI),'ln(-2)');
        deepCloseEqual(assert, evaluate('ln(2+i)').value,math.complex(Math.log(Math.sqrt(5)),Math.atan(0.5)),'ln(2+i)');
        closeEqual(assert, evaluate('log(10)').value,1,'');
        deepCloseEqual(assert, evaluate('log(2+i)').value,math.complex(Math.LOG10E*Math.log(Math.sqrt(5)),Math.LOG10E*Math.atan(0.5)),'log(2+i)');
        closeEqual(assert, evaluate('exp(5)').value,Math.exp(5),'exp(5)');
        closeEqual(assert, evaluate('exp(-2)').value,Math.exp(-2),'exp(-2)');
        deepCloseEqual(assert, evaluate('exp(4-i)').value,math.complex(Math.exp(4)*Math.cos(-1),Math.exp(4)*Math.sin(-1)),'exp(4-i)');

        closeEqual(assert, evaluate('fact(0)').value,1,'fact(0)');
        closeEqual(assert, evaluate('fact(1)').value,1,'fact(1)');
        closeEqual(assert, evaluate('fact(6)').value,720,'fact(6)');
        closeEqual(assert, evaluate('fact(1/2)').value,0.8862269255,'fact(1/2)');
        closeEqual(assert, evaluate('fact(-3/2)').value,-3.5449077018 ,'fact(-3/2)');
        deepCloseEqual(assert, evaluate('fact(i)').value,math.complex(0.4980156681,-0.1549498283),'fact(i)');

        closeEqual(assert, evaluate('root(8,3)').value,2,'root(8,3)');
        deepCloseEqual(assert, evaluate('root(-81,4)').value,-3,'root(-81,4)');
        closeEqual(assert, evaluate('root(4,1.2)').value,3.174802103936399,'root(4,1.2)');
        deepCloseEqual(assert, evaluate('root(i,-2)').value,math.complex(0.7071067811865476,-0.7071067811865476),'root(i,-2)');
    });

    QUnit.test('Trigonometry',function(assert) {
        closeEqual(assert, evaluate('sin(0)').value,0,'sin(0)');
        closeEqual(assert, evaluate('sin(pi/2)').value,1,'sin(pi/2)');
        deepCloseEqual(assert, evaluate('sin(i)').value,math.complex(0,1.175201193643801456882381),'sin(i)');
        closeEqual(assert, evaluate('cos(0)').value,1,'cos(0)');
        closeEqual(assert, evaluate('cos(pi/2)').value,0,'cos(pi/2)');
        deepCloseEqual(assert, evaluate('cos(i)').value,1.5430806348152437784779,'cos(i)');

        closeEqual(assert, evaluate('tan(0)').value,0,'tan(0)');
        closeEqual(assert, evaluate('tan(pi/4)').value,1,'tan(pi/4)');
        deepCloseEqual(assert, evaluate('tan(i)').value,math.complex(0,0.761594155955764888),'tan(i)');

        closeEqual(assert, evaluate('cosec(pi/4)').value,Math.sqrt(2),'cosec(pi/4)');
        deepCloseEqual(assert, evaluate('cosec(i)').value,math.complex(0,-0.850918128239321545133),'cosec(i)');
        closeEqual(assert, evaluate('sec(pi/4)').value,Math.sqrt(2),'sec(pi/4)');
        closeEqual(assert, evaluate('sec(i)').value,1/1.5430806348152437784779,'sec(i)');
        closeEqual(assert, evaluate('cot(1)').value,0.6420926159343307,'cot(1)');
        deepCloseEqual(assert, evaluate('cot(i)').value,math.complex(0,-1.313035285499331303),'cot(i)');

        closeEqual(assert, evaluate('arcsin(0.5)').value,Math.PI/6,'arcsin(0.5)');
        deepCloseEqual(assert, evaluate('arcsin(i*sinh(1))').value,math.complex(0,1),'arcsin(i*sinh(1))');
        deepCloseEqual(assert, evaluate('arcsin(2)').value,math.complex(1.5707963267948966,-1.31695789692481),'arcsin(2)');
        closeEqual(assert, evaluate('arccos(0.5)').value,Math.PI/3,'arccos(0.5)');
        deepCloseEqual(assert, evaluate('arccos(cosh(1))').value,math.complex(0,1),'arccos(cosh(1))');
        closeEqual(assert, evaluate('arctan(1/sqrt(3))').value,Math.PI/6,'arctan(1/sqrt(3))');
        deepCloseEqual(assert, evaluate('arctan(i*tanh(1))').value,math.complex(0,1),'arctan(i*tanh(1))');

        closeEqual(assert, evaluate('sinh(1)').value,Math.E/2-1/(2*Math.E),'sinh(1)');
        closeEqual(assert, evaluate('sinh(ln(2))').value,3/4,'sinh(ln(2))');
        deepCloseEqual(assert, evaluate('sinh(2i)').value,math.complex(0,Math.sin(2)),'sinh(2i)');
        closeEqual(assert, evaluate('cosh(1)').value,Math.E/2+1/(2*Math.E),'cosh(1)');
        closeEqual(assert, evaluate('cosh(ln(3))').value,5/3,'cosh(ln(3))');
        closeEqual(assert, evaluate('cosh(-i)').value,Math.cos(1),'cosh(-i)');
        closeEqual(assert, evaluate('tanh(1)').value,0.7615941559557648,'tanh(1)');
        closeEqual(assert, evaluate('tanh(ln(5))').value,12/13,'tanh(ln(5))');
        deepCloseEqual(assert, evaluate('tanh(1+i)').value,math.complex(1.08392332733869454,0.27175258531951171652),'tanh(1+i)');
        closeEqual(assert, evaluate('cosech(ln(3))').value,3/4,'cosech(ln(3))');
        closeEqual(assert, evaluate('sech(ln(2))').value,4/5,'');
        closeEqual(assert, evaluate('coth(5)').value,1.000090803982019,'coth(5)');
        closeEqual(assert, evaluate('arcsinh(7)').value,2.644120761058629075,'arcsinh(7)');
        closeEqual(assert, evaluate('arccosh(8)').value,2.7686593833135738,'arccosh(8)');
        deepCloseEqual(assert, evaluate('arctanh(1+i)').value,math.complex(0.40235947810852507,1.0172219678978514),'arctanh(1+i)');
    });


    QUnit.test('Vector and Matrix operations',function(assert) {
        closeEqual(assert, evaluate('dot(vector(1,2),vector(2,3))').value,8,'dot(vector(1,2),vector(2,3))');
        closeEqual(assert, evaluate('dot(matrix([1],[2],[3]),vector(6,5,4))').value,28,'dot(matrix([1],[2],[3]),vector(6,5,4))');
        closeEqual(assert, evaluate('dot(vector(6,5,4),matrix([1],[2],[3]))').value,28,'dot(vector(6,5,4),matrix([1],[2],[3]))');
        closeEqual(assert, evaluate('dot(matrix([1],[2],[3]),matrix([1],[2],[3]))').value,14,'dot(matrix([1],[2],[3]),matrix([1],[2],[3]))');
        deepCloseEqual(assert, evaluate('cross(vector(1,2,3),vector(5,6,7))').value,[-4,8,-4],'cross(vector(1,2,3),vector(5,6,7))');
        deepCloseEqual(assert, evaluate('cross(vector(1,2,3),matrix([5,6,7]))').value,[-4,8,-4],'cross(vector(1,2,3),matrix([5,6,7]))');
        deepCloseEqual(assert, evaluate('cross(matrix([1,2,3]),vector(5,6,7))').value,[-4,8,-4],'cross(matrix([1,2,3]),vector(5,6,7))');
        closeEqual(assert, evaluate('det(matrix([2,4],[3,5]))').value,-2,'det(matrix([2,4],[3,5]))');
        raisesNumbasError(assert, function(){ evaluate('det(matrix([2,4,6],[3,5,7]))') },'matrixmath.abs.non-square','error on non-square matrix: det(matrix([2,4,6],[3,5,7]))');
        raisesNumbasError(assert, function(){ evaluate('det(matrix([1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]))') },'matrixmath.abs.too big',"can't work out determinants of big matrices: det(matrix([1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]))");
        closeEqual(assert, evaluate('sum_cells(matrix([1,2],[3,4]))').value, 10, 'sum_cells(matrix([1,2],[3,4]))');
        deepCloseEqual(assert, evaluate('transpose(vector(1,2,3))').value,[[1,2,3]],'transpose(vector(1,2,3))');
        deepCloseEqual(assert, evaluate('transpose(matrix([1,2,3]))').value,[[1],[2],[3]],'transpose(matrix([1,2,3]))');
        deepCloseEqual(assert, evaluate('transpose(matrix([1],[2],[3]))').value,[[1,2,3]],'transpose(matrix([1],[2],[3]))');
        deepCloseEqual(assert, evaluate('transpose(transpose(matrix([1,2,3])))').value,[[1,2,3]],'transpose(transpose(matrix([1,2,3])))');
        deepCloseEqual(assert, evaluate('id(1)').value,[[1]],'id(1)');
        deepCloseEqual(assert, evaluate('id(2)').value,[[1,0],[0,1]],'id(2)');
        deepCloseEqual(assert, evaluate('id(3)').value,[[1,0,0],[0,1,0],[0,0,1]],'id(3)');
        deepCloseEqual(assert, evaluate('id(4)').value,[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],'id(4)');
        deepCloseEqual(assert, evaluate('vector(1,2)*matrix([[1,2],[3,4]])').value,[7,10],'vector*matrix');

        deepCloseEqual(assert, evaluate('combine_vertically(matrix([[1,2], [3,4]]), matrix([[5,6]]))').value,[[1,2], [3,4], [5,6]],'combine_vertically no padding');
        deepCloseEqual(assert, evaluate('combine_vertically(matrix([[1,2], [3,4]]), matrix([[5]]))').value,[[1,2], [3,4], [5,0]],'combine_vertically padding');
        deepCloseEqual(assert, evaluate('combine_vertically(matrix([[1,2], [3,4]]), matrix([[5,6,7]]))').value,[[1,2,0], [3,4,0], [5,6,7]],'combine_vertically padding');
        deepCloseEqual(assert, evaluate('type(combine_vertically(matrix([[1,2], [3,4]]), matrix([[5,6]])))').value,"matrix",'type(combine_vertically)');
        deepCloseEqual(assert, evaluate('numrows(combine_vertically(matrix([[1,2], [3,4]]), matrix([[5,6]])))').value,3,'numrows(combine_vertically)');
        deepCloseEqual(assert, evaluate('numcolumns(combine_vertically(matrix([[1,2], [3,4]]), matrix([[5,6]])))').value,2,'numcolumns(combine_vertically)');
        
        deepCloseEqual(assert, evaluate('combine_horizontally(matrix([[1,2], [3,4]]), matrix([[5],[6]]))').value,[[1,2,5], [3,4,6]],'combine_horizontally no padding');
        deepCloseEqual(assert, evaluate('combine_horizontally(matrix([[1,2], [3,4]]), matrix([[5]]))').value,[[1,2,5], [3,4,0]],'combine_horizontally padding');
        deepCloseEqual(assert, evaluate('combine_horizontally(matrix([[1,2], [3,4]]), matrix([[5],[6],[7]]))').value,[[1,2,5], [3,4,6], [0,0,7]],'combine_horizontally padding');
        deepCloseEqual(assert, evaluate('type(combine_horizontally(matrix([[1,2], [3,4]]), matrix([[5,6]])))').value,"matrix",'type(combine_horizontally)');
        deepCloseEqual(assert, evaluate('numrows(combine_horizontally(matrix([[1,2], [3,4]]), matrix([[5,6]])))').value,2,'numrows(combine_horizontally)');
        deepCloseEqual(assert, evaluate('numcolumns(combine_horizontally(matrix([[1,2], [3,4]]), matrix([[5,6]])))').value,4,'numcolumns(combine_horizontally)');
         
        deepCloseEqual(assert, evaluate('combine_diagonally(matrix([[1]]), matrix([[2]]))').value,[[1,0],[0,2]],'combine_diagonally: two 1×1 matrices');
        deepCloseEqual(assert, evaluate('combine_diagonally(matrix([[1,2,3]]), matrix([[4],[5],[6]]))').value,[[1,2,3,0],[0,0,0,4],[0,0,0,5],[0,0,0,6]],'combine_diagonally: row with column');
        deepCloseEqual(assert, evaluate('combine_diagonally(matrix([[1],[2],[3]]), matrix([[4,5,6]]))').value,[[1,0,0,0],[2,0,0,0],[3,0,0,0],[0,4,5,6]],'combine_diagonally: column with row');
        deepCloseEqual(assert, evaluate('combine_diagonally(matrix([[1,2,0,0], [3,4,0,0]]), matrix([[0,0,5,6]]))').value,[[1,2,0,0,0,0,0,0],[3,4,0,0,0,0,0,0],[0,0,0,0,0,0,5,6]],'combine_diagonally');
        deepCloseEqual(assert, evaluate('combine_diagonally(matrix([[1,2,0,0], [3,4,0,0]]), matrix([[0,0,5,0]]))').value,[[1,2,0,0,0,0,0,0],[3,4,0,0,0,0,0,0],[0,0,0,0,0,0,5,0]],'combine_diagonally');
        deepCloseEqual(assert, evaluate('combine_diagonally(id(1),id(1))=id(2)').value, true, 'combine_diagonally(id(1),id(1))');
        deepCloseEqual(assert, evaluate('type(combine_diagonally(id(1),id(1)))').value, 'matrix', 'type(combine_diagonally(id(1),id(1)))');
        deepCloseEqual(assert, evaluate('numrows(combine_diagonally(id(1),id(1)))').value, 2, 'numrows(combine_diagonally(id(1),id(1)))');
        deepCloseEqual(assert, evaluate('numcolumns(combine_diagonally(id(1),id(1)))').value, 2, 'numcolumns(combine_diagonally(id(1),id(1)))');

        var m1 = [[1]];
        m1.rows = 1;
        m1.columns = 1;
        var mv = Numbas.matrixmath.combine_vertically(m1,m1);
        var mh = Numbas.matrixmath.combine_horizontally(m1,m1);
        var md = Numbas.matrixmath.combine_diagonally(m1,m1);
        m1[0][0] = 2;
        assert.deepEqual(mv, [[1],[1]], 'combine_vertically: input not mutated');
        assert.deepEqual(mh, [[1,1]], 'combine_horizontally: input not mutated');
        assert.deepEqual(md, [[1,0],[0,1]], 'combine_diagonally: input not mutated');
    });

    QUnit.test('Range operations',function(assert) {
        deepCloseEqual(assert, evaluate('1..5').value,[1,5,1],'1..5');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('list(1..5)')),[1,2,3,4,5],'list(1..5)');
        deepCloseEqual(assert, evaluate('1..7#2').value,[1,7,2],'1..#7#2');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('list(1..7#2)')),[1,3,5,7],'list(1..#7#2)');
        deepCloseEqual(assert, evaluate('-2..3#2').value,[-2,3,2],'-2..3#2');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('list(-2..3#2)')),[-2,0,2],'list(-2..3#2)');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('list(100..102#1/3)')),[100,100+1/3,100+2/3,101,101+1/3,101+2/3,102],'list(100..102#1/3)');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('list(6..1#-1)')),[6,5,4,3,2,1],'list(6..1#-1)');

        deepCloseEqual(assert, evaluate('1..2#0').value,[1,2,0],'1..2#0');

        deepCloseEqual(assert, evaluate('-3..7 except 0..3').value.map(getValue),[-3,-2,-1,4,5,6,7],'-3..7 except 0..3');
        deepCloseEqual(assert, evaluate('-3..7 except 0.5..3.5').value.map(getValue),[-3,-2,-1,0,1,2,3,4,5,6,7],'-3..7 except 0.5..3.5');
        deepCloseEqual(assert, evaluate('-3..7 except 0.5..3.5#0').value.map(getValue),[-3,-2,-1,0,4,5,6,7],'-3..7 except 0.5..3.5#0');
        raisesNumbasError(assert, function(){ evaluate('0..5#0 except 1..3') },'jme.func.except.continuous range',"can't use except on continuous range: 0..5#0 except 1..3");

        deepCloseEqual(assert, evaluate('-3..7 except 4').value.map(getValue),[-3,-2,-1,0,1,2,3,5,6,7],'-3..7 except 4');
        deepCloseEqual(assert, evaluate('-3..7 except 4.5').value.map(getValue),[-3,-2,-1,0,1,2,3,4,5,6,7],'-3..7 except 4.5');
        raisesNumbasError(assert, function(){ evaluate('0..1#0 except 0.5') },'jme.func.except.continuous range',"can't use except on continuous range: 0..1#0 except 0.5");

        deepCloseEqual(assert, evaluate('-2..11 except [1,2,3,5,8]').value.map(getValue),[-2,-1,0,4,6,7,9,10,11],'-2..11 except [1,2,3,5,8]');
        deepCloseEqual(assert, evaluate('-2..11 except []').value.map(getValue),[-2,-1,0,1,2,3,4,5,6,7,8,9,10,11],'-2..11 except []');
        deepCloseEqual(assert, evaluate('-2..2 except [1,"a",0]').value.map(getValue),[-2,-1,2],'-2..2 except [1,"a",0]');
        raisesNumbasError(assert, function(){ evaluate('0..5#0 except 1..3') },'jme.func.except.continuous range',"can't use except on continuous range: 0..5#0 except 1..3");

        deepCloseEqual(assert, evaluate('-11 in -9..9').value,false,'-11 not in -9..9');
        deepCloseEqual(assert, evaluate('3 in -9..9#0').value,true,'3 in -9..9#0');
        

    });


    QUnit.test('List operations',function(assert) {
        deepCloseEqual(assert, evaluate('["a","b","c"] except "a"').value.map(getValue),['b','c'],'["a","b","c"] except "a"');
        deepCloseEqual(assert, evaluate('["a","b","c"] except ["a","c","f"]').value.map(getValue),['b'],'["a","b","c"] except ["a","c","f"]');
        deepCloseEqual(assert, evaluate('["a","b","c","d","e"][0..2]').value.map(getValue),['a','b'],'["a","b","c","d","e"][0..2]');
        deepCloseEqual(assert, evaluate('["a","b","c","d","e"][0..5#2]').value.map(getValue),['a','c','e'],'["a","b","c","d","e"][0..5#2]');

        assert.equal(evaluate("all([])").value,true,"all([])");
        assert.equal(evaluate("all([true])").value,true,"all([true])");
        assert.equal(evaluate("all([false])").value,false,"all([false])");
        assert.equal(evaluate("all([true,false])").value,false,"all([true,false])");
        assert.equal(evaluate("all([false,true])").value,false,"all([false,true])");
        assert.equal(evaluate("all([true,true])").value,true,"all([true,true])");

        assert.equal(evaluate("some([])").value,false,"some([])");
        assert.equal(evaluate("some([true])").value,true,"some([true])");
        assert.equal(evaluate("some([false])").value,false,"some([false])");
        assert.equal(evaluate("some([true,false])").value,true,"some([true,false])");
        assert.equal(evaluate("some([false,true])").value,true,"some([false,true])");
        assert.equal(evaluate("some([true,true])").value,true,"some([true,true])");
        assert.equal(evaluate("some([false,false])").value,false,"some([false,false])");

        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort([1,2,3])")),[1,2,3],"sort([1,2,3])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort([2,1,3])")),[1,2,3],"sort([2,1,3])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort([expression('5'),expression('3')])")).map(function(t){return t.tok.value}),[3,5],"sort([expression('5'),expression('3')])");

        deepCloseEqual(assert,jme.unwrapValue(evaluate('sort([2,1 as "number"])')),[1,2],'sort(2,1 as "number")');
        deepCloseEqual(assert,jme.unwrapValue(evaluate('sort([1/2, 1/4, 1/2, 1/4])')).map(function(n){return n.toFloat()}),[0.25,0.25,0.5,0.5],'sort([1/2,1/4,1/2,1/4])');

        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_destinations([1,2,3])")),[0,1,2],"sort_destinations([1,2,3])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_destinations([2,1,3])")),[1,0,2],"sort_destinations([2,1,3])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_destinations([expression('5'),expression('3')])")),[1,0],"sort_destinations([expression('5'),expression('3')])");

        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_by(0,[[0,5], [1,3]])")),[[0,5], [1,3]],"sort_by(0,[[0,5],[1,3]])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_by(1,[[0,5], [1,3]])")),[[1,3], [0,5]],"sort_by(1,[[0,5],[1,3]])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_by(2,[[0,5], [1,3]])")),[[0,5], [1,3]],"sort_by(2,[[0,5],[1,3]])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_by(2,[[0,5], [1,3,2]])")),[[1,3,2], [0,5]],"sort_by(2,[[0,5],[1,3,2]])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_by('a',[['a':0,'b':5], ['a':1,'b':3]])")),[{a:0,b:5}, {a:1,b:3}],"sort_by('a',[['a':0,'b':5],['a':1,'b':3]])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_by('b',[['a':0,'b':5], ['a':1,'b':3]])")),[{a:1,b:3}, {a:0,b:5}],"sort_by('b',[['a':0,'b':5],['a':1,'b':3]])");
        deepCloseEqual(assert,jme.unwrapValue(evaluate("sort_by('c',[['a':0,'b':5], ['c':1,'b':3]])")),[{c:1,b:3}, {a:0,b:5}],"sort_by('c',[['a':0,'b':5],['a':1,'b':3]])");

        raisesNumbasError(assert, function() { evaluate("dict(2)"); }, 'jme.typecheck.no right type definition','dict(2)');
        raisesNumbasError(assert, function() { evaluate('dict(["a",1])'); }, 'jme.typecheck.no right type definition','dict(["a",1])');

        assert.equal(evaluate('sum([])').value,0,'sum([])');
        assert.equal(evaluate('sum([1,2,3])').value,6,'sum([1,2,3])');
        assert.equal(evaluate('prod([])').value,1,'prod([])');
        assert.equal(evaluate('prod([2,3,4])').value,24,'prod([2,3,4])');
        raisesNumbasError(assert, function() { evaluate('sum(["a","b"])') },'jme.typecheck.no right type definition','sum(["a","b"])');
    });

    QUnit.test('Dictionaries',function(assert) {
        assert.ok(compile('["a": -1]','prefix operation as value of dictionary item'));
        deepCloseEqual(assert, evaluate('["a": 1]["a"]').value,1,'["a": 1]["a"] = 1');
        deepCloseEqual(assert, evaluate('dict("a": 1, "b": 2)["a"]').value,1,'dict("a": 1, "b": 2)["a"] = 1');
        raisesNumbasError(assert, function() { evaluate('["a": 1]["b"]') }, 'jme.func.listval.key not in dict', '["a": 1]["b"]');
        deepCloseEqual(assert, evaluate('keys( ["a": 1, "b": 2] )').value.map(getValue), ['a','b'],'keys( ["a":1,"b": 2] )');
        deepCloseEqual(assert, evaluate('values( ["a": 1, "b": 2] )').value.map(getValue), [1,2],'values( ["a":1,"b": 2] )');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('items( ["a": 1, "b": 2] )')), [['a',1],['b',2]],'items( ["a":1,"b": 2] )');
        assert.equal(evaluate('"a" in ["a": 1]').value,true,'"a" in ["a": 1]');
        assert.equal(evaluate('"b" in ["a": 1]').value,false,'"b" in ["a": 1]');
        assert.equal(evaluate('"__proto__" in dict()').value,false,'"__proto__" in dict()');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('["a":1,"b":2]+["a":4,"c":3]')),{a:4,b:2,c:3},'["a":1,"b":2]+["a":4,"c":3]');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('map(let(bits,x,["a":bits]),x,[1,2,3])')),[{a:1},{a:2},{a:3}],'map(let(bits,x,["a":bits]),x,[1,2,3])');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('dict([["a",1],["b",2]])')),{a:1,b:2},'dict([["a",1],["b",2]])');
        deepCloseEqual(assert, jme.unwrapValue(evaluate('let(["x":1],x)')), 1, 'let(["x":1],x)');
    });

    QUnit.test('Branching',function(assert) {
        closeEqual(assert, evaluate('if(true,1,0)').value,1,'if(true,1,0)');
        closeEqual(assert, evaluate('if(false,1,0)').value,0,'if(false,1,0,)');
        closeEqual(assert, evaluate('if(true,1,1<i)').value,1,'lazy evaluation: if(true,1,1<i)');
        closeEqual(assert, evaluate('if(false,1<i,1)').value,1,'lazy evaluation: if(false,1<i,1)');

        closeEqual(assert, evaluate('switch(true,1,0)').value,1,'switch(true,1,0)');
        closeEqual(assert, evaluate('switch(false,1,true,2,3)').value,2,'switch(false,1,true,2,3)');
        closeEqual(assert, evaluate('switch(false,1,false,2,3)').value,3,'switch(false,1,false,1,3)');
        closeEqual(assert, evaluate('switch(false,1,true,0)').value,0,'switch(false,1,true,0)');
        raisesNumbasError(assert, function(){ evaluate('switch(false,1,false,0)') },'jme.func.switch.no default case','no default case: switch(false,1,false,0)');
    });

    QUnit.test('Repetition',function(assert) {
        deepCloseEqual(assert, evaluate('map(x+1,x,[1,2,3])').value.map(getValue),[2,3,4],'map(x+1,x,[1,2,3])');
        deepCloseEqual(assert, evaluate('map(x+1,x,1..3)').value.map(getValue),[2,3,4],'map(x+1,x,1..3)');
        raisesNumbasError(assert, function(){evaluate('map(x+1,x,2)')},'jme.typecheck.map not on enumerable',"Can\'t map over things that aren\'t lists or ranges");
        deepCloseEqual(assert, evaluate('repeat(1,5)').value.map(getValue),[1,1,1,1,1],'repeat(1,5)');
        closeEqual(assert, evaluate('repeat(random(3..6),5)').value.length,5,'repeat(random(3..6),5) produces 5 values');
        var n = evaluate('repeat(random(3..6),5)[4]').value;
        closeEqual(assert, n>=3 && n<=6,true,'last item in repeat(random(3..6),5) is in the correct range');
    });

    QUnit.test('wrapValue',function(assert) {
        var m = [[0]];
        m.rows = 1;
        m.columns = 1;
        assert.equal(jme.wrapValue(m).type,'list','wrapValue on list without type hint gives list');
        assert.equal(jme.wrapValue(m,'matrix').type,'matrix','wrapValue on list with matrix type hint');
        assert.equal(jme.wrapValue(null).type,'string','wrapValue on null gives empty string');
        assert.equal(jme.wrapValue({a:1}).type,'dict','wrapValue on object gives dict');
        assert.equal(jme.wrapValue(new Numbas.jme.types.TList(1)).type,'list','wrapValue on a token returns it unchanged');
    });

    QUnit.test('isRandom',function(assert) {
        function check(expr,expected) {
            assert.equal(jme.isRandom(jme.compile(expr),Numbas.jme.builtinScope),expected,expr);
        }

        check('1',false);
        check('random(1,2)',true);
        check('1+random(3,4)',true);
        check('[1]',false);
        check('[random(1,2)]',true);
        check('["A":1]',false);
        check('["A":random("b","c")]',true);
        check('f(random(1,2))',true);
    });

    QUnit.test('HTML',function(assert) {
        assert.equal(evaluate('table([["x","y"],["3",1]])').value.html(),"<tbody><tr><td>x</td><td>y</td></tr><tr><td>3</td><td>1</td></tr></tbody>",'table');
        assert.equal(evaluate('table([["x","y"],["3",1]],["a","b"])').value.html(),"<thead><th>a</th><th>b</th></thead><tbody><tr><td>x</td><td>y</td></tr><tr><td>3</td><td>1</td></tr></tbody>",'table with headers');
    });

    QUnit.test('Calculus', function(assert) {
        function diff(expr,wrt) {
            wrt = wrt || 'x';
            return jme.display.treeToJME({tok:evaluate('diff(expression("'+expr+'"),"'+wrt+'")')});
        }
        function diff_equals(expr,wrt,target) {
            assert.equal(diff(expr,wrt),target,'diff('+expr+', '+wrt+')');
        }
        diff_equals('0','x','0');
        diff_equals('1','x','0');
        diff_equals('x','x','1');
        diff_equals('x^2','x','2x');
        diff_equals('2x^5','x','10*x^4');
        diff_equals('x+x^2','x','1 + 2x');
        diff_equals('x^2-x','x','2x - 1');
        diff_equals('sin(x)/x','x','(x*cos(x) - sin(x))/x^2');
        diff_equals('x*x','x','2x');
        diff_equals('e^x','x','e^x');
        diff_equals('2^x','x','ln(2)*2^x');
        diff_equals('sin(x)^2','x','2*cos(x)*sin(x)');
        diff_equals('sin(x^2)','x','2x*cos(x^2)');
        diff_equals('x','y','0')
        diff_equals('y','y','1')
        diff_equals('x^3*y^2','y','2*x^3*y');
        diff_equals('cos(x)*y','y','cos(x)');
        diff_equals('x+y+x*y+y^2*x^2','y','1 + x + 2*x^2*y');
        diff_equals('2x^3*y^4 + 5x^6 + 7y^8 + 9*x*y','y','8*x^3*y^3 + 56*y^7 + 9x');
    });

    QUnit.test('Sub-expresions', function(assert) {
        var scope = new Numbas.jme.Scope([Numbas.jme.builtinScope]);
        var fn = scope.evaluate('function("sin")');
        scope.setVariable('fn',fn);
        var res = scope.evaluate('exec(fn,[1])');
        treesEqual(assert, res.tree, jme.compile('sin(1)'), 'fn=function("sin"); exec(fn,[1])');
    });
    
    QUnit.module('Scopes');

    QUnit.test('Variables',function(assert) {
        deepCloseEqual(assert, jme.builtinScope.variables,{},'builtin scope has no variables');
        deepCloseEqual(assert, new jme.Scope().variables,{},'scope from constructor has no variables');
        var scope = new jme.Scope({
            variables: {
                x: new types.TNum(1),
                y: new types.TString('hi')
            }
        });
        assert.ok(scope.getVariable('x'),'add variables in scope constructor')
        var scope2 = new jme.Scope([scope,{variables: {x: new types.TNum(2)}}]);
        closeEqual(assert, scope2.getVariable('x').value,2,'override variable in old scope with new value');
        closeEqual(assert, scope2.getVariable('y').value,'hi','but other variables retained if not defined in later scope');
    });

    QUnit.test('Functions',function(assert) {
        assert.ok(jme.builtinScope.getFunction('+'),'builtin scope has functions in it.');
        deepCloseEqual(assert, new jme.Scope().functions,{},'scope from constructor has no functions');
        var scope = new jme.Scope([jme.builtinScope,{
            functions: {
                '+':[(new jme.funcObj('+',[types.TBool,types.TBool],types.TBool,null,{nobuiltin:true}))]
            }
        }]);
        closeEqual(assert, scope.getFunction('+').length,jme.builtinScope.getFunction('+').length+1,'add overloaded function to old scope');
        closeEqual(assert, new Numbas.jme.Scope([scope,jme.builtinScope]).getFunction('+').length,scope.getFunction('+').length,"don't duplicate functions when extending scope");


        var fn = jme.variables.makeFunction({
            name: 'testfn',
            definition: 'return 1',
            language: 'javascript',
            outtype: 'number',
            parameters: []
        });
        var s = new jme.Scope();
        var s2 = new jme.Scope([Numbas.jme.builtinScope,s]);
        s2.addFunction(fn);
        assert.notOk(s.functions.testfn,'Extending one scope with another doesn\'t affect the older scope.')
    });

    QUnit.test('Rulesets',function(assert) {
        deepCloseEqual(assert, new jme.Scope().rulesets,{},'scope from constructor has no rulesets');
        var scope = new jme.Scope({rulesets: jme.display.simplificationRules});
        assert.ok(scope.getRuleset('basic'),'extend scope with some rulesets');
    });

    QUnit.test('Custom parser', function(assert) {
        var parser = new Numbas.jme.Parser();
        parser.addOperator('!!',{commutative: true, precedence: 5});
        var scope = new Numbas.jme.Scope([Numbas.jme.builtinScope]);
        var TNum = Numbas.jme.types.TNum;
        scope.addFunction(new Numbas.jme.funcObj('!!',[TNum,TNum],TNum,function(a,b) {
            return 1/(1/a+1/b);
        }));
        scope.parser = parser;
        deepCloseEqual(assert, scope.evaluate('1 !! 2').value, 2/3,'1 !! 2 = 2/3');
    });


    QUnit.test('Constants', function(assert) {
        assert.equal(Numbas.jme.builtinScope.evaluate('pi').value, Math.PI, 'pi is the circle constant in the built-in scope');
        assert.equal(Numbas.jme.builtinScope.evaluate('e').value, Math.E, 'e is the base of the natural logarithm in the built-in scope');
        deepCloseEqual(assert,Numbas.jme.builtinScope.evaluate('i').value, Numbas.math.complex(0,1), 'i is sqrt(-1) in the built-in scope');

        var s = new Numbas.jme.Scope([Numbas.jme.builtinScope]);
        s.deleteConstant('pi');
        assert.notOk(s.getConstant('pi'),'pi is not a constant after deleting');

        s.setConstant('i',{value: s.evaluate('vector(1,0,0)'),tex:'\\hat{i}'});
        deepCloseEqual(assert,s.evaluate('5i').value,s.evaluate('vector(5,0,0)').value,'Redefine i as vector(1,0,0)');

        assert.ok('map(2i,i,1..5)','map over i');

        assert.equal(Numbas.jme.display.exprToLaTeX('x*i','',s),'x \\hat{i}','Use custom tex for redefined i');

        s.deleteConstant('i');
        assert.equal(Numbas.jme.display.exprToLaTeX('x*i','',s),'x i','Plain i after deleting the constant');
        assert.equal(Numbas.jme.display.texify({tok: s.evaluate('2+3sqrt(-1)')},{},s),'2 + 3 \\sqrt{-1}','With no imaginary unit, \\sqrt{-1} for complex numbers');

        s.deleteConstant('e');
        assert.equal(Numbas.jme.display.exprToLaTeX('exp(2)','',s),'\\exp \\left ( 2 \\right )','exp when the constant e is not defined');
        s.setConstant('ee',{value: s.evaluate('exp(1)'), tex:'E'});
        assert.equal(Numbas.jme.display.exprToLaTeX('exp(2)','',s),'E^{ 2 }','exp when the constant e is rendered as E');
    });


    QUnit.module('Pattern-matching');
    QUnit.test('matchExpression', function(assert) {
        function matchExpression(rule,expr,options) {
            return Numbas.jme.rules.matchExpression(rule,expr,Numbas.jme.rules.extend_options(options,{scope:Numbas.jme.builtinScope}));
        }
        function matchTree(pattern,exprTree) {
            var r = new Numbas.jme.rules.Rule(pattern,null);
            return r.match(exprTree,Numbas.jme.builtinScope);
        }
        function matchCapturedNames(pattern,namePatterns,expr,options) {
            options = Numbas.jme.rules.extend_options(options,{scope: Numbas.jme.builtinScope});
            var m = matchExpression(pattern,expr,options);
            return Object.entries(namePatterns).every(function(kv) {
                var name = kv[0];
                var namePattern = kv[1];
                var r = new Numbas.jme.rules.Rule(namePattern,null,options);
                return r.match(m[name],Numbas.jme.builtinScope);
            })
        }

        var tokens = Numbas.jme.rules.patternParser.tokenise('`+-x');
        assert.ok(Numbas.jme.isOp(tokens[0],'`+-'),'first token of `+-x is `+-');

        // names
        assert.ok(matchExpression('?','x'),'? matches x');
        assert.ok(matchExpression('?','1+sin(x)'),'? matches 1+sin(x)');
        assert.ok(matchExpression('?;x','1'),'?;x matches 1');
        assert.ok(matchExpression('?;x','1').x,'?;x captures a group called x');
        assert.ok(matchExpression('$n','5'),'$n matches 5');
        assert.notOk(matchExpression('$n','true'),'$n does not match true');
        assert.ok(matchTree('complex:$n',{tok:Numbas.jme.builtinScope.evaluate('2+i')}),'complex:$n matches 2+i');
        assert.ok(matchExpression('complex:$n','i'),'complex:$n matches i');
        assert.notOk(matchExpression('complex:$n','2'),'complex:$n does not match 2');
        assert.ok(matchExpression('imaginary:$n','i'),'imaginary:$n matches i');
        assert.notOk(matchExpression('imaginary:$n','2'),'imaginary:$n does not match 2');
        assert.notOk(matchTree('imaginary:$n',{tok:Numbas.jme.builtinScope.evaluate('2+i')}),'imaginary:$n does not match 2+i');
        assert.ok(matchExpression('real:$n','2'),'real:$n matches 2');
        assert.notOk(matchExpression('real:$n','i'),'real:$n does not match i');
        assert.ok(matchExpression('positive:$n','2'),'positive:$n matches 2');
        assert.notOk(matchTree('positive:$n',{tok:Numbas.jme.builtinScope.evaluate('-2')}),'positive:$n does not match -2');
        assert.notOk(matchExpression('positive:$n','i'),'positive:$n does not match i');
        assert.ok(matchTree('negative:$n',{tok:Numbas.jme.builtinScope.evaluate('-2')}),'negative:$n matches -2');
        assert.notOk(matchExpression('negative:$n','5'),'negative:$n does not match 5');
        assert.ok(matchExpression('nonnegative:$n','0'),'nonnegative:$n matches 0');
        assert.ok(matchExpression('nonnegative:$n','15'),'nonnegative:$n matches 0');
        assert.ok(matchExpression('nonnegative:$n','i'),'nonnegative:$n matches i');
        assert.ok(matchExpression('integer:$n','5'),'integer:$n matches 5');
        assert.notOk(matchExpression('integer:$n','1.5'),'integer:$n does not match 1.5');
        assert.ok(matchExpression('$v','x'),'$v matches x');
        assert.notOk(matchExpression('$v','5'),'$v does not match 5');
        assert.ok(matchExpression('?+$z','x'),'?+$z matches x');


        // functions
        assert.ok(matchExpression('sin(?)','sin(5)'),'sin(?) matches sin(5)');
        assert.notOk(matchExpression('sin(0)','0'),'sin(0) does not match 0');
        assert.ok(matchExpression('m_uses(x,y)','x+y'),'m_uses(x,y) matches x+y');
        assert.notOk(matchExpression('m_uses(x,y)','x^2'),'m_uses(x,y) does not match x^2');
        assert.ok(matchExpression('m_exactly(?+?)','x+y'),'m_exactly(?+?) matches x+y');
        assert.notOk(matchExpression('m_exactly(?+?)','x+y+z',{associative:true}),'m_exactly(?+?) does not match x+y+z');
        assert.ok(matchExpression('m_commutative(1+2)','2+1',{commutative:false}),'m_commutative(1+2) matches 2+1');
        assert.ok(matchExpression('m_noncommutative(1+2)','1+2',{commutative:true}),'m_noncommutative(1+2) matches 1+2');
        assert.notOk(matchExpression('m_noncommutative(1+2)','2+1',{commutative:true}),'m_noncommutative(1+2) does not match 2+1');
        assert.ok(matchExpression('m_noncommutative(1*2)+3','3+1*2',{commutative:true}),'m_noncommutative(1*2)+3 matches 3+1*2');
        assert.notOk(matchExpression('m_noncommutative(1*2)+3','3+2*1',{commutative:true}),'m_noncommutative(1*2)+3 does not match 3+2*1');
        assert.ok(matchExpression('m_associative(1+2+3)','1+2+3',{associative:false}),'m_associative(1+2+3) matches 1+2+3');
        assert.notOk(matchExpression('m_associative(1+2+3)','3+2+1',{associative:false,commutative:false}),'m_associative(1+2+3) does not match 3+2+1');
        assert.ok(matchExpression('m_nonassociative(1+2+3)','(1+2)+3',{associative:true}),'m_nonassociative(1+2+3) matches (1+2)+3');
        assert.notOk(matchExpression('m_nonassociative(1+2+3)','1+(2+3)',{associative:true}),'m_nonassociative(1+2+3) does not match 1+(2+3)');
        assert.ok(matchExpression('m_nonassociative(1*2*3)+4+5','(1*2)*3+(4+5)',{associative:true}),'m_nonassociative(1*2*3)+4+5 matches (1*2)*3+(4+5)');
        assert.ok(matchExpression('?+?','x-y'),'?+? matches x-y');
        assert.notOk(matchExpression('m_strictplus(?+?)','x-y'),'m_strictplus(?+?) does not match x-y');
        assert.ok(matchExpression('m_type("boolean")','true'),'m_type("boolean") matches true');
        assert.notOk(matchExpression('m_type("boolean")','x=y'),'m_type("boolean") does not match x=y');
        assert.ok(matchExpression('m_func("sum",[$n`*])','sum(1,2,3)'),'m_func("sum",[$n`*]) matches sum(1,2,3)');
        assert.notOk(matchExpression('m_func("sum",[$n`*])','mean(1,2,3)'),'m_func("sum",[$n`*]) does not match mean(1,2,3)');
        assert.notOk(matchExpression('m_func("sum",[$n`*])','sum(x)'),'m_func("sum",[$n`*]) does not match sum(x)');
        assert.ok(matchExpression('m_op("+",[$n,x])','1+x'),'m_func("+",[$n,x]) matches 1+x');
        assert.notOk(matchExpression('m_op("+",[$n,x])','1-x'),'m_func("+",[$n,x]) does not match 1-x');
        assert.notOk(matchExpression('m_op("+",[$n,x])','x+1'),'m_func("+",[$n,x]) does not match x+1');
        assert.ok(matchExpression('m_anywhere(?*?)','x+2z'),'m_anywhere(?*?) matches x+2z');
        assert.notOk(matchExpression('m_anywhere(?*?)','x+2'),'m_anywhere(?*?) does not match x+2');
        assert.ok(matchExpression('m_anywhere(?/?)','2x/y'),'m_anywhere(?*?) matches 2x/y');


        // ops
        assert.ok(matchExpression('x+y','x+y'),'x+y matches x+y');
        assert.ok(matchExpression('x+y','y+x'),'x+y matches y+x (+ is commutative)');
        assert.notOk(matchExpression('x-y','y-x'),'x+y does not match y-x');
        assert.ok(matchExpression('-?','-2'),'-? matches -2');
        assert.notOk(matchExpression('-?','0-2'),'-? does not match 0-2');

        assert.ok(matchExpression('x+y`?','x+y'),'x+y`? matches x+y');
        assert.ok(matchExpression('x+y`?','x'),'x+y`? matches x');
        assert.notOk(matchExpression('x+y`?','x+y+y',{allowOtherTerms:false}),'x+y`? does not match x+y+y');

        assert.ok(matchExpression('x+y`*','x+y'),'x+y`* matches x+y');
        assert.ok(matchExpression('x+y`*','x'),'x+y`* matches x');
        assert.ok(matchExpression('x+y`*','x+y+y',{allowOtherTerms:false}),'x+y`* matches x+y+y');

        assert.ok(matchExpression('x+y`+','x+y'),'x+y`+ matches x+y');
        assert.notOk(matchExpression('x+y`+','x'),'x+y`+ does not match x');
        assert.ok(matchExpression('x+y`+','x+y+y',{allowOtherTerms:false}),'x+y`+ matches x+y+y');

        assert.ok(matchExpression('x `| y','x'),'x `| y matches x');
        assert.ok(matchExpression('x `| y','y'),'x `| y matches y');
        assert.notOk(matchExpression('x `| y','z'),'x `| y does not match z');

        assert.ok(matchExpression('x+(y `: 1)','x'),'x+(y `: 1) matches x');
        assert.ok(matchExpression('x+(y `: 1)','x+y'),'x+(y `: 1) matches x+y');
        assert.ok(matchExpression('x+(y `: 1)','x+z'),'x+(y `: 1) does not match x+z');
        assert.ok(Numbas.jme.isName(matchExpression('x+(y `: 1);rhs','x+y').rhs.tok,'y'),'x+(y `: 1);rhs matches x+y with rhs as y');
        var res = matchExpression('x+(y `: 1);rhs','x').rhs.tok;
        assert.ok(res.type=='integer' && res.value==1,'x+(y `: 1);rhs matches x with rhs as 1');

        assert.ok(matchExpression('`+- x','x'),'`+- x matches x');
        assert.ok(matchExpression('`+- x','-x'),'`+- x matches -x');
        assert.ok(matchExpression('x + (`+- y)','x+y'),'`x + (+- y) matches x+y');
        assert.ok(matchExpression('x + (`+- y)','x-y'),'`x + (+- y) matches x-y');
        assert.notOk(matchExpression('x + y','x-y'),'`x + y does not match x-y');

        assert.ok(matchExpression('`! x','y'),'`! x matches y');
        assert.notOk(matchExpression('`! x','x'),'`! x does not match x');
        assert.ok(matchExpression('`! m_uses(x)','y+sin(z)'),'`! m_uses(x) matches y+sin(z)');

        assert.ok(matchExpression('m_uses(x) `& `! m_uses(y)','x+z'),'m_uses(x) `& `! m_uses(y) matches x+z');
        assert.notOk(matchExpression('m_uses(x) `& `! m_uses(y)','x+y'),'m_uses(x) `& `! m_uses(y) does not match x+y');

        assert.ok(matchExpression('$n;x + $n;y `where x+y=4','1+3'),'$n;x + $n;y `where x+y=4 matches 1+3');
        assert.ok(matchExpression('$n;x + $n;y `where x+y=4','0.5+3.5'),'$n;x + $n;y `where x+y=4 matches 0.5+3.5');
        assert.notOk(matchExpression('$n;x + $n;y `where x+y=4','2+3'),'$n;x + $n;y `where x+y=4 does not match 2+3');

        assert.ok(matchExpression('["f": $n/$n] `@ f + f','1/2 + 3/4'),'["f": $n/$n] `@ f + f matches 1/2 + 3/4');

        assert.notOk(matchExpression('$n`+/$n`?','3pi/4',{allowOtherTerms:true,strictInverse:true}),'$n`+/$n`? does not match 3pi/4 with strictInverse');

        assert.ok(matchExpression('((`*/ `+- $n)`*;x)*i','-(1/2)*pi*i'),'deal with unary minus amongst factors');

        // lists
        assert.ok(matchExpression('[]','[]'),'[] matches []');
        assert.ok(matchExpression('[1,2,3]','[1,2,3]'),'[1,2,3] matches [1,2,3]');
        assert.notOk(matchExpression('[1,2,3]','[3,2,1]'),'[1,2,3] does not match [3,2,1]');
        assert.notOk(matchExpression('[1,2,3]','[1,2]'),'[1,2,3] does not match [1,2]');
        assert.ok(matchExpression('[$n`+]','[1,2,3]'),'[$n`+] matches [1,2,3]');
        assert.ok(matchExpression('[$n`+,3]','[1,2,3]'),'[$n`+,3] matches [1,2,3]');
        assert.notOk(matchExpression('[$n`+,2]','[1,2,3]'),'[$n`+,2] does not match [1,2,3]');
        assert.ok(matchExpression('[$n`+,2`?]','[1,2,3]'),'[$n`+,2`?] matches [1,2,3]');

        // named groups
        assert.ok(matchCapturedNames('?;x',{x:'1'},'1'),'?;x on 1 captures x as 1');
        assert.ok(matchCapturedNames('?;x',{x:'sin(pi+3)'},'sin(pi+3)'),'?;x on sin(pi+3) captures x as sin(pi+3)');
        assert.ok(matchCapturedNames('?`+;x+?;y',{x:'1',y:'2'},'1+2'),'?;x+?;y on 1+2 captures x as 1 and y as 2');
        assert.ok(matchCapturedNames('?`+;x+y',{x:'x+2'},'x+2+y'),'?`+;x+y on x+2+y captures x as x+2');
        assert.ok(matchCapturedNames('?`+;x+y',{x:'x+2'},'x+y+2'),'?`+;x+y on x+y+2 captures x as x+2');
        assert.ok(matchCapturedNames('2^(-?;x)',{x:'1'},'2^-1'),'2^(-?;x) on 2^-1 captures x as 1');
        assert.ok(matchCapturedNames('sin(?;x)',{x:'1'},'sin(1)'),'sin(?;x) on sin(1) captures x as 1');
        assert.ok(matchCapturedNames('f(?;x,?;x)',{x:'[1,2]'},'f(1,2)'),'f(?;x,?;x) on f(1,2) captures x as [1,2]');

        // identified names
        assert.ok(matchExpression('$n*?;=x + $n*?;=x','2y+3y'),'$n*?;=x + $n*?;=x matches 2y+3y');
        assert.ok(matchExpression('$n*?;=x + $n*?;=x','2(x+1)+3(x+1)'),'$n*?;=x + $n*?;=x matches 2(x+1)+3(x+1)');
        assert.notOk(matchExpression('$n*?;=x + $n*?;=x','2(x+1)+3z'),'$n*?;=x + $n*?;=x does not match 2(x+1)+3z');

        assert.ok(matchExpression('($n `| ?;=x)`* + $z','1+x+x+2',{allowOtherTerms:false}),'($n `| ?;=x)`* + $z matches 1+x+x+2 : cope with a term optionally not matching an identified name');
        assert.notOk(matchExpression('($n `| ?;=x)`* + $z','1+x+y+2',{allowOtherTerms:false}),'($n `| ?;=x)`* + $z does not match 1+x+y+2 : cope with a term optionally not matching an identified name');
    });

    QUnit.test('replace', function(assert) {
        function replace(pattern,repl,options,expr) {
            var rule = new Numbas.jme.rules.Rule(pattern,repl,options);
            return rule.replace(Numbas.jme.compile(expr), Numbas.jme.builtinScope);
        }
        function replaceAll(pattern,repl,options,expr) {
            var rule = new Numbas.jme.rules.Rule(pattern,repl,options);
            return rule.replaceAll(Numbas.jme.compile(expr), Numbas.jme.builtinScope);
        }
        
        var res = replace('?;x+?;y','x*y','acg','1+2');
        assert.ok(res.changed);
        var treeToJME = Numbas.jme.display.treeToJME;
        assert.equal(treeToJME(res.expression),'1*2');

        var res = replace('?;x+?;y','x*y','acg','1*2');
        assert.notOk(res.changed);

        var res = replace('?;x*?;y','x+y','acg','1*2+3*4');
        assert.notOk(res.changed);

        var res = replaceAll('?;x*?;y','x+y','acg','1*2+3*4');
        assert.ok(res.changed);
        assert.equal(treeToJME(res.expression),'1 + 2 + 3 + 4');
    });
    QUnit.module('Display');

    QUnit.test('niceNumber',function(assert) {
        assert.equal(Numbas.math.niceNumber(1000,{precisionType:'sigfig',precision:2}),'1000','niceNumber with sigfig precision calculates number of zeroes to add correctly');
        assert.equal(Numbas.math.niceNumber(1010,{precisionType:'sigfig',precision:6}),'1010.00','niceNumber with sigfig precision calculates number of zeroes to add correctly');
        assert.equal(Numbas.math.niceNumber(Infinity),'infinity','niceNumber recognises infinity');
        assert.equal(Numbas.math.niceNumber(-Infinity),'-infinity','niceNumber recognises -infinity');
        assert.equal(Numbas.math.niceNumber(-Math.PI),'-pi','niceNumber on -pi doesn\'t say -1pi');
        assert.equal(Numbas.math.niceNumber(Math.PI,{precisionType: 'dp', precision:2}),'3.14','niceNumber doesn\'t show pi when given a precisionType');
        assert.equal(Numbas.math.niceNumber(6e-10,{precisionType:'sigfig',precision:3}),'0.000000000600','niceNumber adds digits to exponential-form numbers correctly');
        assert.equal(Numbas.math.niceNumber(2.2e-10,{precisionType:'sigfig',precision:3}),'0.000000000220','niceNumber adds digits to exponential-form numbers correctly');
        assert.equal(Numbas.math.niceNumber(2e-10,{precisionType:'dp',precision:12}),'0.000000000200','niceNumber adds digits to exponential-form numbers correctly');
        assert.equal(Numbas.math.niceNumber(2.2e-10,{precisionType:'dp',precision:12}),'0.000000000220','niceNumber adds digits to exponential-form numbers correctly');
        assert.equal(Numbas.math.niceNumber(1.234e5,{style:'scientific',precisionType:'dp',precision:1}),'1.2e+5','precision formatting on a scientific form number');
        assert.equal(Numbas.math.niceNumber(0.0002663,{precisionType:'sigfig',precision:1}),'0.0003','sigfig precision doesn\'t add unwanted floating point error digits')
        assert.equal(Numbas.math.niceNumber(1.234567e5,{style:'scientific'}),'1.234567e+5','scientific notation doesn\'t put spaces between groups of digits');
        assert.equal(Numbas.math.niceNumber(Numbas.math.ensure_decimal(123),{precisionType: 'sigfig', precision: 1}), '100', 'sig figs on ComplexDecimal values');
    });

    QUnit.test('niceDecimal',function(assert) {
        var niceDecimal = Numbas.math.niceDecimal;
        assert.equal(niceDecimal(new Decimal(0)),'0','0');
        assert.equal(niceDecimal(new Decimal(1)),'1','1');
        assert.equal(niceDecimal(new Decimal(-1)),'-1','-1');
        assert.equal(niceDecimal((new Decimal(2)).squareRoot()),'1.41421356237309504880168872420969807857','sqrt(2)');
        assert.equal(niceDecimal((new Decimal(2)).squareRoot(),{precisionType: 'dp', precision: 3}),'1.414','sqrt(2) to 3 dp');
        assert.equal(niceDecimal((new Decimal(2)).squareRoot(),{precisionType: 'sigfig', precision: 3}),'1.41','sqrt(2) to 3 sig figs');
        assert.equal(niceDecimal(new Decimal("123456789.12345"),{style:'eu'}),'123.456.789,12345','123456789.12345 in eu style');
        assert.equal(niceDecimal(new Decimal("123456789123456789123456789123456789.12345"),{style:'eu'}),'123.456.789.123.456.789.123.456.789.123.456.789,12345','123456789123456789123456789123456789.12345 in eu style');
        assert.equal(niceDecimal((new Decimal(2)).pow(100.5),{style:'scientific'}),'1.792728671193156477399422023278661496394e+30','2^100.5');
        assert.equal(niceDecimal((new Decimal(2)).pow(100.5),{style:'scientific', precision: 4}),'1.7927e+30','2^100.5');
    });

    QUnit.test('niceComplexDecimal',function(assert) {
        var niceComplexDecimal = Numbas.math.niceComplexDecimal;
        function c(a,b) {
            return new Numbas.math.ComplexDecimal(new Decimal(a),new Decimal(b));
        }
        assert.equal(niceComplexDecimal(c(1,0)),'1','1');
        assert.equal(niceComplexDecimal(c(0,0)),'0','0');
        assert.equal(niceComplexDecimal(c(-1,0)),'-1','-1');
        assert.equal(niceComplexDecimal(c(0,1)),'i','i');
        assert.equal(niceComplexDecimal(c(0,-1)),'-i','-i');
        assert.equal(niceComplexDecimal(c(1,1)),'1 + i','1 + i');
        assert.equal(niceComplexDecimal(c(1,-1)),'1 - i','1 - i');
        assert.equal(niceComplexDecimal(c(2,2)),'2 + 2*i','2 + 2*i');
        assert.equal(niceComplexDecimal(c(2,-2)),'2 - 2*i','2 - 2*i');
        assert.equal(niceComplexDecimal(c(4,5),{style:'scientific'}),'4e+0 + (5e+0)*i','4 + 5i in scientific style');
    });

    QUnit.test('Number notation styles',function(assert) {
        var tests = {
            en: [
                ['0','0',0],
                ['-0','-0',0,'0'],
                [' - 0','-0',0,'0'],
                ['1','1',1],
                ['0.1','0.1',0.1],
                ['123','123',123],
                ['1,234','1234',1234],
                ['1,234,567.89','1234567.89',1234567.89],
                ['-1,234.0','-1234.0',-1234,'-1,234'],
                ['1,2,3','1,2,3',NaN]
            ],
            'si-en': [
                ['0','0',0],
                ['-0','-0',0,'0'],
                ['1','1',1],
                ['0.1','0.1',0.1],
                ['123','123',123],
                ['1 234','1234',1234],
                ['1 234 567.89','1234567.89',1234567.89],
                ['-1 234.0','-1234.0',-1234,'-1 234'],
                ['1 2 3','1 2 3',NaN]
            ],
            eu: [
                ['0','0',0],
                ['-0','-0',0,'0'],
                ['1','1',1],
                ['0,1','0.1',0.1],
                ['123','123',123],
                ['1.234','1234',1234],
                ['1.234.567,89','1234567.89',1234567.89],
                ['-1.234,0','-1234.0',-1234,'-1.234'],
                ['1.2.3','1.2.3',NaN]
            ],
            'si-fr': [
                ['0','0',0],
                ['-0','-0',0,'0'],
                ['1','1',1],
                ['0,1','0.1',0.1],
                ['123','123',123],
                ['1 234','1234',1234],
                ['1 234 567,89','1234567.89',1234567.89],
                ['-1 234,0','-1234.0',-1234,'-1 234'],
                ['1 2 3','1 2 3',NaN]
            ],
            ch: [
                ["0","0",0],
                ["-0","-0",0,"0"],
                ["1","1",1],
                ["0.1","0.1",0.1],
                ["123","123",123],
                ["1'234","1234",1234],
                ["1'234'567.89","1234567.89",1234567.89],
                ["-1'234.0","-1234.0",-1234,"-1'234"],
                ["1'2'3","1'2'3",NaN]
            ],
            in: [
                ['0','0',0],
                ['-0','-0',0,'0'],
                ['1','1',1],
                ['0.1','0.1',0.1],
                ['123','123',123],
                ['1,234','1234',1234],
                ['12,34,567.89','1234567.89',1234567.89],
                ['1,23,456.78','123456.78',123456.78],
                ['-1,234.0','-1234.0',-1234,'-1,234'],
                ['1,2,3','1,2,3',NaN]
            ],
            scientific: [
                ['0e+0','0',0,],
                ['1e+2','100',100],
                ['1.23e+2','123',123],
                ['1.23e-2','0.0123',0.0123],
                ['-9.1e+2','-910',-910],
                ['1.234 567e+6','1234567',1.234567e+6,'1.234567e+6'],
                ['315e6','315000000',315e6,'3.15e+8'],
                ['3.15e6','3150000',3.15e6,'3.15e+6'],
                ['315e-6','0.000315',315e-6,'3.15e-4'],
                ['3.15e-6','0.00000315',3.15e-6],
                ['3101e-2','31.01',3101e-2,'3.101e+1'],
                ['3101.2e-2','31.012',3101.2e-2,'3.1012e+1'],
                ['0.01e4','100',0.01e4,'1e+2'],
                ['0.00102e4','10.2',0.00102e4,'1.02e+1'],
                ['-2.222 222 2e+0','-2.2222222',-2.2222222,'-2.2222222e+0']
            ]
        }
        for(var style in tests) {
            tests[style].forEach(function(t) {
                var input = t[0];
                var cleaned = t[1];
                var value = t[2];
                assert.equal(Numbas.util.cleanNumber(input,style),cleaned,'clean '+style+' '+input);
                var v = Numbas.util.parseNumber(input,false,style);
                if(isNaN(value)) {
                    assert.equal(isNaN(v),true,'parse '+style+' '+input);
                } else {
                    assert.equal(v,value,'parse '+style+' '+input);
                    var formatted = t[3]===undefined ? input : t[3];
                    assert.equal(Numbas.math.niceNumber(value,{style:style}),formatted,'format '+style+' '+value);
                }
            });
        }
        assert.deepEqual(Numbas.util.parseNumber('123456',false,['si-fr'],false),123456,'123456 with strictStyle=false');
        assert.deepEqual(Numbas.util.parseNumber('123456',false,['si-fr'],true),NaN,'123 456 with strictStyle=true');
        assert.deepEqual(Numbas.util.parseNumber('1/2',true,['si-fr'],true),0.5,'1/2 with allowFractions and strictStyle=true');
        assert.deepEqual(Numbas.util.parseNumber('infinity',false,['si-fr'],true),Infinity,'infinity with strictStyle=true');
        assert.deepEqual(Numbas.util.parseNumber('-infinity',false,['si-fr'],true),-Infinity,'infinity with strictStyle=true');

        assert.equal(Numbas.util.isNumber('3/4',true,['en'],true),true,'isNumber on fraction with strictStyle');
        assert.equal(Numbas.util.isNumber('3,000',false,['en','en-si'],true),true,'isNumber on 3,000');
        assert.equal(Numbas.util.isNumber('3,000',false,['en-si'],true),false,'isNumber on 3,000 with only en-si');
    });

    QUnit.test('subvars',function(assert) {
        assert.ok(Numbas.jme.texsplit('boo\r\\simplify{}'),'texsplit copes with \\r characters OK.');
        assert.equal(Numbas.jme.subvars('{1-0.9-0.1}',Numbas.jme.builtinScope),'(0)','numbers very close to zero rounded to zero');
    });

    QUnit.test('token to display string',function(assert) {
        var scope = Numbas.jme.builtinScope;
        assert.equal(Numbas.jme.tokenToDisplayString(scope.evaluate('3-9*(11*(1/33))')),'0','very very nearly 0');
        assert.equal(Numbas.jme.tokenToDisplayString(scope.evaluate('vector(3)-9*(11*vector(1/33))')),'vector(0)','very nearly zero vector')
        assert.equal(Numbas.jme.tokenToDisplayString(Numbas.jme.builtinScope.evaluate('vector(pi)')),'vector(pi)','pi vector')
        assert.equal(Numbas.jme.tokenToDisplayString(Numbas.jme.builtinScope.evaluate('vector(pi/7)')),'vector(0.4487989505)','vector(pi/7)')
        assert.equal(Numbas.jme.tokenToDisplayString(Numbas.jme.builtinScope.evaluate('vector(5pi)')),'vector(5 pi)','vector(5pi)')
    });

    QUnit.test('tree to JME', function(assert) {
        function simplifyExpression(expr,rules) {
            return Numbas.jme.display.simplifyExpression(expr,rules || '',Numbas.jme.builtinScope);
        }
        var jmeifier = new Numbas.jme.display.JMEifier();
        assert.equal(jmeifier.number({complex: true, im: -Math.PI, re: 1}),'1 - pi*i','jmeNumber on 1 - pi*i puts an asterisk in');
        assert.equal(jmeifier.number({complex: true, im: -Math.PI, re: 0}),'-pi*i','jmeNumber on -pi*i puts an asterisk in');
        assert.equal(jmeifier.number({complex: true, im: Math.PI, re: 1}),'1 + pi*i','jmeNumber on 1 + pi*i puts an asterisk in');
        assert.equal(jmeifier.number({complex: true, im: Math.PI, re: 0}),'pi*i','jmeNumber on pi*i puts an asterisk in');
        assert.equal(Numbas.jme.display.treeToJME({tok:Numbas.jme.builtinScope.evaluate('dec(1)+dec("-15.460910528400001612")*i')}), '1 - dec("1.5460910528400001612e+1")*i', 'jmeDecimal showsn egative imaginary parts properly');
        assert.equal(simplifyExpression('-1*x*3'),'-1x*3','pull minus to left of product');
        assert.equal(simplifyExpression('2*pi*i','basic'),'2pi*i','2*pi*i unchanged by basic rules');
        assert.equal(simplifyExpression('(a/b)*(c/d)'),'(a/b)(c/d)','(a/b)*(c/d) - fractions remain separate');
        assert.equal(simplifyExpression('(-7)/(-4+5i)','all'),'7/(4 - 5i)','(-7)/(-4+5i) - unary minus brought out of complex number properly');
        assert.equal(simplifyExpression('-4+5i','all'),'-4 + 5i','-4+5i - unary minus brought out of complex number properly');
        assert.equal(simplifyExpression('(1-i)+(-2+2i)','collectComplex'),'1 - i - 2 + 2i','(1-i)+(-2+2i) - addition of complex numbers with negative imaginary parts');
        assert.equal(simplifyExpression('(1-i)-(-2+2i)','collectComplex'),'1 - i + 2 - 2i','(1-i)-(-2+2i) - addition of complex numbers with negative imaginary parts');
        assert.equal(simplifyExpression('10000000000000000000000000'),'1*10^(25)','scientific notation - 1*10^25');
        assert.equal(simplifyExpression('47652000000000000000000000'),'4.7652*10^(25)','scientific notation - 4.7652*10^25');
        assert.equal(simplifyExpression('x+(-10+2)','all,collectNumbers'),'x - 8','x+(-10+2) - negative number in the middle of an addition gets cancelled through properly');
        assert.equal(simplifyExpression('4-(x^2+x+1)',[]),'4 - (x^2 + x + 1)',"4-(x^2+x+1) - brackets round right-hand operand in subtraction kept when they\'re wrapping an addition.");
        assert.equal(simplifyExpression('(x^2+x)-4',[]),'x^2 + x - 4','(x^2+x)-4 - brackets round left-hand operand in subtraction can be dropped.');
        assert.equal(simplifyExpression('pi*i',['all']),'pi*i',"pi*i - don\'t lose multiplication symbol.");
        assert.equal(Numbas.jme.compile(Numbas.jme.display.treeToJME(Numbas.jme.compile('"\\\\textrm{hi}\\nso"'))).tok.value,"\\textrm{hi}\nso",'treeToJME escapes backslashes');
        assert.equal(simplifyExpression('-3x-4',['all']),'-3x - 4',"-3x-4 doesn\'t get rearranged to -(3x+4) by collectNumbers");
        assert.equal(simplifyExpression('x-(5-p)',[]),'x - (5 - p)','x-(5-p) keeps the right-hand brackets');
        assert.equal(simplifyExpression('3i/5','basic,collectComplex'),'3i/5','don\'t put brackets on imaginary numerator');
        assert.equal(simplifyExpression('-3/5','basic'),'-3/5','don\'t put brackets on single number numerator');
        assert.equal(simplifyExpression('3/4i','basic,collectComplex'),'(3/4)i','put brackets round a fraction preceding i');
        assert.equal(simplifyExpression('(e^t)^2'),'(e^t)^2','put brackets around power taken to a power');
        assert.equal(simplifyExpression('3!',[]),'3!','3!');
        assert.equal(simplifyExpression('(3+1)!',[]),'(3 + 1)!','(3+1)! is bracketed');
        assert.equal(simplifyExpression('pi*x',['all']),'pi*x','pi*x doesn\t omit the *');
        assert.equal(simplifyExpression('e*x',['all']),'e*x','e*x doesn\t omit the *');
        assert.equal(simplifyExpression('1*pi/4',['all']),'pi/4','1*pi/4 cancels the 1');
        assert.equal(simplifyExpression('2*pi/4',['all']),'pi/2','2*pi/4 cancels the integer factor');
        assert.equal(simplifyExpression('2*pi*x/4',['all']),'pi*x/2','2*pi*x/4 cancels the integer factor');
        assert.equal(simplifyExpression('x/(2 pi^2)',['all']),'x/(2 pi^2)','x/(2 pi^2) brackets the multiple of pi');
        assert.equal(simplifyExpression('2*x/(4*pi^2)',['all']),'x/(2 pi^2)','2*x/(4*pi^2) cancels the integer factor');
        assert.equal(simplifyExpression('2i/4',['all']),'i/2','2*i/4 cancels the integer factor');
        assert.equal(simplifyExpression('2/(4i)',['all']),'1/(2i)','2/(4i) cancels the integer factor');
        assert.equal(simplifyExpression('2i/(4i)',['all']),'1/2','2i/(4i) cancels the i');
        assert.equal(simplifyExpression('(2+i)/3',['all']),'(2 + i)/3','(2+i)/3 puts brackets around the complex numerator');
        assert.equal(simplifyExpression('-0',['noLeadingMinus']),'0','-0 rewritten to 0 with noLeadingMinus');
        assert.equal(simplifyExpression('-0',['all','!noLeadingMinus']),'-0','-0 not rewritten to 0 without noLeadingMinus');
        assert.equal(simplifyExpression('y+(1-2)x','all'),'y - x','Collect numbers resulting in a negative');
        assert.equal(simplifyExpression('x+(1-2)/x','all'),'x - 1/x','Collect numbers resulting in a negative');
        assert.equal(simplifyExpression('x^0.5',{flags:{fractionnumbers:true}}),'x^(1/2)','x^0.5 with fractionNumbers puts brackets around the fraction');
        assert.equal(simplifyExpression('(x+2)(x+3)','all,canonicalOrder,expandBrackets,!noLeadingMinus'),'x^2 + 5x + 6','Small product expanded and collected');
        assert.equal(simplifyExpression('(x+1)(x+2)(x+3)(x+4)','all,canonicalOrder,expandBrackets,!noLeadingMinus'),'x^4 + 10*x^3 + 35*x^2 + 50x + 24','Large product expanded and collected');
        assert.equal(simplifyExpression('(x+1)(x-2)(x+3)(x+4)','all,canonicalOrder,expandBrackets,!noLeadingMinus'),'x^4 + 6*x^3 + 3*x^2 - 26x - 24','Large product with a negative term expanded and collected: (x+1)(x-2)(x+3)(x+4)');
        assert.equal(simplifyExpression('(x^2+4x+1)(x^2+2x+1)','all'),'(x^2 + 4x + 1)(x^2 + 2x + 1)','cancelFactors on polynomials differing only by coefficients');
        assert.equal(simplifyExpression('(x^2+4x+1)(x^2+4x+1)','all'),'(x^2 + 4x + 1)^2','cancelFactors on equal polynomials');
        assert.equal(simplifyExpression("(49)/(130)-(63)/(130)*i",'all,!collectNumbers'),'(49 - 63i)/130',"(49)/(130)-(63)/(130)*i");
        assert.equal(simplifyExpression("(49)/(130)-(63)/(130)*i",'all,!collectNumbers,!collectLikeFractions'),'49/130 - (63/130)i',"(49)/(130)-(63)/(130)*i");
        assert.equal(simplifyExpression("(1/10/10)*9",'collectNumbers'),'9/100',"(1/10/10)*9 doesn\'t get stuck in a loop");
        assert.equal(simplifyExpression("4*(1/3/x)",'all'),'4/(3x)',"4*(1/3/x) doesn\'t get stuck in a loop");
        assert.equal(simplifyExpression("0(1/(9x))",'all'),'0','0(1/(9x)) doesn\'t get stuck in a loop');
        assert.equal(simplifyExpression("2*(x*(-1/2))",'all'),'-x','2*(x*(-1/2)) doesn\'t get stuck in a loop');
        assert.equal(simplifyExpression('(-2)^3','all'),'-8','(-2)^3');
        assert.equal(Numbas.jme.display.treeToJME({tok:Numbas.jme.builtinScope.evaluate('6-48i')},{fractionnumbers:true}),'6 - 48i','6-48i');
        assert.equal(Numbas.jme.display.treeToJME({tok:Numbas.jme.builtinScope.evaluate('dec(2)+dec(sqrt(-1))')}), '2 + i', 'dec(2) + dec(sqrt(-1))');
        assert.equal(Numbas.jme.display.treeToJME(Numbas.jme.compile('not (p and q)')),'not (p and q)','not (p and q)');
        assert.equal(Numbas.jme.display.treeToJME(Numbas.jme.compile('not (p + q)')),'not (p + q)','not (p + q)');
        assert.equal(Numbas.jme.display.treeToJME(Numbas.jme.compile('not p')),'not p','not p');
        assert.equal(simplifyExpression('i*omega','all'),'i*omega','i*omega');
        assert.equal(simplifyExpression('e^(i*omega*t)','all'),'e^(i*omega*t)','e^(i*omega*t)');

        var html = Numbas.jme.evaluate('html("<div class=\\"thing\\">this</div>")',Numbas.jme.builtinScope);
        assert.equal(Numbas.jme.display.treeToJME({tok:html}),'html(safe("<div class=\\"thing\\">this</div>"))','treeToJME serialises HTML');
        var r = new Numbas.jme.rules.Rule('$n;m*?;n','eval(m*n)');
        var s = new Numbas.jme.Scope([Numbas.jme.builtinScope,{variables: {x: new Numbas.jme.types.TNum(2)}}]);
        var m = r.match(Numbas.jme.compile('x*2'),s);
        assert.equal(m,false,"don't sub variables from the scope when checking simplification rule conditions");
        assert.equal(Numbas.jme.display.simplifyExpression('4x+2','all',s),'4x + 2','x is defined in the scope as a number');
        assert.equal(simplifyExpression('3x^(-5)+6x^4',['all']),'3*x^(-5) + 6*x^4','canonical_compare compares negative powers properly');
        assert.equal(simplifyExpression('-6x - 20x',['all']),'-26x','collect two negatives together');
        assert.equal(simplifyExpression('2x*(3/5)',['all']),'6(x/5)','2x*(3/5) doesn\'t get stuck in a loop');
        assert.equal(simplifyExpression('sin(315/180*pi)',['all']),'sin(7 pi/4)','no unary division, and fully collected');
        assert.equal(simplifyExpression('-1/2',['']),'-1/2','no brackets around unary minus in division');
        assert.equal(simplifyExpression('(5)^(1)+ (-0.096)*((1)/(2))*(5)^(-1)','all,!collectNumbers'),'5 - 0.096(1/2)*5^(-1)','pull minus out of big multiplication and don\'t get stuck in a loop');
        assert.equal(Numbas.jme.display.treeToJME({tok: Numbas.jme.builtinScope.evaluate('dec(-4)')}),'-4','dec(-4) rendered as -4');
        assert.equal(Numbas.jme.display.treeToJME({tok: Numbas.jme.builtinScope.evaluate('dec(4.56)*dec(10)^1000')}),'dec("4.56e+1000")','dec(4.56)*dec(10)^1000');
        assert.equal(Numbas.jme.display.treeToJME({tok: Numbas.jme.builtinScope.evaluate('dec(10)^1000')}),'dec("1e+1000")','dec(10)^1000');
        assert.equal(Numbas.jme.display.treeToJME({tok: Numbas.jme.builtinScope.evaluate('10^3')}),'1000','10^3');
        assert.equal(simplifyExpression('dot:x + x','all'), 'dot:x + x', 'dot:x + x does not collect terms in x');
        assert.equal(simplifyExpression('(5k)!','all'), '(5k)!', '(5k)! - brackets around factorial argument');
        assert.equal(simplifyExpression('x + (-2)*y + z + 0*u','zeroFactor,zeroTerm'),'x - 2y + z','x+(-2)*y+z+0*u -- cancel plus minus with other terms and factors');
        assert.equal(simplifyExpression('x/(1/2)','basic'),'x/(1/2)','x/(1/2) -- preserve brackets for a sequence of divisions');
        assert.equal(simplifyExpression('2*(-3*4)','basic'),'-3*4*2', '2*(-3*4) -- brackets before a unary minus');
        assert.equal(Numbas.jme.display.treeToJME(Numbas.jme.compile('2*(3*-4)')),'2*3*(-4)','2*(3*-4)');
        assert.equal(Numbas.jme.display.treeToJME(Numbas.jme.compile('2*(-3*4)')),'2*(-3)*4','2*(-3*4)');
        assert.deepEqual(Numbas.jme.display.simplifyExpression('(1/x)*x^2','all',Numbas.jme.builtinScope),'x','(1/x)*x^2 - Cancel powers');
        assert.equal(simplifyExpression('2/(3/x)','all'),'2x/3', '2/(3/x) - un-nest fractions');

        var s = new Numbas.jme.Scope([Numbas.jme.builtinScope, {variables: {
          a: Numbas.jme.builtinScope.evaluate('1+8i'),
        }}]);
        var t = Numbas.jme.substituteTree(Numbas.jme.compile('-a*3'),s)
        var out = Numbas.jme.display.treeToJME(t);
        assert.equal(out,"(-1 - 8i)*3",'unary minus complex number');

        assert.equal(simplifyExpression('1+(-i)*a','basic'),'1 - i*a', '1+(-i)*a');
        assert.equal(simplifyExpression('1+(-1/2*a*i)','basic'),'1 - (1/2)a*i', '1+(-i)*a');
        assert.equal(simplifyExpression('1+(-1/2*a*i)','all'),'1 - (i/2)a', '1+(-i)*a');
        assert.equal(simplifyExpression('a - (-2i)*z','all'),'a + 2i*z', 'a - (-2i)*z');
        var t = Numbas.jme.compile('a - w*conj(z)');
        t = Numbas.jme.substituteTree(t, new Numbas.jme.Scope([{variables: {w: Numbas.jme.builtinScope.evaluate('-2i')}}]),true);
        var ruleset = Numbas.jme.collectRuleset('basic',Numbas.jme.builtinScope.allRulesets());
        assert.equal(Numbas.jme.display.treeToJME(Numbas.jme.display.simplifyTree(t, ruleset, Numbas.jme.builtinScope)), 'a + 2i*conj(z)');
    });

    QUnit.test('localisation doesn\'t affect treeToJME', function(assert) {
        var notation = Numbas.locale.default_number_notation;
        Numbas.locale.default_number_notation = ['plain-eu'];
        assert.equal(Numbas.jme.display.treeToJME(Numbas.jme.compile('1.234')), '1.234', '1.234');
        assert.equal(Numbas.jme.display.treeToJME({tok: Numbas.jme.builtinScope.evaluate('3.1+2.3i')}), '3.1 + 2.3i', '3.1 + 2.3i');
        Numbas.locale.default_number_notation = notation;
    })

    QUnit.test('large product',function(assert) {
        function simplifyExpression(expr,rules) {
            return Numbas.jme.display.simplifyExpression(expr,rules || '',Numbas.jme.builtinScope);
        }
        assert.equal(simplifyExpression('(x+1)(x-2)(x+3)(x+4)','all,canonicalOrder,expandBrackets,!noLeadingMinus'),'x^4 + 6*x^3 + 3*x^2 - 26x - 24','Large product with a negative term expanded and collected: (x+1)(x-2)(x+3)(x+4)');
    })

    QUnit.test('texName', function(assert) {
        var names = [
            {name: 'x', tex: 'x'},
            {name: 'x', annotations: ['op'] , tex: '\\operatorname{x}'},
            {name: 'xy', tex: '\\texttt{xy}'},
            {name: 'xyz', tex: '\\texttt{xyz}'},
            {name: 'x1', tex: 'x_{1}'},
            {name: 'x1234', tex: 'x_{1234}'},
            {name: 'x1\'', tex: 'x_{1}\''},
            {name: 'x_1', tex: 'x_{1}'},
            {name: 'x_12345', tex: 'x_{12345}'},
            {name: 'x_123\'\'', tex: 'x_{123}\'\''},
            {name: 'longname', tex: '\\texttt{longname}'},
            {name: 'ab_cd_ef', tex: '\\texttt{ab_cd_ef}'},
            {name: 'x_abc', tex: '\\texttt{x_abc}'},
            {name: 'x_abc\'', tex: '\\texttt{x_abc\'}'},
            {name: 'lambda', tex: '\\lambda'},
            {name: 'lambda1', tex: '\\lambda_{1}'},
            {name: 'lambda\'', tex: '\\lambda\''},
            {name: 'x_y\'', tex: 'x_{y}\''},
            {name: 'x_1', tex: '\\dot{x}_{1}', annotations: ['dot'], description: 'annotations only apply to the root, not subscripts'}
        ]

        var texifier = new Numbas.jme.display.Texifier();

        names.forEach(function(n) {
            var tok = new jme.types.TName(n.name,n.annotations);
            assert.equal(texifier.texName(tok),n.tex, n.description || ('texName '+n.name));
        });
    });

    QUnit.test('texify', function(assert) {
        function mixedfrac(expr) {
            return Numbas.jme.display.texify({tok: Numbas.jme.builtinScope.evaluate(expr)},{mixedfractions:true,fractionnumbers:true}, Numbas.jme.builtinScope);
        }
        function texify(tree,settings) {
            return Numbas.jme.display.texify(tree,settings,Numbas.jme.builtinScope);
        }
        assert.equal(mixedfrac('1/2'),'\\frac{1}{2}','1/2');
        assert.equal(mixedfrac('3/2'),'1 \\frac{1}{2}','3/2');
        assert.equal(mixedfrac('-76/11'),'-6 \\frac{10}{11}','-76/11');
        assert.equal(mixedfrac('1234567/123'),'10037 \\frac{16}{123}','1234567/123');
        assert.equal(mixedfrac('3i/2'),'1 \\frac{1}{2} i','3i/2');

        var tree = Numbas.jme.builtinScope.evaluate('substitute(["c":expression("x+1")],expression("1/c"))');
        assert.equal(texify(tree.tree),"\\frac{ 1 }{ x + 1 }",'texify substituted expression');
        assert.equal(texify({tok:tree}),"\\frac{ 1 }{ x + 1 }",'texify works on TExpressions');

        assert.equal(texify({tok: Numbas.jme.builtinScope.evaluate('3-9*(11*(1/33))')},{fractionnumbers:true}),'0','not minus 0');

        assert.equal(texify(Numbas.jme.compile('-2x')),'-2 x','-2x');

        assert.equal(texify(Numbas.jme.compile('-(x-2)e^x')),'-\\left ( x - 2 \\right ) e^{ x }','-(x-2)e^x');
        assert.equal(texify(Numbas.jme.compile('+(x-2)e^x')),'+\\left ( x - 2 \\right ) e^{ x }','+(x-2)e^x');
        assert.equal(texify({tok:Numbas.jme.builtinScope.evaluate('latex("\\{"+1+"\\}")')}),'{1}','slashes removed before braces in raw latex')
        assert.equal(texify({tok:Numbas.jme.builtinScope.evaluate('latex(safe("\\{"+1+"\\}"))')}),'\\{1\\}','slashes retained before curly braces in safe latex')
        assert.equal(texify({tok:Numbas.jme.builtinScope.evaluate('set(1,2)')}),'\\left\\{ 1, 2 \\right\\}','texify a set')
    });

    QUnit.test('expression to LaTeX', function(assert) {
        function exprToLaTeX(expr,rules) {
            return Numbas.jme.display.exprToLaTeX(expr,rules || '',Numbas.jme.builtinScope);
        }
        assert.equal(exprToLaTeX('-2+i'),'-2 + i','-2+i -- interaction of unary minus with complex number');
        assert.equal(exprToLaTeX('1+i +(-2+2i)','collectComplex'),'1 + i - 2 + 2 i','1+i +(-2+2i) -- interaction of minus with complex number');
        assert.equal(exprToLaTeX('1-i +(-2+2i)','collectComplex'),'1 - i - 2 + 2 i','1+i +(-2+2i) -- interaction of minus with complex number');
        assert.equal(exprToLaTeX('10000000000000000000000000'),'1 \\times 10^{25}','scientific notation - 1*e^25');
        assert.equal(exprToLaTeX('47652000000000000000000000'),'4.7652 \\times 10^{25}','scientific notation - 4.7652*e^25');
        assert.equal(exprToLaTeX('ln(abs(x))'),'\\ln \\left | x \\right |','ln(abs(x)) - ln of absolute value has no parentheses');
        assert.equal(exprToLaTeX('ln(x)'),'\\ln \\left ( x \\right )','ln(x) - ln of anything else has parentheses');
        assert.equal(exprToLaTeX('4-(x^2+x+1)',[]),'4 - \\left ( x^{ 2 } + x + 1 \\right )','4-(x^2+x+1) - brackets round right-hand operand in subtraction kept when they\'re wrapping an addition.');
        assert.equal(exprToLaTeX('(x^2+x+1)-4',[]),'x^{ 2 } + x + 1 - 4','(x^2+x+1)-4 - brackets round left-hand operand in subtraction can be dropped.');
        assert.equal(exprToLaTeX('x-(-1.5)','fractionNumbers,all'),'x + \\frac{3}{2}','x-(-1.5) with args [fractionNumbers,all] - display flags get carried through properly');
        assert.equal(exprToLaTeX('x-(5-p)',[]),'x - \\left ( 5 - p \\right )','x-(5-p) - keep the brackets on the right');
        assert.equal(exprToLaTeX('3*5^2*19',['basic']),'3 \\times 5^{ 2 } \\times 19','3*5^2*19 with basic - always put a \\times between two digits')
        assert.equal(exprToLaTeX('exp(x)^2'),'\\left ( e^{ x } \\right )^{ 2 }','exp(x)^2 - put brackets round e^x')
        assert.equal(exprToLaTeX('-(-x)',[]),'-\\left ( -x \\right )','-(-x) - brackets around repeated minus')
        assert.equal(exprToLaTeX('+(-x)',[]),'+\\left ( -x \\right )','+(-x) - brackets around minus straight after addition')
        assert.equal(exprToLaTeX('3+(-2)',[]),'3 + \\left ( -2 \\right )','3+(-2) - brackets around minus on right side of addition')
        assert.equal(exprToLaTeX('3-(-2)',[]),'3 - \\left ( -2 \\right )','3-(-2) - brackets around minus on right side of subtraction')
        assert.equal(exprToLaTeX('2+(3+2)+(4-5)',[]),'2 + 3 + 2 + 4 - 5','don\'t put brackets round nested addition and subtraction')
        assert.equal(exprToLaTeX('lambda1\'(x)'),'\\lambda_{1}\' \\left ( x \\right )','texName works on function names');
        assert.equal(exprToLaTeX('lambda * theta'),'\\lambda \\theta','lambda * theta - don\'t put a multiplication symbol between greek letters');
        assert.equal(exprToLaTeX('x * xy'), 'x \\times \\texttt{xy}','x * xy - put a times symbol when multiplying by a long name');
        assert.equal(exprToLaTeX('long_function_name(x)'),'\\operatorname{long\\_function\\_name} \\left ( x \\right )','long function names are wrapped in \\operatorname');
        assert.equal(exprToLaTeX('fact(3)*fact(2)'),'3! \\times 2!','times sign between factorials');
        assert.equal(exprToLaTeX('not a'),'\\neg a','logical NOT');
        assert.equal(exprToLaTeX('7*(5x+y)'),'7 \\left ( 5 x + y \\right )','don\'t insert times symbol when there\'s a bracket');
        assert.equal(exprToLaTeX('(5 + 9i)*(2 + 7)'),'\\left ( 5 + 9 i \\right ) \\left ( 2 + 7 \\right )','put brackets around complex numbers when multiplying and neither Re nor Im are zero');
        assert.equal(exprToLaTeX('(-7+9i)*(x+1)'), '\\left ( -7 + 9 i \\right ) \\left ( x + 1 \\right )','don\'t unnecessarily take unary minus out when it\'s on a complex number');
        assert.equal(exprToLaTeX('(0.5)^3','fractionNumbers'), '\\left ( \\frac{1}{2} \\right )^{ 3 }', 'bracket fractions taken to a power');
        assert.equal(exprToLaTeX('(5)^3','fractionNumbers'), '5^{ 3 }', 'don\'t bracket whole numbers taken to a power');
        assert.equal(exprToLaTeX('(1+i)^3','fractionNumbers'), '\\left ( 1 + i \\right )^{ 3 }', 'bracket complex numbers taken to a power');
        assert.equal(exprToLaTeX('2*e^2'),'2 e^{ 2 }','');
        assert.equal(exprToLaTeX('2 * pi'), '2 \\pi','');
        assert.equal(exprToLaTeX('2 * e'), '2 e','');
        assert.equal(exprToLaTeX('2*(i^3)'), '2 i^{ 3 }','');
        assert.equal(exprToLaTeX('x*i'), 'x i','');
        assert.equal(exprToLaTeX('x*i','alwaystimes'), 'x \\times i','');
        assert.equal(exprToLaTeX('2^3 * 2^3 * 2^3','basic'),'2^{ 3 } \\times 2^{ 3 } \\times 2^{ 3 }','several consecutive multiplications');
        assert.equal(exprToLaTeX('sin(x)^5'),'\\sin^{5}\\left( x \\right)','trig function to a positive integer power');
        assert.equal(exprToLaTeX('sin(x)^(-1)'),'\\sin \\left ( x \\right )^{ -1 }','trig function to a positive integer power');
        assert.equal(exprToLaTeX('infinity',''),'\\infty','infinity');
        assert.equal(exprToLaTeX('infinity','fractionNumbers'),'\\infty','infinity with fractionNumbers');
        assert.equal(exprToLaTeX('e','fractionNumbers'),'e','e with fractionNumbers');
        assert.equal(exprToLaTeX('pi','fractionNumbers'),'\\pi','pi with fractionNumbers');
        assert.equal(exprToLaTeX('e^(3x)','fractionNumbers'),'e^{ 3 x }','e^(3x) with fractionNumbers');
        assert.equal(exprToLaTeX('e*i',''),'e i','e*i');
        assert.equal(exprToLaTeX('2/4','flatFractions'),'\\left. 2 \\middle/ 4 \\right.','');
        assert.equal(exprToLaTeX('(2 + 3)/(a + b)','flatFractions'),'\\left. \\left ( 2 + 3 \\right ) \\middle/ \\left ( a + b \\right ) \\right.','');
        assert.equal(exprToLaTeX('matrix([1,1]) + matrix([1]) + (-5)matrix([1])','all'),'\\begin{pmatrix} 1, & 1 \\end{pmatrix} - 4 \\begin{pmatrix} 1 \\end{pmatrix}','matrix([1,1]) + matrix([1]) + (-5)matrix([1])');
        assert.equal(exprToLaTeX('x*(x+1)',''),'x \\times \\left ( x + 1 \\right )','x*(x+1)');
        assert.equal(exprToLaTeX('-2x','all'),'-2 x','-2 x');
        assert.equal(exprToLaTeX('Gamma gamma',''),'\\Gamma \\gamma', 'Gamma gamma');

        var s = new Numbas.jme.Scope([Numbas.jme.builtinScope, {variables: {
          a: Numbas.jme.builtinScope.evaluate('1+8i'),
          b: Numbas.jme.builtinScope.evaluate('6+11i')
        }}]);
        var t3 = Numbas.jme.substituteTree(Numbas.jme.compile('-a'),s)
        var tex3 = Numbas.jme.display.texify(t3);
        assert.equal(tex3,"-1 -8 i",'unary minus complex number');
        var t1 = Numbas.jme.substituteTree(Numbas.jme.compile('(-a)*(-b)'),s)
        var tex1 = Numbas.jme.display.texify(t1);
        assert.equal(tex1,"\\left ( -1 -8 i \\right ) \\left ( -6 -11 i \\right )",'unary minus complex number and brackets');
        var t2 = Numbas.jme.substituteTree(Numbas.jme.compile('a*b'),s)
        var tex2 = Numbas.jme.display.texify(t2);
        assert.equal(tex2,"\\left ( 1 + 8 i \\right ) \\left ( 6 + 11 i \\right )",'complex number and brackets');

        var s = new Numbas.jme.Scope([Numbas.jme.builtinScope, {variables: {
          a: Numbas.jme.builtinScope.evaluate('1+dec(8)i'),
          b: Numbas.jme.builtinScope.evaluate('6+dec(11)i')
        }}]);
        var t3 = Numbas.jme.substituteTree(Numbas.jme.compile('-a'),s)
        var tex3 = Numbas.jme.display.texify(t3);
        assert.equal(tex3,"-1 -8 i",'unary minus complex number decimals');
        var t1 = Numbas.jme.substituteTree(Numbas.jme.compile('(-a)*(-b)'),s)
        var tex1 = Numbas.jme.display.texify(t1);
        assert.equal(tex1,"\\left ( -1 -8 i \\right ) \\left ( -6 -11 i \\right )",'unary minus complex number and brackets decimals');
        var t2 = Numbas.jme.substituteTree(Numbas.jme.compile('a*b'),s)
        var tex2 = Numbas.jme.display.texify(t2);
        assert.equal(tex2,"\\left ( 1 + 8 i \\right ) \\left ( 6 + 11 i \\right )",'complex number and brackets decimals');
    });

    QUnit.module('Documentation');
    QUnit.test('Coverage',function(assert) {
        var fn_names = [];
        doc_tests.forEach(function(d) {
            d.fns.map(function(f) { 
                fn_names.push(f.name);
                f.calling_patterns.forEach(function(c) {
                    var m = c.match(/(.*)\(/);
                    if(m && m[1]!=f.name) {
                        fn_names.push(m[1]);
                    }
                });
            });
        });

        var documented = {};
        documented['+u'] = true;
        documented['-u'] = true;
        fn_names.forEach(function(n) {
            documented[n.toLowerCase()] = true;
        });

        var defined = Numbas.jme.builtinScope.allFunctions();
        for(var x in Numbas.jme.opSynonyms) {
            defined[x] = true;
        }
        for(var x in Numbas.jme.funcSynonyms) {
            defined[x] = true;
        }
        for(var x in Numbas.jme.prefixForm) {
            defined[x] = true;
        }
        for(var x in Numbas.jme.postfixForm) {
            defined[x] = true;
        }

        var defined_undocumented = Object.keys(defined).filter(function(n) {
            n = Numbas.jme.opSynonyms[n] || Numbas.jme.funcSynonyms[n] || n;
            return !documented[n.toLowerCase()]; 
        });
        assert.deepEqual(defined_undocumented, [], "No undocumented functions");
        if(defined_undocumented.length) {
            console.log('Defined but undocumented functions:\n'+defined_undocumented.join('\n'));
            console.log('Documented functions: ',documented);
        }

        var documented_undefined = fn_names.filter(function(n) {
            n = Numbas.jme.opSynonyms[n] || Numbas.jme.funcSynonyms[n] || n;
            return defined[n.toLowerCase()]===undefined 
        });
        assert.ok(documented_undefined.length==0,"No documented but undefined functions");
        if(documented_undefined.length) {
            console.log('Documented but undefined functions:', documented_undefined);
        }
    });

    doc_tests.forEach(function(section) {
        QUnit.module('Docs: '+section.name);
        section.fns.forEach(function(fn) {
            if(fn.examples.length) {
                QUnit.test(fn.name,function(assert) {
                    fn.examples.forEach(function(example) {
                        var res = Numbas.jme.builtinScope.evaluate(example.in);
                        var out = Numbas.jme.display.treeToJME({tok: res}, {ignorestringattributes: true, wrapexpressions: true});
                        function clean(expr) {
                            return expr.replace(/\s/g,'');
                        }
                        assert.equal(clean(out),clean(example.out),example.in);
                    });
                });
            }
        });
    });
});

