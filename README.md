<img src="http://numbas.org.uk/numbas-logo.svg" width="100%" alt="Numbas logo">

**Numbas** is an open-source system for creating tests which run entirely in the browser. It has been developed by [Newcastle University's School of Mathematics, Statistics and Physics](http://www.ncl.ac.uk/maths-physics).

For more information about Numbas and what it does, see our website at [numbas.org.uk](http://www.numbas.org.uk).

### How to use Numbas

Documentation for Numbas users is at [docs.numbas.org.uk](https://docs.numbas.org.uk/en/latest/). 

### Installation

This repository contains the Numbas compiler, which runs as standalone Python 3, but the most convenient way to use Numbas is through the web-based editor. 

A publicly-available editor, requiring no set-up, is available at [numbas.mathcentre.ac.uk](http://numbas.mathcentre.ac.uk). Or, you can follow [our instructions for Windows, Mac, or Ubuntu to install your own instance](http://numbas.github.io/editor).

If you decide to run your own installation, install the compiler's dependencies with `pip install -r requirements.txt`.

This repository is just one part of the Numbas ecosystem. See [the numbas organisation](http://github.com/numbas) for the other pieces, including the web-based editor, extensions, and VLE integrations.

### Contributing to Numbas

Numbas is open source, and we welcome contributions of any sort. Bug reports or feature suggestions can be added to [the GitHub issue tracker](https://github.com/numbas/Numbas/issues), or emailed to numbas@ncl.ac.uk. 

See [our page on contributing to Numbas](http://www.numbas.org.uk/contributing-to-numbas/) for more information on how you can help.

We keep a list of tasks specifically for new contributors, under the [good-first-issue label](https://github.com/numbas/Numbas/labels/good%20first%20issue). There's [a corresponding list in the editor repository](https://github.com/numbas/editor/labels/good%20first%20issue), too. These tasks should be fairly straightforward to implement without much knowledge of how all the code fits together.

### Development

This tool runs on the command line: run `python bin/numbas.py` to see the options. You can give it the name of a `.exam` file or pipe one in.

When making changes to the JavaScript runtime, it's a good idea to run the unit tests in the `tests` directory. These can run in a browser, or on the command-line.

<hr/>

#### Running tests in a browser

Start a local web server with `python -m http.server` and go to http://localhost:8000/tests. The tests under `tests/jme` contain tests to do with the JME system, and `tests/parts` contains tests to do with the part marking algorithms. 

#### Running tests on the command-line

You can run the tests from the command-line using node.js:

Install the dependencies:
  
```bash
cd tests
npm install
```

Then run the tests with:

```bash
npm test
```

<hr/>

If you make a change, please try to add unit tests to confirm that Numbas behaves as expected.

The Makefile in this repository collects together scripts to run the unit tests, and builds the API documentation. Linux and Mac OS have built-in support Makefiles, but Windows doesn't. On Windows, [cygwin](https://www.cygwin.com/) provides `make`.

API documentation for developers is at [numbas.github.io/Numbas](https://numbas.github.io/Numbas).
This is generated using [JSDoc](https://jsdoc.app/), with [a custom template](http://github.com/numbas/numbas-jsdoc-template).
Run `make docs` to rebuild the API documentation into `../numbas-docs`.

### Copyright

> Copyright 2011-18 Newcastle University
> 
> Licensed under the Apache License, Version 2.0 (the "License");
> you may not use this file except in compliance with the License.
> You may obtain a copy of the License at
> 
> http://www.apache.org/licenses/LICENSE-2.0
> 
> Unless required by applicable law or agreed to in writing, software
> distributed under the License is distributed on an "AS IS" BASIS,
> WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
> See the License for the specific language governing permissions and
> limitations under the License.

You can see a plain-English explanation of the license and what it allows at [tl;drLegal](https://tldrlegal.com/license/apache-license-2.0-%28apache-2.0%29)
   
Copyright in the content produced using Numbas resides with the author.
