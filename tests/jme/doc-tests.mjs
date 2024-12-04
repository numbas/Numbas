export default
[
    {
        "name": "Anonymous functions",
        "fns": [
            {
                "name": "->",
                "keywords": [
                    ""
                ],
                "noexamples": false,
                "calling_patterns": [
                    "names -> expression"
                ],
                "examples": [
                    {
                        "in": "(x -> x+1)(2)",
                        "out": "3"
                    },
                    {
                        "in": "((x,y) -> sqrt(x^2 + y^2))(3, 4)",
                        "out": "5"
                    },
                    {
                        "in": "([a,b] -> a + b)([1,2])",
                        "out": "3"
                    }
                ]
            }
        ]
    },
    {
        "name": "Arithmetic",
        "fns": [
            {
                "name": "+",
                "keywords": [
                    "add",
                    "plus"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x+y"
                ],
                "examples": [
                    {
                        "in": "1+2",
                        "out": "3"
                    },
                    {
                        "in": "vector(1,2)+vector(3,4)",
                        "out": "vector(4,6)"
                    },
                    {
                        "in": "matrix([1,2],[3,4])+matrix([5,6],[7,8])",
                        "out": "matrix([6,8],[10,12])"
                    },
                    {
                        "in": "[1,2,3]+4",
                        "out": "[1,2,3,4]"
                    },
                    {
                        "in": "[1,2,3]+[4,5,6]",
                        "out": "[1,2,3,4,5,6]"
                    },
                    {
                        "in": "\"hi \"+\"there\"",
                        "out": "\"hi there\""
                    }
                ]
            },
            {
                "name": "-",
                "keywords": [
                    "subtraction",
                    "minus"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x-y"
                ],
                "examples": [
                    {
                        "in": "1-2",
                        "out": "-1"
                    },
                    {
                        "in": "vector(3,2)-vector(1,4)",
                        "out": "vector(2,-2)"
                    },
                    {
                        "in": "matrix([5,6],[3,4])-matrix([1,2],[7,8])",
                        "out": "matrix([4,4],[-4,-4])"
                    }
                ]
            },
            {
                "name": "*",
                "keywords": [
                    "times",
                    "multiply",
                    "multiplication",
                    "product"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x*y"
                ],
                "examples": [
                    {
                        "in": "1*2",
                        "out": "2"
                    },
                    {
                        "in": "2*vector(1,2,3)",
                        "out": "vector(2,4,6)"
                    },
                    {
                        "in": "matrix([1,2],[3,4])*2",
                        "out": "matrix([2,4],[6,8])"
                    },
                    {
                        "in": "matrix([1,2],[3,4])*vector(1,2)",
                        "out": "vector(5,11)"
                    }
                ]
            },
            {
                "name": "/",
                "keywords": [
                    "divide",
                    "division",
                    "quotient",
                    "ratio"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x/y"
                ],
                "examples": [
                    {
                        "in": "1.2/3",
                        "out": "0.4"
                    }
                ]
            },
            {
                "name": "^",
                "keywords": [
                    "power",
                    "exponential"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x^y"
                ],
                "examples": [
                    {
                        "in": "3^2",
                        "out": "9"
                    },
                    {
                        "in": "e^(pi * i)",
                        "out": "-1"
                    }
                ]
            },
            {
                "name": "exp",
                "keywords": [
                    "power",
                    "exponential"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "exp(x)"
                ],
                "examples": [
                    {
                        "in": "exp(1)",
                        "out": "e"
                    }
                ]
            }
        ]
    },
    {
        "name": "Number operations",
        "fns": [
            {
                "name": "decimal",
                "keywords": [
                    ""
                ],
                "noexamples": true,
                "calling_patterns": [
                    "decimal(n)",
                    "decimal(x)",
                    "dec(x)"
                ],
                "examples": []
            },
            {
                "name": "rational",
                "keywords": [
                    ""
                ],
                "noexamples": false,
                "calling_patterns": [
                    "rational(n)"
                ],
                "examples": [
                    {
                        "in": "rational(pi)",
                        "out": "355/113"
                    }
                ]
            },
            {
                "name": "int",
                "keywords": [
                    "integer"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "int(n)"
                ],
                "examples": [
                    {
                        "in": "int(3.0)",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "abs",
                "keywords": [
                    "absolute value",
                    "modulus",
                    "length",
                    "size"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "abs(x)",
                    "len(x)",
                    "length(x)"
                ],
                "examples": [
                    {
                        "in": "abs(-8)",
                        "out": "8"
                    },
                    {
                        "in": "abs(3-4i)",
                        "out": "5"
                    },
                    {
                        "in": "abs(\"Hello\")",
                        "out": "5"
                    },
                    {
                        "in": "abs([1,2,3])",
                        "out": "3"
                    },
                    {
                        "in": "len([1,2,3])",
                        "out": "3"
                    },
                    {
                        "in": "len(set([1,2,2]))",
                        "out": "2"
                    },
                    {
                        "in": "length(vector(3,4))",
                        "out": "5"
                    },
                    {
                        "in": "abs(vector(3,4,12))",
                        "out": "13"
                    },
                    {
                        "in": "len([\"a\": 1, \"b\": 2, \"c\": 1])",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "arg",
                "keywords": [
                    "argument",
                    "direction"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "arg(z)"
                ],
                "examples": [
                    {
                        "in": "arg(-1)",
                        "out": "pi"
                    }
                ]
            },
            {
                "name": "re",
                "keywords": [
                    "real part"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "re(z)"
                ],
                "examples": [
                    {
                        "in": "re(1+2i)",
                        "out": "1"
                    }
                ]
            },
            {
                "name": "im",
                "keywords": [
                    "imaginary part"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "im(z)"
                ],
                "examples": [
                    {
                        "in": "im(1+2i)",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "conj",
                "keywords": [
                    "conjugate",
                    "complex"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "conj(z)"
                ],
                "examples": [
                    {
                        "in": "conj(1+i)",
                        "out": "1-i"
                    }
                ]
            },
            {
                "name": "isint",
                "keywords": [
                    "integer",
                    "test"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "isint(x)"
                ],
                "examples": [
                    {
                        "in": "isint(4.0)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "iszero",
                "keywords": [
                    "integer",
                    "test",
                    "zero"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "iszero(n)"
                ],
                "examples": [
                    {
                        "in": "iszero(0)",
                        "out": "true"
                    },
                    {
                        "in": "iszero(1)",
                        "out": "false"
                    },
                    {
                        "in": "iszero(dec(0))",
                        "out": "true"
                    },
                    {
                        "in": "iszero(sin(pi/2)-1)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "sqrt",
                "keywords": [
                    "square root"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sqrt(x)",
                    "sqr(x)"
                ],
                "examples": [
                    {
                        "in": "sqrt(4)",
                        "out": "2"
                    },
                    {
                        "in": "sqrt(-1)",
                        "out": "i"
                    }
                ]
            },
            {
                "name": "root",
                "keywords": [
                    "root",
                    "power"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "root(x,n)"
                ],
                "examples": [
                    {
                        "in": "root(8,3)",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "ln",
                "keywords": [
                    "logarithm",
                    "natural"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "ln(x)"
                ],
                "examples": [
                    {
                        "in": "ln(e)",
                        "out": "1"
                    }
                ]
            },
            {
                "name": "log",
                "keywords": [
                    "logarithm",
                    "arbitrary",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "log(x,b)"
                ],
                "examples": [
                    {
                        "in": "log(100)",
                        "out": "2"
                    },
                    {
                        "in": "log(343,7)",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "degrees",
                "keywords": [
                    "radians",
                    "convert",
                    "angle"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "degrees(x)"
                ],
                "examples": [
                    {
                        "in": "degrees(pi/2)",
                        "out": "90"
                    }
                ]
            },
            {
                "name": "radians",
                "keywords": [
                    "degrees",
                    "convert",
                    "angle"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "radians(x)"
                ],
                "examples": [
                    {
                        "in": "radians(180)",
                        "out": "pi"
                    }
                ]
            },
            {
                "name": "sign",
                "keywords": [
                    "positive",
                    "negative"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sign(x)",
                    "sgn(x)"
                ],
                "examples": [
                    {
                        "in": "sign(3)",
                        "out": "1"
                    },
                    {
                        "in": "sign(-3)",
                        "out": "-1"
                    }
                ]
            },
            {
                "name": "max",
                "keywords": [
                    "maximum"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "max(a,b)"
                ],
                "examples": [
                    {
                        "in": "max(46,2)",
                        "out": "46"
                    },
                    {
                        "in": "max([1,2,3])",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "min",
                "keywords": [
                    "minimum"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "min(a,b)",
                    "min(numbers)"
                ],
                "examples": [
                    {
                        "in": "min(3,2)",
                        "out": "2"
                    },
                    {
                        "in": "min([1,2,3])",
                        "out": "1"
                    },
                    {
                        "in": "min(1/2, 2/3)",
                        "out": "1/2"
                    }
                ]
            },
            {
                "name": "clamp",
                "keywords": [
                    "restrict"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "clamp(x,a,b)"
                ],
                "examples": [
                    {
                        "in": "clamp(1,0,2)",
                        "out": "1"
                    },
                    {
                        "in": "clamp(-1,0,2)",
                        "out": "0"
                    },
                    {
                        "in": "clamp(3,0,2)",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "precround",
                "keywords": [
                    "round",
                    "decimal",
                    "places"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "precround(n,d)"
                ],
                "examples": [
                    {
                        "in": "precround(pi,5)",
                        "out": "3.14159"
                    },
                    {
                        "in": "precround(21.3,5)",
                        "out": "21.30000"
                    },
                    {
                        "in": "precround(matrix([[0.123,4.56],[54,98.765]]),2)",
                        "out": "matrix([0.12,4.56],[54.00,98.77])"
                    },
                    {
                        "in": "precround(vector(1/3,2/3),1)",
                        "out": "vector(0.3,0.7)"
                    }
                ]
            },
            {
                "name": "siground",
                "keywords": [
                    "round",
                    "significant",
                    "figures"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "siground(n,f)"
                ],
                "examples": [
                    {
                        "in": "siground(pi,3)",
                        "out": "3.14"
                    },
                    {
                        "in": "siground(21.3,5)",
                        "out": "21.300"
                    },
                    {
                        "in": "siground(matrix([[0.123,4.56],[54,98.765]]),2)",
                        "out": "matrix([0.12,4.6],[54,99])"
                    },
                    {
                        "in": "siground(vector(10/3,20/3,1),2)",
                        "out": "vector(3.3,6.7,1.0)"
                    }
                ]
            },
            {
                "name": "with_precision",
                "keywords": [
                    "precision"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "with_precision(n, precision, precisionType)"
                ],
                "examples": []
            },
            {
                "name": "imprecise",
                "keywords": [
                    "precision"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "imprecise(n)"
                ],
                "examples": []
            },
            {
                "name": "withintolerance",
                "keywords": [
                    "close",
                    "near",
                    "tolerance"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "withintolerance(a,b,t)"
                ],
                "examples": [
                    {
                        "in": "withintolerance(pi,22/7,0.1)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "dpformat",
                "keywords": [
                    "string",
                    "format",
                    "decimal",
                    "places",
                    "write"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "dpformat(n,d,[style])"
                ],
                "examples": [
                    {
                        "in": "dpformat(1.2,4)",
                        "out": "\"1.2000\""
                    }
                ]
            },
            {
                "name": "countdp",
                "keywords": [
                    "decimal",
                    "places"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "countdp(n)"
                ],
                "examples": [
                    {
                        "in": "countdp(\"1.0\")",
                        "out": "1"
                    },
                    {
                        "in": "countdp(\"1\")",
                        "out": "0"
                    },
                    {
                        "in": "countdp(\"not a number\")",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "sigformat",
                "keywords": [
                    "string",
                    "format",
                    "significant",
                    "figures",
                    "write"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sigformat(n,d,[style])"
                ],
                "examples": [
                    {
                        "in": "sigformat(4,3)",
                        "out": "\"4.00\""
                    }
                ]
            },
            {
                "name": "countsigfigs",
                "keywords": [
                    "significant",
                    "figures"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "countsigfigs(n)"
                ],
                "examples": [
                    {
                        "in": "countsigfigs(\"1\")",
                        "out": "1"
                    },
                    {
                        "in": "countsigfigs(\"100\")",
                        "out": "1"
                    },
                    {
                        "in": "countsigfigs(\"1.0\")",
                        "out": "2"
                    },
                    {
                        "in": "countsigfigs(\"not a number\")",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "togivenprecision",
                "keywords": [
                    "test",
                    "precision",
                    "significant",
                    "figures",
                    "decimal",
                    "places"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "togivenprecision(str, precisionType, precision, strict)"
                ],
                "examples": [
                    {
                        "in": "togivenprecision(\"1\",\"dp\",1,true)",
                        "out": "false"
                    },
                    {
                        "in": "togivenprecision(\"1\",\"dp\",1,false)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision(\"1.0\",\"dp\",1,true)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision(\"100\",\"sigfig\",1,true)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision(\"100\",\"sigfig\",3,true)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "togivenprecision_scientific",
                "keywords": [
                    "test",
                    "precision",
                    "significant",
                    "figures",
                    "decimal",
                    "places"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "togivenprecision_scientific(str, precisionType, precision)"
                ],
                "examples": [
                    {
                        "in": "togivenprecision_scientific(\"1e2\",\"dp\",0)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision_scientific(\"1.0e2\",\"dp\",0)",
                        "out": "false"
                    },
                    {
                        "in": "togivenprecision_scientific(\"1.0e2\",\"dp\",1)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision_scientific(\"1e2\",\"sigfig\",1)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision_scientific(\"1.0e2\",\"sigfig\",1)",
                        "out": "false"
                    },
                    {
                        "in": "togivenprecision_scientific(\"1.0e2\",\"sigfig\",2)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision_scientific(\"1.23e2\",\"sigfig\",3)",
                        "out": "true"
                    },
                    {
                        "in": "togivenprecision_scientific(\"1.23e2\",\"dp\",2)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "tonearest",
                "keywords": [
                    "round",
                    "multiple",
                    "nearest"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "tonearest(a,b)"
                ],
                "examples": [
                    {
                        "in": "tonearest(1.234,0.1)",
                        "out": "1.2"
                    }
                ]
            },
            {
                "name": "formatnumber",
                "keywords": [
                    "string",
                    "number",
                    "write",
                    "convert"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "formatnumber(n,style)"
                ],
                "examples": [
                    {
                        "in": "formatnumber(1234.567,\"eu\")",
                        "out": "\"1.234,567\""
                    }
                ]
            },
            {
                "name": "scientificnumberlatex",
                "keywords": [
                    "latex",
                    "string",
                    "write",
                    "convert"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "scientificnumberlatex(n)"
                ],
                "examples": [
                    {
                        "in": "scientificnumberlatex(123)",
                        "out": "\"1.23 \\\\times 10^{2}\""
                    }
                ]
            },
            {
                "name": "scientificnumberhtml",
                "keywords": [
                    "html",
                    "convert",
                    "write",
                    "number"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "scientificnumberhtml(n)"
                ],
                "examples": [
                    {
                        "in": "scientificnumberhtml(123)",
                        "out": "html(safe(\"<span data-interactive=\\\"false\\\">1.23 \u00d7 10<sup>2</sup></span>\"))"
                    }
                ]
            },
            {
                "name": "cleannumber",
                "keywords": [
                    "strip",
                    "trim",
                    "validate",
                    "number"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "cleannumber(str, styles)"
                ],
                "examples": [
                    {
                        "in": "cleannumber(\"100 000,02\",[\"si-fr\"])",
                        "out": "\"100000.02\""
                    },
                    {
                        "in": "cleannumber(\" 1 \")",
                        "out": "\"1\""
                    },
                    {
                        "in": "cleannumber(\"1.0\")",
                        "out": "\"1.0\""
                    }
                ]
            },
            {
                "name": "matchnumber",
                "keywords": [
                    "test",
                    "number",
                    "representation",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "matchnumber(str,styles)"
                ],
                "examples": [
                    {
                        "in": "matchnumber(\"1.234\",[\"plain\",\"eu\"])",
                        "out": "[ \"1.234\", 1.234 ]"
                    },
                    {
                        "in": "matchnumber(\"1,234\",[\"plain\",\"eu\"])",
                        "out": "[ \"1,234\", 1.234 ]"
                    },
                    {
                        "in": "matchnumber(\"5 000 things\",[\"plain\",\"si-en\"])",
                        "out": "[ \"5 000\", 5000 ]"
                    },
                    {
                        "in": "matchnumber(\"apple\",[\"plain\"])",
                        "out": "[ \"\", NaN ]"
                    }
                ]
            },
            {
                "name": "parsenumber",
                "keywords": [
                    "parse",
                    "convert",
                    "number",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "parsenumber(string,style)"
                ],
                "examples": [
                    {
                        "in": "parsenumber(\"1 234,567\",\"si-fr\")",
                        "out": "1234.567"
                    },
                    {
                        "in": "parsenumber(\"1.001\",[\"si-fr\",\"eu\"])",
                        "out": "1001"
                    }
                ]
            },
            {
                "name": "parsenumber_or_fraction",
                "keywords": [
                    "parse",
                    "convert",
                    "number",
                    "fraction",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "parsenumber_or_fraction(string,style)"
                ],
                "examples": [
                    {
                        "in": "parsenumber_or_fraction(\"1/2\")",
                        "out": "0.5"
                    }
                ]
            },
            {
                "name": "parsedecimal",
                "keywords": [
                    "parse",
                    "convert",
                    "number",
                    "decimal",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "parsedecimal(string,style)"
                ],
                "examples": [
                    {
                        "in": "parsedecimal(\"1 234,567\",\"si-fr\")",
                        "out": "dec(\"1234.567\")"
                    },
                    {
                        "in": "parsedecimal(\"1.001\",[\"si-fr\",\"eu\"])",
                        "out": "dec(\"1001\")"
                    }
                ]
            },
            {
                "name": "parsedecimal_or_fraction",
                "keywords": [
                    "parse",
                    "convert",
                    "number",
                    "decimal",
                    "string",
                    "fraction"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "parsedecimal_or_fraction(string,style)"
                ],
                "examples": [
                    {
                        "in": "parsedecimal_or_fraction(\"1/2\")",
                        "out": "dec(\"0.5\")"
                    }
                ]
            },
            {
                "name": "tobinary",
                "keywords": [
                    "convert",
                    "number",
                    "binary",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "tobinary(n)"
                ],
                "examples": [
                    {
                        "in": "tobinary(13)",
                        "out": "\"1101\""
                    }
                ]
            },
            {
                "name": "tooctal",
                "keywords": [
                    "convert",
                    "number",
                    "octal",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "tooctal(n)"
                ],
                "examples": [
                    {
                        "in": "tooctal(13)",
                        "out": "\"15\""
                    }
                ]
            },
            {
                "name": "tohexadecimal",
                "keywords": [
                    "convert",
                    "number",
                    "hexadecimal",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "tohexadecimal(n)"
                ],
                "examples": [
                    {
                        "in": "tohexadecimal(44)",
                        "out": "\"2c\""
                    }
                ]
            },
            {
                "name": "tobase",
                "keywords": [
                    "convert",
                    "number",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "tobase(n,base)"
                ],
                "examples": [
                    {
                        "in": "tobase(13,4)",
                        "out": "\"31\""
                    },
                    {
                        "in": "tobase(13,5)",
                        "out": "\"23\""
                    },
                    {
                        "in": "tobase(50,20)",
                        "out": "\"2a\""
                    }
                ]
            },
            {
                "name": "frombinary",
                "keywords": [
                    "convert",
                    "number",
                    "binary",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "frombinary(s)"
                ],
                "examples": [
                    {
                        "in": "frombinary(\"1010\")",
                        "out": "10"
                    }
                ]
            },
            {
                "name": "fromoctal",
                "keywords": [
                    "convert",
                    "number",
                    "octal",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "fromoctal(s)"
                ],
                "examples": [
                    {
                        "in": "fromoctal(\"54\")",
                        "out": "44"
                    }
                ]
            },
            {
                "name": "fromhexadecimal",
                "keywords": [
                    "convert",
                    "number",
                    "hexadecimal",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "fromhexadecimal(s)"
                ],
                "examples": [
                    {
                        "in": "fromhexadecimal(\"b4\")",
                        "out": "180"
                    }
                ]
            },
            {
                "name": "frombase",
                "keywords": [
                    "convert",
                    "number",
                    "string",
                    "base"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "frombase(s,base)"
                ],
                "examples": [
                    {
                        "in": "frombase(\"b4\",20)",
                        "out": "224"
                    },
                    {
                        "in": "frombase(\"321\",5)",
                        "out": "86"
                    },
                    {
                        "in": "frombase(\"621\",5)",
                        "out": "NaN"
                    }
                ]
            },
            {
                "name": "isnan",
                "keywords": [
                    "test",
                    "number",
                    "validate",
                    "invalid"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "isnan(n)"
                ],
                "examples": [
                    {
                        "in": "isnan(1)",
                        "out": "false"
                    },
                    {
                        "in": "isnan(parsenumber(\"a\",\"en\"))",
                        "out": "true"
                    }
                ]
            }
        ]
    },
    {
        "name": "Trigonometry",
        "fns": [
            {
                "name": "sin",
                "keywords": [
                    "sine",
                    "trigonometry",
                    "trigonometric"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sin(x)"
                ],
                "examples": [
                    {
                        "in": "sin(0)",
                        "out": "0"
                    },
                    {
                        "in": "sin(pi/2)",
                        "out": "1"
                    }
                ]
            },
            {
                "name": "cos",
                "keywords": [
                    "cosine",
                    "trigonometry",
                    "trigonometric"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "cos(x)"
                ],
                "examples": [
                    {
                        "in": "cos(0)",
                        "out": "1"
                    },
                    {
                        "in": "cos(pi/2)",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "tan",
                "keywords": [
                    "tangent",
                    "trigonometry",
                    "trigonometric"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "tan(x)"
                ],
                "examples": [
                    {
                        "in": "tan(0)",
                        "out": "0"
                    },
                    {
                        "in": "tan(pi/4)",
                        "out": "1"
                    }
                ]
            },
            {
                "name": "cosec",
                "keywords": [
                    "cosecant",
                    "trigonometry",
                    "trigonometric"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "cosec(x)"
                ],
                "examples": [
                    {
                        "in": "cosec(pi/2)",
                        "out": "1"
                    },
                    {
                        "in": "cosec(pi/6)",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "sec",
                "keywords": [
                    "trigonometry",
                    "trigonometric",
                    "secant"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sec(x)"
                ],
                "examples": [
                    {
                        "in": "sec(0)",
                        "out": "1"
                    },
                    {
                        "in": "sec(pi/3)",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "cot",
                "keywords": [
                    "trigonometry",
                    "trigonometric",
                    "cotangent"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "cot(x)"
                ],
                "examples": [
                    {
                        "in": "cot(pi/4)",
                        "out": "1"
                    }
                ]
            },
            {
                "name": "arcsin",
                "keywords": [
                    "trigonometry",
                    "trigonometric",
                    "arcsine",
                    "inverse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "arcsin(x)"
                ],
                "examples": [
                    {
                        "in": "arcsin(0)",
                        "out": "0"
                    },
                    {
                        "in": "arcsin(1)",
                        "out": "1.5707963268"
                    }
                ]
            },
            {
                "name": "arccos",
                "keywords": [
                    "trigonometry",
                    "trigonometric",
                    "arccosine",
                    "inverse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "arccos(x)"
                ],
                "examples": [
                    {
                        "in": "arccos(1)",
                        "out": "0"
                    },
                    {
                        "in": "arccos(0)",
                        "out": "1.5707963268"
                    }
                ]
            },
            {
                "name": "arctan",
                "keywords": [
                    "trigonometry",
                    "trigonometric",
                    "arctangent",
                    "inverse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "arctan(x)"
                ],
                "examples": [
                    {
                        "in": "arctan(0)",
                        "out": "0"
                    },
                    {
                        "in": "arctan(1)",
                        "out": "0.7853981634"
                    }
                ]
            },
            {
                "name": "atan2",
                "keywords": [
                    "trigonometry",
                    "trigonometric",
                    "arctangent",
                    "inverse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "atan2(y,x)"
                ],
                "examples": [
                    {
                        "in": "atan2(0,1)",
                        "out": "0"
                    },
                    {
                        "in": "atan2(sin(1),cos(1))",
                        "out": "1"
                    },
                    {
                        "in": "atan2(sin(pi/4), cos(pi/4)) / pi",
                        "out": "0.25"
                    },
                    {
                        "in": "atan2(sin(pi/4), -cos(pi/4)) / pi",
                        "out": "0.75"
                    }
                ]
            },
            {
                "name": "sinh",
                "keywords": [
                    "hyperbolic",
                    "sine"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sinh(x)"
                ],
                "examples": [
                    {
                        "in": "sinh(0)",
                        "out": "0"
                    },
                    {
                        "in": "sinh(1)",
                        "out": "1.1752011936"
                    }
                ]
            },
            {
                "name": "cosh",
                "keywords": [
                    "hyperbolic",
                    "cosine"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "cosh(x)"
                ],
                "examples": [
                    {
                        "in": "cosh(0)",
                        "out": "1"
                    },
                    {
                        "in": "cosh(1)",
                        "out": "1.5430806348"
                    }
                ]
            },
            {
                "name": "tanh",
                "keywords": [
                    "hyperbolic",
                    "tangent"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "tanh(x)"
                ],
                "examples": [
                    {
                        "in": "tanh(0)",
                        "out": "0"
                    },
                    {
                        "in": "tanh(1)",
                        "out": "0.761594156"
                    }
                ]
            },
            {
                "name": "cosech",
                "keywords": [
                    "hyperbolic",
                    "cosecant"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "cosech(x)"
                ],
                "examples": [
                    {
                        "in": "cosech(1)",
                        "out": "0.8509181282"
                    }
                ]
            },
            {
                "name": "sech",
                "keywords": [
                    "hyperbolic",
                    "secant"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sech(x)"
                ],
                "examples": [
                    {
                        "in": "sech(0)",
                        "out": "1"
                    },
                    {
                        "in": "sech(1)",
                        "out": "0.6480542737"
                    }
                ]
            },
            {
                "name": "coth",
                "keywords": [
                    "hyperbolic",
                    "tangent"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "coth(x)"
                ],
                "examples": [
                    {
                        "in": "coth(1)",
                        "out": "1.3130352855"
                    }
                ]
            },
            {
                "name": "arcsinh",
                "keywords": [
                    "hyperbolic",
                    "arcsine",
                    "inverse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "arcsinh(x)"
                ],
                "examples": [
                    {
                        "in": "arcsinh(0)",
                        "out": "0"
                    },
                    {
                        "in": "arcsinh(1)",
                        "out": "0.881373587"
                    }
                ]
            },
            {
                "name": "arccosh",
                "keywords": [
                    "hyperbolic",
                    "arccosine",
                    "inverse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "arccosh(x)"
                ],
                "examples": [
                    {
                        "in": "arccosh(1)",
                        "out": "0"
                    },
                    {
                        "in": "arccosh(2)",
                        "out": "1.3169578969"
                    }
                ]
            },
            {
                "name": "arctanh",
                "keywords": [
                    "hyperbolic",
                    "arctangent",
                    "inverse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "arctanh(x)"
                ],
                "examples": [
                    {
                        "in": "arctanh(0)",
                        "out": "0"
                    },
                    {
                        "in": "arctanh(0.5)",
                        "out": "0.5493061443"
                    }
                ]
            }
        ]
    },
    {
        "name": "Number theory",
        "fns": [
            {
                "name": "!",
                "keywords": [
                    "factorial"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x!",
                    "fact(x)"
                ],
                "examples": [
                    {
                        "in": "fact(3)",
                        "out": "6"
                    },
                    {
                        "in": "3!",
                        "out": "6"
                    },
                    {
                        "in": "fact(5.5)",
                        "out": "287.885277815"
                    }
                ]
            },
            {
                "name": "factorise",
                "keywords": [
                    "factorise",
                    "prime",
                    "number",
                    "factorisation"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "factorise(n)"
                ],
                "examples": [
                    {
                        "in": "factorise(18)",
                        "out": "[1,2]"
                    },
                    {
                        "in": "factorise(70)",
                        "out": "[1,0,1,1]"
                    }
                ]
            },
            {
                "name": "divisors",
                "keywords": [
                    "divisors",
                    "factors",
                    "number",
                    "factorisation"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "divisors(n)"
                ],
                "examples": [
                    {
                        "in": "divisors(18)",
                        "out": "[1,2,3,6,9,18]"
                    },
                    {
                        "in": "divisors(100)",
                        "out": "[1,2,4,5,10,20,25,50,100]"
                    }
                ]
            },
            {
                "name": "proper_divisors",
                "keywords": [
                    "divisors",
                    "factors",
                    "number",
                    "factorisation"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "proper_divisors(n)"
                ],
                "examples": [
                    {
                        "in": "proper_divisors(18)",
                        "out": "[1,2,3,6,9]"
                    },
                    {
                        "in": "proper_divisors(100)",
                        "out": "[1,2,4,5,10,20,25,50]"
                    }
                ]
            },
            {
                "name": "largest_square_factor",
                "keywords": [
                    "divisor",
                    "square",
                    "factorisation"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "largest_square_factor(n)"
                ],
                "examples": [
                    {
                        "in": "largest_square_factor(15)",
                        "out": "1"
                    },
                    {
                        "in": "largest_square_factor(18)",
                        "out": "9"
                    },
                    {
                        "in": "largest_square_factor(144)",
                        "out": "144"
                    }
                ]
            },
            {
                "name": "gamma",
                "keywords": [
                    "number"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "gamma(x)"
                ],
                "examples": [
                    {
                        "in": "gamma(3)",
                        "out": "2"
                    },
                    {
                        "in": "gamma(1+i)",
                        "out": "0.4980156681 - 0.1549498283i"
                    }
                ]
            },
            {
                "name": "ceil",
                "keywords": [
                    "ceiling",
                    "round",
                    "up",
                    "integer",
                    "nearest"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "ceil(x)"
                ],
                "examples": [
                    {
                        "in": "ceil(3.2)",
                        "out": "4"
                    },
                    {
                        "in": "ceil(-1.3+5.4i)",
                        "out": "-1+6i"
                    }
                ]
            },
            {
                "name": "floor",
                "keywords": [
                    "round",
                    "down",
                    "integer",
                    "nearest"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "floor(x)"
                ],
                "examples": [
                    {
                        "in": "floor(3.5)",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "round",
                "keywords": [
                    "round",
                    "nearest",
                    "integer"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "round(x)"
                ],
                "examples": [
                    {
                        "in": "round(0.1)",
                        "out": "0"
                    },
                    {
                        "in": "round(0.9)",
                        "out": "1"
                    },
                    {
                        "in": "round(4.5)",
                        "out": "5"
                    },
                    {
                        "in": "round(-0.5)",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "trunc",
                "keywords": [
                    "truncate",
                    "integer",
                    "round",
                    "nearest"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "trunc(x, [p])"
                ],
                "examples": [
                    {
                        "in": "trunc(3.3)",
                        "out": "3"
                    },
                    {
                        "in": "trunc(-3.3)",
                        "out": "-3"
                    },
                    {
                        "in": "trunc(9.8765, 2)",
                        "out": "9.87"
                    }
                ]
            },
            {
                "name": "fract",
                "keywords": [
                    "fractional",
                    "part",
                    "decimal"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "fract(x)"
                ],
                "examples": [
                    {
                        "in": "fract(4.3)",
                        "out": "0.3"
                    }
                ]
            },
            {
                "name": "rational_approximation",
                "keywords": [
                    "approximation",
                    "fraction",
                    "continued"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "rational_approximation(n,[accuracy])"
                ],
                "examples": [
                    {
                        "in": "rational_approximation(pi)",
                        "out": "[355,113]"
                    },
                    {
                        "in": "rational_approximation(pi,3)",
                        "out": "[22,7]"
                    }
                ]
            },
            {
                "name": "mod",
                "keywords": [
                    "modulus",
                    "remainder",
                    "division",
                    "modulo"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "mod(a,b)"
                ],
                "examples": [
                    {
                        "in": "mod(5,3)",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "perm",
                "keywords": [
                    "permutations",
                    "count",
                    "combinatoric"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "perm(n,k)"
                ],
                "examples": [
                    {
                        "in": "perm(5,2)",
                        "out": "20"
                    }
                ]
            },
            {
                "name": "comb",
                "keywords": [
                    "combinations",
                    "count",
                    "combinatoric"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "comb(n,k)"
                ],
                "examples": [
                    {
                        "in": "comb(5,2)",
                        "out": "10"
                    }
                ]
            },
            {
                "name": "gcd",
                "keywords": [
                    "greatest",
                    "common",
                    "divisor",
                    "factor"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "gcd(a,b)",
                    "gcf(a,b)"
                ],
                "examples": [
                    {
                        "in": "gcd(12,16)",
                        "out": "4"
                    }
                ]
            },
            {
                "name": "gcd_without_pi_or_i",
                "keywords": [
                    "greatest",
                    "common",
                    "divisor",
                    "factor"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "gcd_without_pi_or_i(a,b)"
                ],
                "examples": [
                    {
                        "in": "gcd_without_pi_or_i(6*pi, 9)",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "coprime",
                "keywords": [
                    "test",
                    "prime",
                    "factorisation"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "coprime(a,b)"
                ],
                "examples": [
                    {
                        "in": "coprime(12,16)",
                        "out": "false"
                    },
                    {
                        "in": "coprime(2,3)",
                        "out": "true"
                    },
                    {
                        "in": "coprime(1,3)",
                        "out": "true"
                    },
                    {
                        "in": "coprime(1,1)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "lcm",
                "keywords": [
                    "lowest",
                    "common",
                    "multiple"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "lcm(a,b)"
                ],
                "examples": [
                    {
                        "in": "lcm(8,12)",
                        "out": "24"
                    },
                    {
                        "in": "lcm(8,12,5)",
                        "out": "120"
                    }
                ]
            },
            {
                "name": "|",
                "keywords": [
                    "divides",
                    "test"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x|y",
                    "x divides y"
                ],
                "examples": [
                    {
                        "in": "4|8",
                        "out": "true"
                    }
                ]
            }
        ]
    },
    {
        "name": "Vector and matrix arithmetic",
        "fns": [
            {
                "name": "vector",
                "keywords": [
                    "column"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "vector(a1,a2,...,aN)"
                ],
                "examples": []
            },
            {
                "name": "matrix",
                "keywords": [
                    "array"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "matrix(row1,row2,...,rowN)"
                ],
                "examples": []
            },
            {
                "name": "id",
                "keywords": [
                    "identity",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "id(n)"
                ],
                "examples": [
                    {
                        "in": "id(3)",
                        "out": "matrix([1,0,0],[0,1,0],[0,0,1])"
                    }
                ]
            },
            {
                "name": "numrows",
                "keywords": [
                    "number",
                    "rows",
                    "count",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "numrows(matrix)"
                ],
                "examples": [
                    {
                        "in": "numrows(matrix([1,2],[3,4],[5,6]))",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "numcolumns",
                "keywords": [
                    "number",
                    "columns",
                    "count",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "numcolumns(matrix)"
                ],
                "examples": [
                    {
                        "in": "numcolumns(matrix([1,2],[3,4],[5,6]))",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "rowvector",
                "keywords": [
                    "vector",
                    "transpose",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "rowvector(a1,a2,...,aN)"
                ],
                "examples": [
                    {
                        "in": "rowvector(1,2)",
                        "out": "matrix([1,2])"
                    },
                    {
                        "in": "rowvector([1,2])",
                        "out": "matrix([1,2])"
                    }
                ]
            },
            {
                "name": "dot",
                "keywords": [
                    "scalar",
                    "product",
                    "inner",
                    "vectors"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "dot(x,y)"
                ],
                "examples": [
                    {
                        "in": "dot(vector(1,2,3),vector(4,5,6))",
                        "out": "32"
                    },
                    {
                        "in": "dot(matrix([1],[2]), matrix([3],[4]))",
                        "out": "11"
                    }
                ]
            },
            {
                "name": "cross",
                "keywords": [
                    "product",
                    "matrix",
                    "vectors"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "cross(x,y)"
                ],
                "examples": [
                    {
                        "in": "cross(vector(1,2,3),vector(4,5,6))",
                        "out": "vector(-3,6,-3)"
                    },
                    {
                        "in": "cross(matrix([1],[2],[3]), matrix([4],[5],[6]))",
                        "out": "vector(-3,6,-3)"
                    }
                ]
            },
            {
                "name": "angle",
                "keywords": [
                    "between",
                    "vectors"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "angle(a,b)"
                ],
                "examples": [
                    {
                        "in": "angle(vector(1,0),vector(0,1))",
                        "out": "1.5707963268"
                    }
                ]
            },
            {
                "name": "is_zero",
                "keywords": [
                    "test",
                    "zero",
                    "vector"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "is_zero(x)"
                ],
                "examples": [
                    {
                        "in": "is_zero(vector(0,0,0))",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "is_scalar_multiple",
                "keywords": [
                    "test",
                    "scalar",
                    "multiple",
                    "vector"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "is_scalar_multiple(u,v,[rel_tol],[abs_tol])"
                ],
                "examples": [
                    {
                        "in": "is_scalar_multiple(vector(1,2,3), vector(2,4,6))",
                        "out": "true"
                    },
                    {
                        "in": "is_scalar_multiple(vector(1,2,3), vector(3,4,5))",
                        "out": "false"
                    },
                    {
                        "in": "is_scalar_multiple(vector(1.01,2.01,3.01), vector(2,4,6), 0.1, 0.1)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "det",
                "keywords": [
                    "determinant",
                    "matrix",
                    "modulus"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "det(x)"
                ],
                "examples": [
                    {
                        "in": "det(matrix([1,2],[3,4]))",
                        "out": "-2"
                    },
                    {
                        "in": "det(matrix([1,2,3],[4,5,6],[7,8,9]))",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "transpose",
                "keywords": [
                    "turn",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "transpose(x)"
                ],
                "examples": [
                    {
                        "in": "transpose(matrix([1,2],[3,4]))",
                        "out": "matrix([1,3],[2,4])"
                    },
                    {
                        "in": "transpose(vector(1,2,3))",
                        "out": "matrix([1,2,3])"
                    },
                    {
                        "in": "transpose([[1,2], [3,4]])",
                        "out": "[[1,3], [2,4]]"
                    }
                ]
            },
            {
                "name": "sum_cells",
                "keywords": [
                    "cells",
                    "add",
                    "total"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sum_cells(m)"
                ],
                "examples": [
                    {
                        "in": "sum_cells(matrix([1,2],[3,4]))",
                        "out": "10"
                    }
                ]
            },
            {
                "name": "augment",
                "keywords": [
                    "augmented",
                    "combine",
                    "horizontally",
                    "matrices",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "augment(m1,m2)",
                    "combine_horizontally(m1,m2)"
                ],
                "examples": [
                    {
                        "in": "augment(id(2), matrix([3],[4],[5]))",
                        "out": "matrix([1,0,3],[0,1,4],[0,0,5])"
                    }
                ]
            },
            {
                "name": "stack",
                "keywords": [
                    "stacked",
                    "combine",
                    "vertically",
                    "matrices",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "stack(m1,m2)",
                    "combine_vertically(m1,m2)"
                ],
                "examples": [
                    {
                        "in": "stack(id(3), matrix([3,4]))",
                        "out": "matrix([1,0,0],[0,1,0],[0,0,1],[3,4,0])"
                    }
                ]
            },
            {
                "name": "combine_diagonally",
                "keywords": [
                    "stacked",
                    "combine",
                    "vertically",
                    "matrices",
                    "matrix"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "combine_diagonally(m1,m2)"
                ],
                "examples": [
                    {
                        "in": "combine_diagonally(id(3), matrix([3,4],[5,6]))",
                        "out": "matrix([1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,3,4],[0,0,0,5,6])"
                    }
                ]
            },
            {
                "name": "lu_decomposition",
                "keywords": [
                    "matrices",
                    "matrix",
                    "decomposition",
                    "decompose",
                    "upper",
                    "lower",
                    "triangular"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "lu_decomposition(m)"
                ],
                "examples": [
                    {
                        "in": "lu_decomposition(matrix([1,2,3],[4,5,6],[7,8,10]))",
                        "out": "[ matrix([1,0,0],[4,-3,0],[7,-6,1]), matrix([1,2,3],[0,1,2],[0,0,1]) ]"
                    }
                ]
            },
            {
                "name": "gauss_jordan_elimination",
                "keywords": [
                    "matrices",
                    "matrix",
                    "gaussian",
                    "gauss",
                    "jordan",
                    "elimination",
                    "row",
                    "reduction",
                    "reduced",
                    "echelon",
                    "form"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "gauss_jordan_elimination(m)"
                ],
                "examples": [
                    {
                        "in": "gauss_jordan_elimination(matrix([1,2,3,5],[5,6,9,11],[6,9,12,15]))",
                        "out": "matrix([1,0,0,-2],[0,1,0,-1],[0,0,1,3])"
                    }
                ]
            },
            {
                "name": "inverse",
                "keywords": [
                    "invert",
                    "matrix",
                    "matrices"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "inverse(m)"
                ],
                "examples": [
                    {
                        "in": "inverse(matrix([1,2,3],[5,6,9],[4,8,14]))",
                        "out": "matrix([-1.5,0.5,0],[4.25,-0.25,-0.75],[-2,0,0.5])"
                    }
                ]
            }
        ]
    },
    {
        "name": "Strings",
        "fns": [
            {
                "name": "listval",
                "keywords": [
                    "index",
                    "access",
                    "list"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x[n]"
                ],
                "examples": [
                    {
                        "in": "\"hello\"[1]",
                        "out": "\"e\""
                    }
                ]
            },
            {
                "name": "listval",
                "keywords": [
                    "slice",
                    "list"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x[a..b]"
                ],
                "examples": [
                    {
                        "in": "\"hello\"[1..4]",
                        "out": "\"ell\""
                    }
                ]
            },
            {
                "name": "in",
                "keywords": [
                    "test",
                    "contains",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "substring in string"
                ],
                "examples": [
                    {
                        "in": "\"plain\" in \"explains\"",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "string",
                "keywords": [
                    "convert",
                    "string",
                    "write"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "string(x)"
                ],
                "examples": [
                    {
                        "in": "string(123)",
                        "out": "\"123\""
                    },
                    {
                        "in": "string(x)",
                        "out": "\"x\""
                    },
                    {
                        "in": "string(expression(\"0.5\"))",
                        "out": "\"0.5\""
                    },
                    {
                        "in": "string(expression(\"0.5\"),\"fractionNumbers\")",
                        "out": "\"1/2\""
                    }
                ]
            },
            {
                "name": "jme_string",
                "keywords": [
                    "convert",
                    "string",
                    "write"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "jme_string(x)"
                ],
                "examples": [
                    {
                        "in": "jme_string(123)",
                        "out": "\"123\""
                    },
                    {
                        "in": "jme_string(expression(\"x+y\"))",
                        "out": "\"x + y\""
                    },
                    {
                        "in": "jme_string(vector(1,2,3))",
                        "out": "\"vector(1,2,3)\""
                    }
                ]
            },
            {
                "name": "latex",
                "keywords": [
                    "convert",
                    "string",
                    "latex"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "latex(x)"
                ],
                "examples": [
                    {
                        "in": "latex(expression(\"x^2 + 3/4\"))",
                        "out": "\"x^{2} + \\\\frac{3}{4}\""
                    }
                ]
            },
            {
                "name": "safe",
                "keywords": [
                    "raw",
                    "string"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "safe(x)"
                ],
                "examples": []
            },
            {
                "name": "render",
                "keywords": [
                    "template",
                    "substitute",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "render(x, values)"
                ],
                "examples": [
                    {
                        "in": "render(safe(\"I have {num_apples} apples.\"), [\"num_apples\": 5])",
                        "out": "\"I have 5 apples.\""
                    },
                    {
                        "in": "render(safe(\"Let $x = \\\\var{x}$\"), [\"x\": 2])",
                        "out": "\"Let $x = {2}$\""
                    }
                ]
            },
            {
                "name": "capitalise",
                "keywords": [
                    "upper",
                    "case"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "capitalise(x)"
                ],
                "examples": [
                    {
                        "in": "capitalise('hello there')",
                        "out": "\"Hello there\""
                    }
                ]
            },
            {
                "name": "pluralise",
                "keywords": [
                    "singular",
                    "plural"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "pluralise(n,singular,plural)"
                ],
                "examples": [
                    {
                        "in": "pluralise(0,\"thing\",\"things\")",
                        "out": "\"things\""
                    },
                    {
                        "in": "pluralise(1,\"thing\",\"things\")",
                        "out": "\"thing\""
                    },
                    {
                        "in": "pluralise(2,\"thing\",\"things\")",
                        "out": "\"things\""
                    }
                ]
            },
            {
                "name": "upper",
                "keywords": [
                    "upper",
                    "case",
                    "capitalise",
                    "convert"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "upper(x)"
                ],
                "examples": [
                    {
                        "in": "upper('Hello there')",
                        "out": "\"HELLO THERE\""
                    }
                ]
            },
            {
                "name": "lower",
                "keywords": [
                    "case",
                    "convert"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "lower(x)"
                ],
                "examples": [
                    {
                        "in": "lower('CLAUS, Santa')",
                        "out": "\"claus, santa\""
                    }
                ]
            },
            {
                "name": "join",
                "keywords": [
                    "implode",
                    "delimiter",
                    "concatenate"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "join(strings, delimiter)"
                ],
                "examples": [
                    {
                        "in": "join(['a','b','c'],',')",
                        "out": "\"a,b,c\""
                    }
                ]
            },
            {
                "name": "split",
                "keywords": [
                    "explode",
                    "delimiter"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "split(string,delimiter)"
                ],
                "examples": [
                    {
                        "in": "split(\"a,b,c,d\",\",\")",
                        "out": "[\"a\",\"b\",\"c\",\"d\"]"
                    }
                ]
            },
            {
                "name": "match_regex",
                "keywords": [
                    "regular",
                    "expression",
                    "regexp",
                    "test",
                    "match"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "match_regex(pattern,str,flags)"
                ],
                "examples": [
                    {
                        "in": "match_regex(\"\\\\d+\",\"01234\")",
                        "out": "[\"01234\"]"
                    },
                    {
                        "in": "match_regex(\"a(b+)\",\"abbbb\")",
                        "out": "[\"abbbb\",\"bbbb\"]"
                    },
                    {
                        "in": "match_regex(\"a(b+)\",\"ABBBB\")",
                        "out": "[]"
                    },
                    {
                        "in": "match_regex(\"a(b+)\",\"ABBBB\",\"i\")",
                        "out": "[\"ABBBB\",\"BBBB\"]"
                    }
                ]
            },
            {
                "name": "split_regex",
                "keywords": [
                    "explode",
                    "regular",
                    "expression",
                    "regexp"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "split_regex(string,pattern,flags)"
                ],
                "examples": [
                    {
                        "in": "split_regex(\"a, b,c, d \",\", *\")",
                        "out": "[\"a\",\"b\",\"c\",\"d\"]"
                    },
                    {
                        "in": "split_regex(\"this and that AND THIS\",\" and \",\"i\")",
                        "out": "[\"this\",\"that\",\"THIS\"]"
                    }
                ]
            },
            {
                "name": "replace_regex",
                "keywords": [
                    "substitute",
                    "regular",
                    "expression",
                    "regexp"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "replace_regex(pattern,replacement,string,flags)"
                ],
                "examples": [
                    {
                        "in": "replace_regex(\"day\",\"DAY\",\"Monday Tuesday Wednesday\")",
                        "out": "\"MonDAY Tuesday Wednesday\""
                    },
                    {
                        "in": "replace_regex(\"day\",\"DAY\",\"Monday Tuesday Wednesday\",\"g\")",
                        "out": "\"MonDAY TuesDAY WednesDAY\""
                    },
                    {
                        "in": "replace_regex(\"a\",\"o\",\"Aardvark\")",
                        "out": "\"Aordvark\""
                    },
                    {
                        "in": "replace_regex(\"a\",\"o\",\"Aardvark\",\"i\")",
                        "out": "\"oardvark\""
                    },
                    {
                        "in": "replace_regex(\"a\",\"o\",\"Aardvark\",\"ig\")",
                        "out": "\"oordvork\""
                    },
                    {
                        "in": "replace_regex(safe(\"(\\\\d+)x(\\\\d+)\"),\"$1 by $2\",\"32x24\")",
                        "out": "\"32 by 24\""
                    },
                    {
                        "in": "replace_regex(safe(\"a{2}\"),\"c\",\"a aa aaa\")",
                        "out": "\"a c aaa\""
                    }
                ]
            },
            {
                "name": "trim",
                "keywords": [
                    "whitespace",
                    "remove",
                    "strip"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "trim(str)"
                ],
                "examples": [
                    {
                        "in": "trim(\" a string  \")",
                        "out": "\"a string\""
                    }
                ]
            },
            {
                "name": "currency",
                "keywords": [
                    "money",
                    "symbol",
                    "pence",
                    "pounds",
                    "dollars",
                    "cents"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "currency(n,prefix,suffix)"
                ],
                "examples": [
                    {
                        "in": "currency(123.321,\"\u00a3\",\"\")",
                        "out": "\"\u00a3123.32\""
                    }
                ]
            },
            {
                "name": "separateThousands",
                "keywords": [
                    "commas",
                    "thousands",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "separateThousands(n,separator)"
                ],
                "examples": [
                    {
                        "in": "separateThousands(1234567.1234,\",\")",
                        "out": "\"1,234,567.1234\""
                    }
                ]
            },
            {
                "name": "unpercent",
                "keywords": [
                    "percentage",
                    "convert",
                    "string"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "unpercent(str)"
                ],
                "examples": [
                    {
                        "in": "unpercent(\"2%\")",
                        "out": "0.02"
                    }
                ]
            },
            {
                "name": "lpad",
                "keywords": [
                    "pad",
                    "left"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "lpad(str, n, prefix)"
                ],
                "examples": [
                    {
                        "in": "lpad(\"3\", 2, \"0\")",
                        "out": "\"03\""
                    }
                ]
            },
            {
                "name": "rpad",
                "keywords": [
                    "pad",
                    "right"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "rpad(str, n, suffix)"
                ],
                "examples": [
                    {
                        "in": "rpad(\"3\", 2, \"0\")",
                        "out": "\"30\""
                    }
                ]
            },
            {
                "name": "formatstring",
                "keywords": [
                    "substitute",
                    "string",
                    "template"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "formatstring(str, values)"
                ],
                "examples": [
                    {
                        "in": "formatstring(\"Their name is %s\",[\"Hortense\"])",
                        "out": "\"Their name is Hortense\""
                    },
                    {
                        "in": "formatstring(\"You should %s the %s\",[\"simplify\",\"denominator\"])",
                        "out": "\"You should simplify the denominator\""
                    }
                ]
            },
            {
                "name": "letterordinal",
                "keywords": [
                    "ordinal",
                    "nth",
                    "alphabetic",
                    "lexicographic"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "letterordinal(n)"
                ],
                "examples": [
                    {
                        "in": "letterordinal(0)",
                        "out": "\"a\""
                    },
                    {
                        "in": "letterordinal(1)",
                        "out": "\"b\""
                    },
                    {
                        "in": "letterordinal(26)",
                        "out": "\"aa\""
                    }
                ]
            },
            {
                "name": "translate",
                "keywords": [
                    "localisation",
                    "localization",
                    "internationalisation",
                    "internationalization",
                    "i18n"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "translate(str, arguments)"
                ],
                "examples": [
                    {
                        "in": "translate(\"question.header\",[\"number\": 2])",
                        "out": "\"Question 2\""
                    }
                ]
            },
            {
                "name": "isbool",
                "keywords": [
                    "test",
                    "boolean",
                    "true",
                    "truthy",
                    "false",
                    "yes",
                    "no"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "isbool(str)"
                ],
                "examples": [
                    {
                        "in": "isbool(\"true\")",
                        "out": "true"
                    },
                    {
                        "in": "isbool(\"YES\")",
                        "out": "true"
                    },
                    {
                        "in": "isbool(\"no\")",
                        "out": "true"
                    },
                    {
                        "in": "isbool(\"y\")",
                        "out": "false"
                    }
                ]
            }
        ]
    },
    {
        "name": "Logic",
        "fns": [
            {
                "name": "<",
                "keywords": [
                    "less",
                    "than",
                    "comparison",
                    "order",
                    "compare",
                    "smaller"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x<y"
                ],
                "examples": [
                    {
                        "in": "4 < 5",
                        "out": "true"
                    },
                    {
                        "in": "-4 < -5",
                        "out": "false"
                    }
                ]
            },
            {
                "name": ">",
                "keywords": [
                    "greater",
                    "than",
                    "more",
                    "comparison",
                    "order",
                    "compare",
                    "bigger",
                    "larger"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x>y"
                ],
                "examples": [
                    {
                        "in": "5 > 4",
                        "out": "true"
                    },
                    {
                        "in": "-5 > -4",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "<=",
                "keywords": [
                    "less",
                    "than",
                    "equals",
                    "smaller",
                    "comparison",
                    "order"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x<=y"
                ],
                "examples": [
                    {
                        "in": "3 <= 4",
                        "out": "true"
                    },
                    {
                        "in": "4 <= 4",
                        "out": "true"
                    },
                    {
                        "in": "5 <= 4",
                        "out": "false"
                    }
                ]
            },
            {
                "name": ">=",
                "keywords": [
                    "greater",
                    "than",
                    "more",
                    "comparison",
                    "order",
                    "compare",
                    "bigger",
                    "larger",
                    "equals"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x>=y"
                ],
                "examples": [
                    {
                        "in": "3 >= 4",
                        "out": "false"
                    },
                    {
                        "in": "4 >= 4",
                        "out": "true"
                    },
                    {
                        "in": "5 >= 4",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "<>",
                "keywords": [
                    "not",
                    "equal",
                    "inequality",
                    "same"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x<>y"
                ],
                "examples": [
                    {
                        "in": "'this string' <> 'that string'",
                        "out": "true"
                    },
                    {
                        "in": "1<>2",
                        "out": "true"
                    },
                    {
                        "in": "'1' <> 1",
                        "out": "true"
                    },
                    {
                        "in": "1 <> 1",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "=",
                "keywords": [
                    "equal",
                    "same",
                    "equality"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x=y"
                ],
                "examples": [
                    {
                        "in": "vector(1,2) = vector(1,2,0)",
                        "out": "true"
                    },
                    {
                        "in": "4.0 = 4",
                        "out": "true"
                    },
                    {
                        "in": "1/3 = 0.3",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "isclose",
                "keywords": [
                    "close",
                    "approximation",
                    "test",
                    "tolerance",
                    "relative",
                    "absolute",
                    "equals",
                    "same"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "isclose(x,y,[rel_tol],[abs_tol])"
                ],
                "examples": [
                    {
                        "in": "isclose(1/3, 0.3)",
                        "out": "false"
                    },
                    {
                        "in": "isclose(1/3, 0.3, 0.01)",
                        "out": "false"
                    },
                    {
                        "in": "isclose(1/3, 0.3, 0.1)",
                        "out": "true"
                    },
                    {
                        "in": "isclose(1/3, 0.3, 0.01, 0.1)",
                        "out": "true"
                    },
                    {
                        "in": "isclose(10/3, 3, 0.01, 0.1)",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "resultsequal",
                "keywords": [
                    "same",
                    "equal",
                    "test",
                    "tolerance",
                    "expression"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "resultsequal(a,b,checkingFunction,accuracy)"
                ],
                "examples": [
                    {
                        "in": "resultsequal(22/7,pi,\"absdiff\",0.001)",
                        "out": "false"
                    },
                    {
                        "in": "resultsequal(22/7,pi,\"reldiff\",0.001)",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "and",
                "keywords": [
                    "logical",
                    "and",
                    "intersection"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x and y",
                    "x && y",
                    "x & y"
                ],
                "examples": [
                    {
                        "in": "true and true",
                        "out": "true"
                    },
                    {
                        "in": "true && true",
                        "out": "true"
                    },
                    {
                        "in": "true & true",
                        "out": "true"
                    },
                    {
                        "in": "true and false",
                        "out": "false"
                    },
                    {
                        "in": "false and false",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "not",
                "keywords": [
                    "logical",
                    "not",
                    "negation",
                    "negate",
                    "negative"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "not x"
                ],
                "examples": [
                    {
                        "in": "not true",
                        "out": "false"
                    },
                    {
                        "in": "not false",
                        "out": "true"
                    },
                    {
                        "in": "!true",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "or",
                "keywords": [
                    "logical",
                    "or",
                    "union"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x or y",
                    "x || y"
                ],
                "examples": [
                    {
                        "in": "true or false",
                        "out": "true"
                    },
                    {
                        "in": "false or false",
                        "out": "false"
                    },
                    {
                        "in": "true || false",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "xor",
                "keywords": [
                    "exclusive",
                    "or",
                    "logical"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x xor y"
                ],
                "examples": [
                    {
                        "in": "true XOR false",
                        "out": "true"
                    },
                    {
                        "in": "true XOR true",
                        "out": "false"
                    },
                    {
                        "in": "false XOR false",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "implies",
                "keywords": [
                    "logical",
                    "implication"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x implies y"
                ],
                "examples": [
                    {
                        "in": "true implies true",
                        "out": "true"
                    },
                    {
                        "in": "true implies false",
                        "out": "false"
                    },
                    {
                        "in": "false implies true",
                        "out": "true"
                    },
                    {
                        "in": "false implies false",
                        "out": "true"
                    }
                ]
            }
        ]
    },
    {
        "name": "Collections",
        "fns": [
            {
                "name": "listval",
                "keywords": [
                    "index",
                    "access",
                    "element"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x[y]"
                ],
                "examples": [
                    {
                        "in": "[0,1,2,3][1]",
                        "out": "1"
                    },
                    {
                        "in": "vector(0,1,2)[2]",
                        "out": "2"
                    },
                    {
                        "in": "matrix([0,1,2],[3,4,5],[6,7,8])[0]",
                        "out": "vector(0,1,2)"
                    },
                    {
                        "in": "[\"a\": 1, \"b\": 2][\"a\"]",
                        "out": "1"
                    }
                ]
            },
            {
                "name": "listval",
                "keywords": [
                    "slice",
                    "access",
                    "range",
                    "subset"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x[a..b]",
                    "x[a..b#c]"
                ],
                "examples": [
                    {
                        "in": "[0,1,2,3,4,5][1..3]",
                        "out": "[1,2]"
                    },
                    {
                        "in": "[0,1,2,3,4,5][1..6#2]",
                        "out": "[1,3,5]"
                    }
                ]
            },
            {
                "name": "in",
                "keywords": [
                    "test",
                    "contains",
                    "element",
                    "inside"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x in collection"
                ],
                "examples": [
                    {
                        "in": "3 in [1,2,3,4]",
                        "out": "true"
                    },
                    {
                        "in": "3 in (set(1,2,3,4) and set(2,4,6,8))",
                        "out": "false"
                    },
                    {
                        "in": "\"a\" in [\"a\": 1]",
                        "out": "true"
                    }
                ]
            }
        ]
    },
    {
        "name": "Ranges",
        "fns": [
            {
                "name": "..",
                "keywords": [
                    "range",
                    "interval"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "a .. b"
                ],
                "examples": []
            },
            {
                "name": "#",
                "keywords": [
                    "step",
                    "interval"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "range # step"
                ],
                "examples": []
            },
            {
                "name": "except",
                "keywords": [
                    "exclude",
                    "without"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "a except b"
                ],
                "examples": [
                    {
                        "in": "-2..2 except 0",
                        "out": "[-2,-1,1,2]"
                    }
                ]
            }
        ]
    },
    {
        "name": "Lists",
        "fns": [
            {
                "name": "repeat",
                "keywords": [
                    "times",
                    "multiple"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "repeat(expression,n)"
                ],
                "examples": [
                    {
                        "in": "repeat(0,3)",
                        "out": "[0,0,0]"
                    }
                ]
            },
            {
                "name": "all",
                "keywords": [
                    "every",
                    "test"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "all(list)"
                ],
                "examples": [
                    {
                        "in": "all([true,true])",
                        "out": "true"
                    },
                    {
                        "in": "all([true,false])",
                        "out": "false"
                    },
                    {
                        "in": "all([])",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "some",
                "keywords": [
                    "any",
                    "exists",
                    "test"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "some(list)"
                ],
                "examples": [
                    {
                        "in": "some([false,true,false])",
                        "out": "true"
                    },
                    {
                        "in": "some([false,false,false])",
                        "out": "false"
                    },
                    {
                        "in": "some([])",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "map",
                "keywords": [
                    "transform",
                    "functional",
                    "loop",
                    "map"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "map(anonymous_function, d)",
                    "map(expression,name[s],d)"
                ],
                "examples": [
                    {
                        "in": "map(x -> x+1, 1..3)",
                        "out": "[2,3,4]"
                    },
                    {
                        "in": "map(x+1,x,1..3)",
                        "out": "[2,3,4]"
                    },
                    {
                        "in": "map(s -> capitalise(s), [\"jim\",\"bob\"])",
                        "out": "[\"Jim\",\"Bob\"]"
                    },
                    {
                        "in": "map([x,y] -> sqrt(x^2+y^2), [ [3,4], [5,12] ])",
                        "out": "[5,13]"
                    },
                    {
                        "in": "map(sqrt(x^2+y^2), [x,y], [ [3,4], [5,12] ])",
                        "out": "[5,13]"
                    },
                    {
                        "in": "map(x -> x+1, id(2))",
                        "out": "matrix([2,1],[1,2])"
                    },
                    {
                        "in": "map(x -> sqrt(x), vector(1,4,9))",
                        "out": "vector(1,2,3)"
                    }
                ]
            },
            {
                "name": "for:",
                "keywords": [
                    "transform",
                    "map",
                    "generator",
                    "comprehension"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "expression for: name of: list where: condition"
                ],
                "examples": [
                    {
                        "in": "x^2 for: x of: 1..5",
                        "out": "[1, 4, 9, 16, 25]"
                    },
                    {
                        "in": "x for: x of: 1..10 where: mod(x,3)=0",
                        "out": "[3, 6, 9]"
                    },
                    {
                        "in": "log(x,b) for: [x,b] of: [[100,10], [16,2]]",
                        "out": "[2, 4]"
                    },
                    {
                        "in": "[a,b] for: [a,b] of: zip(1..3, 4..6)",
                        "out": "[ [1,4], [2,5], [3,6] ]"
                    },
                    {
                        "in": "[a,b] for: a of: 1..3 for: b of: 4..6",
                        "out": "[ [1,4], [1,5], [1,6], [2,4], [2,5], [2,6], [3,4], [3,5], [3,6] ]"
                    },
                    {
                        "in": "mod(a,b) for: a of: 1..5 for: b of: [2,3]",
                        "out": "[1, 1, 0, 2, 1, 0, 0, 1, 1, 2]"
                    },
                    {
                        "in": "(mod(a,b) for: a of: 1..5) for: b of: [2,3]",
                        "out": "[ [1,0,1,0,1], [1,2,0,1,2] ]"
                    },
                    {
                        "in": "(mod(a,b) for: b of: [2,3]) for: a of: 1..5",
                        "out": "[ [1,1], [0,2], [1,0], [0,1], [1,2] ]"
                    },
                    {
                        "in": "[x,y] for: x of: 1..3 for: y of: 1..x",
                        "out": "[ [1,1], [2,1] ,[2,2], [3,1], [3,2], [3,3] ]"
                    },
                    {
                        "in": "[x,y] for: x of: 2..7 for: y of: (x+1)..7 where: gcd(x,y)=1",
                        "out": "[ [2,3], [2,5], [2,7], [3,4], [3,5], [3,7], [4,5], [4,7], [5,6], [5,7], [6,7] ]"
                    },
                    {
                        "in": "[a,b,c] for: a of: 1..20 for: b of: 1..20 for: c of: 1..20 where: a<b<c and a^2+b^2 = c^2",
                        "out": "[ [ 3, 4, 5 ], [ 5, 12, 13 ], [ 6, 8, 10 ], [ 8, 15, 17 ], [ 9, 12, 15 ], [ 12, 16, 20 ] ]"
                    },
                    {
                        "in": "[a,b,c] for: [a,b,c] of: product(1..20, 3) where: a<b<c and a^2+b^2 = c^2",
                        "out": "[ [ 3, 4, 5 ], [ 5, 12, 13 ], [ 6, 8, 10 ], [ 8, 15, 17 ], [ 9, 12, 15 ], [ 12, 16, 20 ] ]"
                    }
                ]
            },
            {
                "name": "filter",
                "keywords": [
                    "only",
                    "require",
                    "constraint",
                    "test",
                    "functional",
                    "loop"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "filter(anonymous_function, d)",
                    "filter(expression,name,d)"
                ],
                "examples": [
                    {
                        "in": "filter(x -> x>5, [1,3,5,7,9])",
                        "out": "[7,9]"
                    },
                    {
                        "in": "filter(x>5, x, [1,3,5,7,9])",
                        "out": "[7,9]"
                    }
                ]
            },
            {
                "name": "foldl",
                "keywords": [
                    "accumulate",
                    "fold",
                    "functional",
                    "iterate",
                    "loop"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "foldl(anonymous_function, first_value, d)",
                    "foldl(expression,accumulator_name, item_name, first_value, d)"
                ],
                "examples": [
                    {
                        "in": "foldl((total, x) -> total + x, 0, [1,2,3])",
                        "out": "6"
                    },
                    {
                        "in": "foldl(total + x, total, x, 0, [1,2,3])",
                        "out": "6"
                    },
                    {
                        "in": "foldl((longest, x) -> if(len(x)>len(longest),x,longest), \"\", [\"banana\",\"pineapple\",\"plum\"])",
                        "out": "\"pineapple\""
                    }
                ]
            },
            {
                "name": "iterate",
                "keywords": [
                    "repeat",
                    "accumulate",
                    "loop"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "iterate(anonymous_function, initial, times)",
                    "iterate(expression, name, initial, times)"
                ],
                "examples": [
                    {
                        "in": "iterate(x -> x+1, 0, 3)",
                        "out": "[0,1,2,3]"
                    },
                    {
                        "in": "iterate(x+1, x, 0, 3)",
                        "out": "[0,1,2,3]"
                    },
                    {
                        "in": "iterate([a,b] -> [b,a+b], [1,1], 3)",
                        "out": "[ [1,1], [1,2], [2,3], [3,5] ]"
                    },
                    {
                        "in": "iterate(l -> l[1..len(l)]+[l[0]], [\"a\",\"b\",\"c\"], 3)",
                        "out": "[ [\"a\",\"b\",\"c\"], [\"b\",\"c\",\"a\"], [\"c\",\"a\",\"b\"], [\"a\",\"b\",\"c\"] ]"
                    }
                ]
            },
            {
                "name": "iterate_until",
                "keywords": [
                    "repeat",
                    "accumulate",
                    "loop",
                    "until",
                    "condition",
                    "satisfy"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "iterate_until(iteration_function, initial, condition_function, max_iterations)",
                    "iterate_until(expression,name,initial,condition,max_iterations)"
                ],
                "examples": [
                    {
                        "in": "iterate_until(x -> if(mod(x,2)=0,x/2,3x+1), 5, x -> x=1)",
                        "out": "[ 5, 16, 8, 4, 2, 1 ]"
                    },
                    {
                        "in": "iterate_until(if(mod(x,2)=0,x/2,3x+1), x, 5, x=1)",
                        "out": "[ 5, 16, 8, 4, 2, 1 ]"
                    },
                    {
                        "in": "iterate_until([a,b] -> [b,mod(a,b)], [37,32], [a,b] -> b=0)",
                        "out": "[ [ 37, 32 ], [ 32, 5 ], [ 5, 2 ], [ 2, 1 ], [ 1, 0 ] ]"
                    }
                ]
            },
            {
                "name": "take",
                "keywords": [
                    "first",
                    "loop",
                    "filter",
                    "restrict",
                    "elements",
                    "only"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "take(n, condition_function, d)",
                    "take(n, expression, name, d)"
                ],
                "examples": [
                    {
                        "in": "take(3, x -> gcd(x,6)=1, 10..30)",
                        "out": "[11,13,17]"
                    },
                    {
                        "in": "take(3,gcd(x,6)=1,x,10..30)",
                        "out": "[11,13,17]"
                    }
                ]
            },
            {
                "name": "separate",
                "keywords": [
                    ""
                ],
                "noexamples": false,
                "calling_patterns": [
                    "separate(list, x \u2192 :data:`boolean`)"
                ],
                "examples": [
                    {
                        "in": "separate(1..10, x -> 3|x)",
                        "out": "[ [3, 6, 9], [1, 2, 4, 5, 7, 8, 10] ]"
                    }
                ]
            },
            {
                "name": "groups_of",
                "keywords": [
                    ""
                ],
                "noexamples": false,
                "calling_patterns": [
                    "groups_of(list, size)"
                ],
                "examples": [
                    {
                        "in": "groups_of(0..5, 2)",
                        "out": "[ [0,1], [2,3], [4,5] ]"
                    },
                    {
                        "in": "groups_of([\"A\", \"B\", \"C\", \"D\", \"E\"], 3)",
                        "out": "[ [\"A\", \"B\", \"C\"], [\"D\", \"E\"] ]"
                    }
                ]
            },
            {
                "name": "flatten",
                "keywords": [
                    "concatenate",
                    "join",
                    "lists"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "flatten(lists)"
                ],
                "examples": [
                    {
                        "in": "flatten([ [1,2], [3,4] ])",
                        "out": "[1,2,3,4]"
                    }
                ]
            },
            {
                "name": "let",
                "keywords": [
                    "assign",
                    "variable"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "let(name,definition,...,expression)",
                    "let(definitions, expression)"
                ],
                "examples": [
                    {
                        "in": "let([a,b,c],[1,5,6],d,sqrt(b^2-4*a*c), [(-b+d)/2, (-b-d)/2])",
                        "out": "[-2,-3]"
                    },
                    {
                        "in": "let(x,1, y,2, x+y)",
                        "out": "3"
                    },
                    {
                        "in": "let([\"x\": 1, \"y\": 2], x+y)",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "|>",
                "keywords": [
                    "pipe",
                    "compose",
                    "function",
                    "sequence"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "|>"
                ],
                "examples": [
                    {
                        "in": "2 |> sqrt() |> siground(2)",
                        "out": "1.4"
                    },
                    {
                        "in": "[\"happy\", \"birthday\"] |> join(\" \") |> upper()",
                        "out": "\"HAPPY BIRTHDAY\""
                    }
                ]
            },
            {
                "name": "sort",
                "keywords": [
                    "order",
                    "arrange"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sort(x)"
                ],
                "examples": [
                    {
                        "in": "sort([4,2,1,3])",
                        "out": "[1,2,3,4]"
                    }
                ]
            },
            {
                "name": "sort_destinations",
                "keywords": [
                    "sort",
                    "order",
                    "arrange",
                    "indices",
                    "indexes"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sort_destinations(x)"
                ],
                "examples": [
                    {
                        "in": "sort_destinations([4,2,1,3])",
                        "out": "[3,1,0,2]"
                    },
                    {
                        "in": "sort_destinations([1,2,3,4])",
                        "out": "[0,1,2,3]"
                    }
                ]
            },
            {
                "name": "sort_by",
                "keywords": [
                    "sory",
                    "order",
                    "arrange",
                    "key"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sort_by(key,list)"
                ],
                "examples": [
                    {
                        "in": "sort_by(0, [[5,0], [3,2], [4,4]])",
                        "out": "[[3,2], [4,4], [5,0]]"
                    },
                    {
                        "in": "sort_by(\"width\", [[\"label\": \"M\", \"width\": 20], [\"label\": \"L\", \"width\": 30], [\"label\": \"S\", \"width\": 10]])",
                        "out": "[[\"label\": \"S\", \"width\": 10], [\"label\": \"M\", \"width\": 20], [\"label\": \"L\", \"width\": 30]]"
                    }
                ]
            },
            {
                "name": "group_by",
                "keywords": [
                    "gather",
                    "collect",
                    "key",
                    "lists"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "group_by(key,list)"
                ],
                "examples": [
                    {
                        "in": "group_by(0, [[0,0], [3,2], [0,4]])",
                        "out": "[[0, [[0,0], [0,4]]], [3, [[3,2]]]]"
                    },
                    {
                        "in": "group_by(\"a\", [[\"a\": 1, \"b\": \"M\"], [\"a\": 2, \"b\": \"S\"], [\"a\": 1, \"b\": \"XL\"]])",
                        "out": "[[1,[[\"a\": 1, \"b\": \"M\"], [\"a\": 1, \"b\": \"XL\"]]], [2, [[\"a\": 2, \"b\": \"S\"]]]]"
                    }
                ]
            },
            {
                "name": "reverse",
                "keywords": [
                    "backwards"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "reverse(x)"
                ],
                "examples": [
                    {
                        "in": "reverse([1,2,3])",
                        "out": "[3,2,1]"
                    }
                ]
            },
            {
                "name": "indices",
                "keywords": [
                    "find",
                    "indexes",
                    "search"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "indices(list,value)"
                ],
                "examples": [
                    {
                        "in": "indices([1,0,1,0],1)",
                        "out": "[0,2]"
                    },
                    {
                        "in": "indices([2,4,6],4)",
                        "out": "[1]"
                    },
                    {
                        "in": "indices([1,2,3],5)",
                        "out": "[]"
                    }
                ]
            },
            {
                "name": "distinct",
                "keywords": [
                    "unique",
                    "different"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "distinct(x)"
                ],
                "examples": [
                    {
                        "in": "distinct([1,2,3,1,4,3])",
                        "out": "[1,2,3,4]"
                    }
                ]
            },
            {
                "name": "list",
                "keywords": [
                    "convert",
                    "components",
                    "elements"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "list(x)"
                ],
                "examples": [
                    {
                        "in": "list(set(1,2,3))",
                        "out": "[1,2,3]"
                    },
                    {
                        "in": "list(vector(1,2))",
                        "out": "[1,2]"
                    },
                    {
                        "in": "list(matrix([1,2],[3,4]))",
                        "out": "[[1,2], [3,4]]"
                    }
                ]
            },
            {
                "name": "make_variables",
                "keywords": [
                    "evaluate",
                    "variables",
                    "assign"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "make_variables(definitions, vRange)"
                ],
                "examples": [
                    {
                        "in": "make_variables([\"a\": expression(\"3\"), \"b\": expression(\"a^2\")])",
                        "out": "[\"a\": 3, \"b\": 9]"
                    }
                ]
            },
            {
                "name": "satisfy",
                "keywords": [
                    "test",
                    "satisfies",
                    "conditions"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "satisfy(names,definitions,conditions,maxRuns)"
                ],
                "examples": []
            },
            {
                "name": "sum",
                "keywords": [
                    "total",
                    "accumulate",
                    "add"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "sum(numbers)"
                ],
                "examples": [
                    {
                        "in": "sum([1,2,3])",
                        "out": "6"
                    },
                    {
                        "in": "sum(vector(4,5,6))",
                        "out": "15"
                    }
                ]
            },
            {
                "name": "prod",
                "keywords": [
                    "product",
                    "multiply",
                    "accumulate"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "prod(list)"
                ],
                "examples": [
                    {
                        "in": "prod([2,3,4])",
                        "out": "24"
                    }
                ]
            },
            {
                "name": "product",
                "keywords": [
                    "cartesian",
                    "combinations",
                    "power"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "product(list1,list2,...,listN)"
                ],
                "examples": [
                    {
                        "in": "product([1,2],[a,b])",
                        "out": "[ [1,a], [1,b], [2,a], [2,b] ]"
                    },
                    {
                        "in": "product([1,2],2)",
                        "out": "[ [1,1], [1,2], [2,1], [2,2] ]"
                    }
                ]
            },
            {
                "name": "zip",
                "keywords": [
                    "combine",
                    "tuples",
                    "pairs"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "zip(list1,list2,...,listN)"
                ],
                "examples": [
                    {
                        "in": "zip([1,2,3],[4,5,6])",
                        "out": "[ [1,4], [2,5], [3,6] ]"
                    }
                ]
            },
            {
                "name": "combinations",
                "keywords": [
                    "ordered",
                    "choices",
                    "collection",
                    "distinct",
                    "unique"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "combinations(collection,r)"
                ],
                "examples": [
                    {
                        "in": "combinations([1,2,3],2)",
                        "out": "[ [1,2], [1,3], [2,3] ]"
                    }
                ]
            },
            {
                "name": "combinations_with_replacement",
                "keywords": [
                    "ordered",
                    "choices",
                    "replacement",
                    "collection"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "combinations_with_replacement(collection,r)"
                ],
                "examples": [
                    {
                        "in": "combinations_with_replacement([1,2,3],2)",
                        "out": "[ [1,1], [1,2], [1,3], [2,2], [2,3], [3,3] ]"
                    }
                ]
            },
            {
                "name": "permutations",
                "keywords": [
                    "unordered",
                    "choices",
                    "collection"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "permutations(collection,r)"
                ],
                "examples": [
                    {
                        "in": "permutations([1,2,3],2)",
                        "out": "[ [1,2], [1,3], [2,1], [2,3], [3,1], [3,2] ]"
                    }
                ]
            },
            {
                "name": "frequencies",
                "keywords": [
                    "count",
                    "appearances"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "frequencies(collection)"
                ],
                "examples": [
                    {
                        "in": "frequencies([1,2,3,2,2,1])",
                        "out": "[ [1,2], [2,3], [3,1] ]"
                    },
                    {
                        "in": "frequencies([\"a\",\"a\",\"c\",\"b\",\"c\",\"a\"])",
                        "out": "[ [\"a\",3], [\"c\",2], [\"b\",1] ]"
                    }
                ]
            },
            {
                "name": "enumerate",
                "keywords": [
                    "count"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "enumerate(collection)"
                ],
                "examples": [
                    {
                        "in": "enumerate([\"A\",\"B\",\"C\"])",
                        "out": "[ [0,\"A\"], [1,\"B\"], [2,\"C\"] ]"
                    }
                ]
            }
        ]
    },
    {
        "name": "Dictionaries",
        "fns": [
            {
                "name": "listval",
                "keywords": [
                    "access",
                    "item",
                    "entry"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "dict[key]"
                ],
                "examples": [
                    {
                        "in": "[\"a\": 1, \"b\": 2][\"a\"]",
                        "out": "1"
                    }
                ]
            },
            {
                "name": "get",
                "keywords": [
                    "access",
                    "item",
                    "entry"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "get(dict,key,default)"
                ],
                "examples": [
                    {
                        "in": "get([\"a\":1], \"a\", 0)",
                        "out": "1"
                    },
                    {
                        "in": "get([\"a\":1], \"b\", 0)",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "dict",
                "keywords": [
                    "dictionary",
                    "convert",
                    "key",
                    "value",
                    "structure"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "dict(a:b, c:d, ...)",
                    "dict(pairs)"
                ],
                "examples": []
            },
            {
                "name": "keys",
                "keywords": [
                    "entries",
                    "dictionary"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "keys(dict)"
                ],
                "examples": [
                    {
                        "in": "keys([\"a\": 1, \"b\": 2, \"c\": 1])",
                        "out": "[\"a\",\"b\",\"c\"]"
                    }
                ]
            },
            {
                "name": "values",
                "keywords": [
                    "entires",
                    "dictionary"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "values(dict,[keys])"
                ],
                "examples": [
                    {
                        "in": "values([\"a\": 1, \"b\": 2, \"c\": 1])",
                        "out": "[1,2,1]"
                    },
                    {
                        "in": "values([\"a\": 1, \"b\": 2, \"c\": 3], [\"b\",\"a\"])",
                        "out": "[2,1]"
                    }
                ]
            },
            {
                "name": "items",
                "keywords": [
                    "entries",
                    "dictionary"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "items(dict)"
                ],
                "examples": [
                    {
                        "in": "items([\"a\": 1, \"b\": 2, \"c\": 1])",
                        "out": "[ [\"a\",1], [\"b\",2], [\"c\",1] ]"
                    }
                ]
            },
            {
                "name": "merge",
                "keywords": [
                    "dictionary",
                    "union",
                    "update"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "merge(dict1, dict2, ..., dictN)"
                ],
                "examples": [
                    {
                        "in": "merge([\"a\": 1, \"b\": 1], [\"b\": 2, \"c\": 2])",
                        "out": "[\"a\": 1, \"b\": 2, \"c\": 2]"
                    },
                    {
                        "in": "merge([\"a\": 1], [\"b\": 2], [\"c\": 3])",
                        "out": "[\"a\": 1, \"b\": 2, \"c\": 3]"
                    },
                    {
                        "in": "merge([ [\"a\": 1], [\"b\": 2] ])",
                        "out": "[\"a\": 1, \"b\": 2]"
                    },
                    {
                        "in": "merge()",
                        "out": "dict()"
                    },
                    {
                        "in": "merge([])",
                        "out": "dict()"
                    }
                ]
            }
        ]
    },
    {
        "name": "Sets",
        "fns": [
            {
                "name": "set",
                "keywords": [
                    "distinct",
                    "unique",
                    "different"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "set(elements)"
                ],
                "examples": []
            },
            {
                "name": "union",
                "keywords": [
                    "join",
                    "either",
                    "or",
                    "set"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "union(a,b)"
                ],
                "examples": [
                    {
                        "in": "union(set(1,2,3),set(2,4,6))",
                        "out": "set(1,2,3,4,6)"
                    },
                    {
                        "in": "set(1,2,3) or set(2,4,6)",
                        "out": "set(1,2,3,4,6)"
                    }
                ]
            },
            {
                "name": "intersection",
                "keywords": [
                    "join",
                    "both",
                    "and"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "intersection(a,b)"
                ],
                "examples": [
                    {
                        "in": "intersection(set(1,2,3),set(2,4,6))",
                        "out": "set(2)"
                    },
                    {
                        "in": "set(1,2,3) and set(2,4,6)",
                        "out": "set(2)"
                    }
                ]
            },
            {
                "name": "-",
                "keywords": [
                    "difference"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "a - b"
                ],
                "examples": [
                    {
                        "in": "set(1,2,3,4) - set(2,4,6)",
                        "out": "set(1,3)"
                    }
                ]
            }
        ]
    },
    {
        "name": "Randomisation",
        "fns": [
            {
                "name": "random",
                "keywords": [
                    "uniform"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "random(x)"
                ],
                "examples": []
            },
            {
                "name": "weighted_random",
                "keywords": [
                    "random"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "weighted_random(x)"
                ],
                "examples": []
            },
            {
                "name": "deal",
                "keywords": [
                    "shuffle",
                    "order",
                    "random"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "deal(n)"
                ],
                "examples": []
            },
            {
                "name": "reorder",
                "keywords": [
                    "arrange",
                    "permutation",
                    "permute",
                    "order"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "reorder(list,order)"
                ],
                "examples": [
                    {
                        "in": "reorder([0,1,2,3],[3,2,0,1])",
                        "out": "[3,2,0,1]"
                    },
                    {
                        "in": "reorder([\"a\",\"b\",\"c\",\"d\"],[3,2,0,1])",
                        "out": "[\"d\",\"c\",\"a\",\"b\"]"
                    }
                ]
            },
            {
                "name": "shuffle",
                "keywords": [
                    "random",
                    "rearrange"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "shuffle(x)"
                ],
                "examples": []
            },
            {
                "name": "shuffle_together",
                "keywords": [
                    "random",
                    "rearrange"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "shuffle_together(lists)"
                ],
                "examples": []
            },
            {
                "name": "random_integer_partition",
                "keywords": [
                    "subsets",
                    "random",
                    "number"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "random_integer_partition(n,k)"
                ],
                "examples": []
            }
        ]
    },
    {
        "name": "Control flow",
        "fns": [
            {
                "name": "award",
                "keywords": [
                    "score",
                    "test",
                    "if",
                    "condition"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "award(a,b)"
                ],
                "examples": [
                    {
                        "in": "award(5,true)",
                        "out": "5"
                    }
                ]
            },
            {
                "name": "if",
                "keywords": [
                    "test",
                    "condition"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "if(p,a,b)"
                ],
                "examples": [
                    {
                        "in": "if(false,1,0)",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "switch",
                "keywords": [
                    "cases",
                    "select",
                    "condition",
                    "if",
                    "test"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "switch(p1,a1,p2,a2, ..., pn,an,d)"
                ],
                "examples": [
                    {
                        "in": "switch(true,1,false,0,3)",
                        "out": "1"
                    },
                    {
                        "in": "switch(false,1,true,0,3)",
                        "out": "0"
                    },
                    {
                        "in": "switch(false,1,false,0,3)",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "assert",
                "keywords": [
                    "if",
                    "test",
                    "condition",
                    "only"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "assert(condition, value)"
                ],
                "examples": [
                    {
                        "in": "assert(1 < 2, \"oops\")",
                        "out": "false"
                    },
                    {
                        "in": "assert(1 > 2, \"oops\")",
                        "out": "\"oops\""
                    }
                ]
            },
            {
                "name": "try",
                "keywords": [
                    "catch",
                    "error",
                    "except"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "try(expression, name, except)"
                ],
                "examples": [
                    {
                        "in": "try(eval(expression(\"x+\")),err, \"Error: \"+err)",
                        "out": "\"Error: Not enough arguments for operation <code>+</code>\""
                    },
                    {
                        "in": "try(1+2,err,0)",
                        "out": "3"
                    }
                ]
            },
            {
                "name": "|>",
                "keywords": [
                    "pipe"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "a |> f()"
                ],
                "examples": [
                    {
                        "in": "3 |> sqrt() |> precround(2)",
                        "out": "1.73"
                    }
                ]
            }
        ]
    },
    {
        "name": "HTML",
        "fns": [
            {
                "name": "html",
                "keywords": [
                    "parse"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "html(x)"
                ],
                "examples": []
            },
            {
                "name": "isnonemptyhtml",
                "keywords": [
                    "test",
                    "empty",
                    "text"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "isnonemptyhtml(str)"
                ],
                "examples": [
                    {
                        "in": "isnonemptyhtml(\"<p>Yes</p>\")",
                        "out": "true"
                    },
                    {
                        "in": "isnonemptyhtml(\"<p></p>\")",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "table",
                "keywords": [
                    "grid",
                    "data",
                    "html"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "table(data)",
                    "table(data, headers)",
                    "table(data, column_headers, row_headers)"
                ],
                "examples": []
            },
            {
                "name": "image",
                "keywords": [
                    "picture",
                    "display"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "image(url,[width],[height])"
                ],
                "examples": []
            },
            {
                "name": "max_width",
                "keywords": [
                    "width",
                    "maximum",
                    "size",
                    "html"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "max_width(width,element)"
                ],
                "examples": []
            },
            {
                "name": "max_height",
                "keywords": [
                    "height",
                    "maximum",
                    "size",
                    "html"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "max_height(width,element)"
                ],
                "examples": []
            },
            {
                "name": "escape_html",
                "keywords": [
                    "escape",
                    "safe"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "escape_html(text)"
                ],
                "examples": [
                    {
                        "in": "escape_html(\"<p>Text</p>\")",
                        "out": "\"&lt;p&gt;Text&lt;/p&gt;\""
                    }
                ]
            }
        ]
    },
    {
        "name": "JSON",
        "fns": [
            {
                "name": "json_decode",
                "keywords": [
                    "decode",
                    "parse"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "json_decode(json)"
                ],
                "examples": [
                    {
                        "in": "json_decode(safe(' {\"a\": 1, \"b\": [2,true,\"thing\"]} '))",
                        "out": "[\"a\": 1, \"b\": [2,true,\"thing\"]]"
                    }
                ]
            },
            {
                "name": "json_encode",
                "keywords": [
                    "convert",
                    "stringify"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "json_encode(data)"
                ],
                "examples": [
                    {
                        "in": "json_encode([1,\"a\",true])",
                        "out": "\"[1,\\\"a\\\",true]\""
                    }
                ]
            }
        ]
    },
    {
        "name": "Sub-expressions",
        "fns": [
            {
                "name": "expression",
                "keywords": [
                    "parse",
                    "jme",
                    "compile"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "expression(string)",
                    "parse(string)"
                ],
                "examples": []
            },
            {
                "name": "eval",
                "keywords": [
                    "evaluate",
                    "jme"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "eval(expression, values)"
                ],
                "examples": [
                    {
                        "in": "eval(expression(\"1+2\"))",
                        "out": "3"
                    },
                    {
                        "in": "eval(expression(\"x+1\"), [\"x\":1])",
                        "out": "2"
                    }
                ]
            },
            {
                "name": "args",
                "keywords": [
                    "arguments",
                    "operands"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "args(expression)"
                ],
                "examples": [
                    {
                        "in": "args(expression(\"f(x)\"))",
                        "out": "[expression(\"x\")]"
                    },
                    {
                        "in": "args(expression(\"1+2+3\"))",
                        "out": "[expression(\"1+2\"), expression(\"3\")]"
                    },
                    {
                        "in": "args(expression(\"1\"))",
                        "out": "[]"
                    }
                ]
            },
            {
                "name": "type",
                "keywords": [
                    "kind"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "type(expression)"
                ],
                "examples": [
                    {
                        "in": "type(expression(\"x\"))",
                        "out": "\"name\""
                    },
                    {
                        "in": "type(expression(\"1\"))",
                        "out": "\"integer\""
                    },
                    {
                        "in": "type(expression(\"x+1\"))",
                        "out": "\"op\""
                    },
                    {
                        "in": "type(expression(\"sin(x)\"))",
                        "out": "\"function\""
                    }
                ]
            },
            {
                "name": "name",
                "keywords": [
                    "token"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "name(string)"
                ],
                "examples": [
                    {
                        "in": "name(\"x\")",
                        "out": "x"
                    }
                ]
            },
            {
                "name": "op",
                "keywords": [
                    "operator",
                    "operation",
                    "token"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "op(name)"
                ],
                "examples": []
            },
            {
                "name": "function",
                "keywords": [
                    "token"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "function(name)"
                ],
                "examples": []
            },
            {
                "name": "exec",
                "keywords": [
                    "execute",
                    "apply",
                    "call"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "exec(op, arguments)"
                ],
                "examples": [
                    {
                        "in": "exec(op(\"+\"), [2,1])",
                        "out": "expression(\"2+1\")"
                    },
                    {
                        "in": "exec(op(\"-\"), [2,name(\"x\")])",
                        "out": "expression(\"2-x\")"
                    }
                ]
            },
            {
                "name": "findvars",
                "keywords": [
                    "variables",
                    "unbound",
                    "free"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "findvars(expression)"
                ],
                "examples": [
                    {
                        "in": "findvars(expression(\"x+1\"))",
                        "out": "[\"x\"]"
                    },
                    {
                        "in": "findvars(expression(\"x + x*y\"))",
                        "out": "[\"x\",\"y\"]"
                    },
                    {
                        "in": "findvars(expression(\"map(x+2, x, [1,2,3])\"))",
                        "out": "[]"
                    }
                ]
            },
            {
                "name": "substitute",
                "keywords": [
                    "replace",
                    "variables",
                    "rewrite"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "substitute(variables,expression)"
                ],
                "examples": [
                    {
                        "in": "substitute([\"x\": 1], expression(\"x + y\"))",
                        "out": "expression(\"1 + y\")"
                    },
                    {
                        "in": "substitute([\"x\": 1, \"y\": expression(\"sqrt(z+2)\")], expression(\"x + y\"))",
                        "out": "expression(\"1 + sqrt(z + 2)\")"
                    }
                ]
            },
            {
                "name": "simplify",
                "keywords": [
                    "rearrange",
                    "rewrite",
                    "transform"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "simplify(expression,rules)"
                ],
                "examples": [
                    {
                        "in": "simplify(expression(\"1*x+cos(pi)\"),\"unitfactor\")",
                        "out": "expression(\"x+cos(pi)\")"
                    },
                    {
                        "in": "simplify(expression(\"1*x+cos(pi)\"),[\"basic\",\"unitfactor\",\"trig\"])",
                        "out": "expression(\"x-1\")"
                    }
                ]
            },
            {
                "name": "expand_juxtapositions",
                "keywords": [
                    "implicit",
                    "multiplication",
                    "grammar"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "expand_juxtapositions(expression, options)"
                ],
                "examples": [
                    {
                        "in": "expand_juxtapositions(expression(\"xy\"))",
                        "out": "expression(\"x*y\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"x'y\"))",
                        "out": "expression(\"x\\'*y\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"pizza\"))",
                        "out": "expression(\"pi*z*z*a\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"hat:abc\"))",
                        "out": "expression(\"hat:a*b*c\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"xcos(x)\"))",
                        "out": "expression(\"x*cos(x)\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"lnabs(x)\"))",
                        "out": "expression(\"ln(abs(x))\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"ln*abs(x)\"))",
                        "out": "expression(\"ln(abs(x))\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"xy\"),[\"singleLetterVariables\": false])",
                        "out": "expression(\"xy\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"x(x+1)\"))",
                        "out": "expression(\"x*(x+1)\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"x(x+1)\"),[\"noUnknownFunctions\": false])",
                        "out": "expression(\"x(x+1)\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"ln*abs(x)\"),[\"implicitFunctionComposition\": false, \"singleLetterVariables\": true, \"noUnknownFunctions\": true])",
                        "out": "expression(\"l*n*abs(x)\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"xy^z\"))",
                        "out": "expression(\"x*y^z\")"
                    },
                    {
                        "in": "expand_juxtapositions(expression(\"xy!\"))",
                        "out": "expression(\"x*y!\")"
                    }
                ]
            },
            {
                "name": "canonical_compare",
                "keywords": [
                    "compare",
                    "comparison",
                    "order",
                    "sort"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "canonical_compare(expr1,expr2)"
                ],
                "examples": [
                    {
                        "in": "canonical_compare(a,b)",
                        "out": "-1"
                    },
                    {
                        "in": "canonical_compare(f(y),g(x))",
                        "out": "1"
                    },
                    {
                        "in": "canonical_compare(f(x),g(x))",
                        "out": "-1"
                    },
                    {
                        "in": "canonical_compare(\"a\",\"b\")",
                        "out": "0"
                    }
                ]
            },
            {
                "name": "numerical_compare",
                "keywords": [
                    "compare",
                    "numerical",
                    "evaluate",
                    "same"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "numerical_compare(a,b)"
                ],
                "examples": [
                    {
                        "in": "numerical_compare(expression(\"x^2\"), expression(\"x*x\"))",
                        "out": "true"
                    },
                    {
                        "in": "numerical_compare(expression(\"x^2\"), expression(\"2x\"))",
                        "out": "false"
                    },
                    {
                        "in": "numerical_compare(expression(\"x^2\"), expression(\"y^2\"))",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "scope_case_sensitive",
                "keywords": [
                    "case",
                    "sensitive",
                    "upper",
                    "lower"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "scope_case_sensitive(expression, [case_sensitive])"
                ],
                "examples": [
                    {
                        "in": "scope_case_sensitive(findvars(expression(\"x+X\")))",
                        "out": "[\"X\",\"x\"]"
                    },
                    {
                        "in": "scope_case_sensitive(let(x,1,X,2,x+X), true)",
                        "out": "3"
                    }
                ]
            }
        ]
    },
    {
        "name": "Calculus",
        "fns": [
            {
                "name": "diff",
                "keywords": [
                    "differentiate",
                    "calculus",
                    "derivative"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "diff(expression,variable)"
                ],
                "examples": [
                    {
                        "in": "diff(expression(\"x^2 + 2x + 4\"), \"x\")",
                        "out": "expression(\"2x + 2\")"
                    },
                    {
                        "in": "diff(expression(\"x * y + 3x + 2y\"), \"x\")",
                        "out": "expression(\"y + 3\")"
                    },
                    {
                        "in": "diff(expression(\"cos(x^2)\"), \"x\")",
                        "out": "expression(\"-2 * sin(x^2) * x\")"
                    }
                ]
            }
        ]
    },
    {
        "name": "Pattern-matching sub-expressions",
        "fns": [
            {
                "name": "match",
                "keywords": [
                    "test",
                    "pattern",
                    "expression"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "match(expr, pattern, options)"
                ],
                "examples": [
                    {
                        "in": "match(expression(\"x+1\"),\"?;a + ?;b\")",
                        "out": "[\"match\": true, \"groups\": [\"a\": expression(\"x\"), \"b\": expression(\"1\"), \"_match\": expression(\"x+1\")]]"
                    },
                    {
                        "in": "match(expression(\"sin(x)\"), \"?;a + ?;b\")",
                        "out": "[\"match\": false, \"groups\": dict()]"
                    },
                    {
                        "in": "match(expression(\"x+1\"),\"1+?;a\")",
                        "out": "[\"match\": true, \"groups\": [\"a\": expression(\"x\"), \"_match\": expression(\"x+1\")]]"
                    }
                ]
            },
            {
                "name": "matches",
                "keywords": [
                    "test",
                    "pattern",
                    "expression"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "matches(expr, pattern, options)"
                ],
                "examples": [
                    {
                        "in": "matches(expression(\"x+1\"),\"?;a + ?;b\")",
                        "out": "true"
                    },
                    {
                        "in": "matches(expression(\"sin(x)\"), \"?;a + ?;b\")",
                        "out": "false"
                    }
                ]
            },
            {
                "name": "replace",
                "keywords": [
                    "substitute",
                    "pattern",
                    "expression"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "replace(pattern, replacement, expr)"
                ],
                "examples": [
                    {
                        "in": "replace(\"?;x + ?;y\", \"x*y\", expression(\"1+2\"))",
                        "out": "expression(\"1*2\")"
                    },
                    {
                        "in": "replace(\"?;x + ?;y\", \"f(x,y)\", expression(\"1+2+3\"))",
                        "out": "expression(\"f(f(1,2),3)\")"
                    },
                    {
                        "in": "replace(\"0*?\", \"0\", expression(\"0*sin(x) + x*0 + 2*cos(0*pi)\"))",
                        "out": "expression(\"0 + 0 + 2*cos(0)\")"
                    }
                ]
            }
        ]
    },
    {
        "name": "Identifying data types",
        "fns": [
            {
                "name": "type",
                "keywords": [
                    "kind"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "type(x)"
                ],
                "examples": [
                    {
                        "in": "type(1)",
                        "out": "\"integer\""
                    }
                ]
            },
            {
                "name": "isa",
                "keywords": [
                    "is",
                    "test",
                    "same",
                    "type"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x isa type"
                ],
                "examples": [
                    {
                        "in": "1 isa \"number\"",
                        "out": "true"
                    },
                    {
                        "in": "x isa \"name\"",
                        "out": "true"
                    }
                ]
            },
            {
                "name": "as",
                "keywords": [
                    "convert",
                    "cast",
                    "type"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "x as type"
                ],
                "examples": [
                    {
                        "in": "dec(1.23) as \"number\"",
                        "out": "1.23"
                    },
                    {
                        "in": "set(1,2,3) as \"list\"",
                        "out": "[1,2,3]"
                    }
                ]
            },
            {
                "name": "infer_variable_types",
                "keywords": [
                    "variable",
                    "type"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "infer_variable_types(expression)"
                ],
                "examples": [
                    {
                        "in": "infer_variable_types(expression(\"x^2\"))",
                        "out": "[\"x\": \"number\"]"
                    },
                    {
                        "in": "infer_variable_types(expression(\"union(a,b)\"))",
                        "out": "[\"a\": \"set\", \"b\": \"set\"]"
                    },
                    {
                        "in": "infer_variable_types(expression(\"k*det(a)\"))",
                        "out": "[ \"k\": \"number\", \"a\": \"matrix\" ]"
                    }
                ]
            },
            {
                "name": "infer_type",
                "keywords": [
                    "result",
                    "type"
                ],
                "noexamples": false,
                "calling_patterns": [
                    "infer_type(expression)"
                ],
                "examples": [
                    {
                        "in": "infer_type(expression(\"x+2\"))",
                        "out": "\"number\""
                    },
                    {
                        "in": "infer_type(expression(\"id(n)\"))",
                        "out": "\"matrix\""
                    },
                    {
                        "in": "infer_type(expression(\"random(2,true)\"))",
                        "out": "\"?\""
                    }
                ]
            }
        ]
    },
    {
        "name": "Inspecting the evaluation scope",
        "fns": [
            {
                "name": "definedvariables",
                "keywords": [
                    "variables",
                    "list",
                    "scope"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "definedvariables()"
                ],
                "examples": []
            },
            {
                "name": "isset",
                "keywords": [
                    "variable",
                    "set",
                    "test"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "isset(name)"
                ],
                "examples": []
            },
            {
                "name": "unset",
                "keywords": [
                    "delete",
                    "remove",
                    "variables"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "unset(names, expression)"
                ],
                "examples": []
            }
        ]
    },
    {
        "name": "Debugging tools",
        "fns": [
            {
                "name": "debug_log",
                "keywords": [
                    "debug",
                    "log"
                ],
                "noexamples": true,
                "calling_patterns": [
                    "debug_log(x, label)"
                ],
                "examples": []
            }
        ]
    }
]
